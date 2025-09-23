import { Account, Contract, RpcProvider } from "starknet";
import { Logger } from "winston";
import { formatRawFossilRequest, formatTimeLeft } from "./utils";
import { sendFossilRequest } from "./utils";
import { JobRequest, JobStatus } from "../../types/types";
import { rpcToStarknetBlock } from "../../utils/rpcClient";
import { ABI as erc20ABI } from "../../abi/erc20";
import { DB } from "../../shared/db";


const mineBlockHelper = async (provider: RpcProvider, account: Account, vaultContract: Contract, logger: Logger) => {
  // Only mine blocks on devnet
  if (process.env.IS_DEVNET !== "true") {
    return;
  }
  
  try {
    logger.debug("Mining block on devnet to update timestamp...");
    const ethAddress = await vaultContract.get_eth_address();
    const ethAddressHex = "0x" + BigInt(ethAddress).toString(16);
    const ethContract = new Contract(erc20ABI, ethAddressHex, account);
    const data = await ethContract.transfer(account.address, 123n);
    logger.debug(`Devnet block mining transaction: ${data.transaction_hash}`);
    await provider.waitForTransaction(data.transaction_hash);
    logger.debug("Block mined successfully on devnet");
  } catch (error) {
    logger.error("Failed to mine block on devnet:", error);
    // Don't throw - this is just for devnet testing
  }
}


export class StateHandlers {
  private db: DB;
  private logger: Logger;
  private provider: RpcProvider;
  private account: Account;

  constructor(db: DB, logger: Logger, provider: RpcProvider, account: Account) {
    this.db = db;
    this.logger = logger;
    this.provider = provider;
    this.account = account;
  }

  async handleOpenState(
    roundContract: Contract,
    vaultContract: Contract,
    jobRequest: JobRequest | undefined,
  ) {
    try {
      // Mine block on devnet first to ensure accurate timestamps
      await mineBlockHelper(this.provider, this.account, vaultContract, this.logger);
      
      // Check if this is the first round that needs initialization
      const reservePrice = await roundContract.get_reserve_price();
      this.logger.debug(`Reserve price: ${reservePrice}`);
      
      if (reservePrice === 0n) {
        this.logger.info("First round detected - needs initialization");
        
        // Check if we already have a pending or completed job for this vault
        if (jobRequest?.status === JobStatus.Pending) {
          this.logger.info(
            `Job request for vault ${vaultContract.address} is pending`,
          );
          return;
        }
        
        if (jobRequest?.status === JobStatus.Completed) {
          this.logger.info(
            `Job request for vault ${vaultContract.address} is completed, proceeding with auction start`,
          );
          // Clean up completed job and proceed to auction start
          await this.db.deleteJobRequest(vaultContract.address);
          
          // Double-check that reserve price is now set (safety check)
          const updatedReservePrice = await roundContract.get_reserve_price();
          if (updatedReservePrice === 0n) {
            this.logger.warn(
              `Job completed but reserve price still 0 for vault ${vaultContract.address}. This may be a timing issue.`
            );
            // Continue anyway - the next poll will handle it
          }
        } else {
          // No job or failed job - send new request
          if (jobRequest?.status === JobStatus.Failed) {
            this.logger.info(
              `Previous job request for vault ${vaultContract.address} failed, retrying`,
            );
            // Clean up failed job before sending new one
            await this.db.deleteJobRequest(vaultContract.address);
          }
          
          // Check if we're past the proving delay for initialization
          const deploymentTime = Number(await roundContract.get_deployment_date());
          const provingDelay = Number(await vaultContract.get_proving_delay());
          const latestBlock = await this.provider.getBlock("latest");
          if (!latestBlock) {
            this.logger.error("No latest block found");
            return;
          }
          const latestStarknetBlock = rpcToStarknetBlock(latestBlock);
          
          const earliestInitTime = deploymentTime + provingDelay;
          if (latestStarknetBlock.timestamp < earliestInitTime) {
            this.logger.info(
              `Waiting for proving delay to pass. Earliest init time: ${earliestInitTime}, current: ${latestStarknetBlock.timestamp}, time left: ${formatTimeLeft(
                latestStarknetBlock.timestamp,
                earliestInitTime,
              )}`,
            );
            return;
          }
          
          this.logger.info(
            `Sending new job request for vault ${vaultContract.address}`,
          );
          
          const requestData = await vaultContract.get_request_to_start_first_round();
          const response = await sendFossilRequest(
            formatRawFossilRequest(requestData),
            vaultContract,
            this.logger,
          );
          
          await this.db.upsertJobRequest(
            vaultContract.address,
            response.job_id,
            response.status as JobStatus,
          );
          return; // Exit here to let the cron handle the state transition in the next iteration
        }
      }

      // Auction start logic with proper time validation
      const auctionStartTime = Number(await roundContract.get_auction_start_date());
      this.logger.debug(`Auction start time: ${auctionStartTime}`);
      
      const latestBlock = await this.provider.getBlock("latest");
      if (!latestBlock) {
        this.logger.error("No latest block found");
        return;
      }
      
      const latestStarknetBlock = rpcToStarknetBlock(latestBlock);
      this.logger.debug(`Current timestamp: ${latestStarknetBlock.timestamp}`);
      
      // Check if it's time to start the auction
      if (latestStarknetBlock.timestamp < auctionStartTime) {
        this.logger.info(
          `Waiting for auction start time. Time left: ${formatTimeLeft(
            latestStarknetBlock.timestamp,
            auctionStartTime,
          )}`,
        );
        return;
      }

      this.logger.info("Starting auction...");

      // Estimate gas fee with error handling
      let estimatedMaxFee;
      try {
        const feeEstimate = await this.account.estimateInvokeFee({
          contractAddress: vaultContract.address,
          entrypoint: "start_auction",
          calldata: [],
        });
        estimatedMaxFee = feeEstimate.suggestedMaxFee;
        this.logger.debug(`Estimated max fee: ${estimatedMaxFee}`);
      } catch (error) {
        this.logger.error("Failed to estimate gas fee for start_auction:", error);
        return;
      }

      // Execute transaction with proper error handling
      try {
        const { transaction_hash } = await vaultContract.start_auction();
        this.logger.info(`Auction start transaction submitted: ${transaction_hash}`);
        
        // Wait for transaction confirmation with timeout
        const receipt = await this.provider.waitForTransaction(transaction_hash, {
          retryInterval: 2000,
          successStates: ["ACCEPTED_ON_L2", "ACCEPTED_ON_L1"]
        });
        
        this.logger.info("Auction started successfully", {
          transactionHash: transaction_hash,
          receipt: JSON.stringify(receipt)
        });
        
      } catch (error) {
        this.logger.error("Failed to start auction:", error);
        // Don't throw - let the service continue with other vaults
        return;
      }
      
    } catch (error) {
      this.logger.error("Error handling Open state:", error);
      // Don't throw - let the service continue with other vaults
    }
  }

  async handleAuctioningState(
    roundContract: Contract,
    vaultContract: Contract,
  ) {
    const auctionEndTimeRaw = await roundContract.get_auction_end_date();
    const auctionEndTime = Number(auctionEndTimeRaw);

    const latestBlock = await this.provider.getBlock("latest");
    if (!latestBlock) {
      console.error("No latest block found");
      return;
    }
    const latestStarknetBlock = rpcToStarknetBlock(latestBlock);
    if (latestStarknetBlock.timestamp < auctionEndTime) {
      this.logger.info(
        `Waiting for auction end time. Time left: ${formatTimeLeft(
          latestStarknetBlock.timestamp,
          auctionEndTime,
        )}`,
      );
      return;
    }

    this.logger.info("Ending auction...");

    const { suggestedMaxFee: estimatedMaxFee } =
      await this.account.estimateInvokeFee({
        contractAddress: vaultContract.address,
        entrypoint: "end_auction",
        calldata: [],
      });

    const { transaction_hash } = await vaultContract.end_auction();
    await this.provider.waitForTransaction(transaction_hash);

    this.logger.info("Auction ended successfully", {
      transactionHash: transaction_hash,
    });
  }

  async handleRunningState(
    roundContract: Contract,
    vaultContract: Contract,
    jobRequest: JobRequest | undefined,
  ): Promise<void> {
    try {
      const settlementTime = Number(
        await roundContract.get_option_settlement_date(),
      );

      const latestBlock = await this.provider.getBlock("latest");
      if (!latestBlock) {
        console.error("No latest block found");
        return;
      }
      const latestStarknetBlock = rpcToStarknetBlock(latestBlock);
      if (latestStarknetBlock.timestamp < settlementTime) {
        this.logger.info(
          `Waiting for settlement time. Time left: ${formatTimeLeft(
            latestStarknetBlock.timestamp,
            settlementTime,
          )}`,
        );
        return;
      }

      this.logger.info("Settlement time reached");

      if (jobRequest?.status === JobStatus.Pending) {
        this.logger.info(
          `Job request for vault ${vaultContract.address} is pending`,
        );
        return;
      }
      const rawRequestData = await vaultContract.get_request_to_settle_round();
      const requestData = formatRawFossilRequest(rawRequestData);

      await sendFossilRequest(requestData, vaultContract, this.logger);
    } catch (error) {
      this.logger.error("Error handling Running state:", error);
      throw error;
    }
  }
}
