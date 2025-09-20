import { Account, Contract, RpcProvider } from "starknet";
import { FormattedBlockData } from "../confirmed-twaps/types";
import { Logger } from "winston";
import { formatRawFossilRequest, formatTimeLeft } from "./utils";
import { sendFossilRequest } from "./utils";
import { StarknetBlock } from "../../types/types";
import { rpcToStarknetBlock } from "../../utils/rpcClient";
import { ABI as erc20ABI } from "../../abi/erc20";
export class StateHandlers {
  private logger: Logger;
  private provider: RpcProvider;
  private account: Account;
  private latestFossilBlock: FormattedBlockData;
  private latestStarknetBlock: StarknetBlock;

  constructor(
    logger: Logger,
    provider: RpcProvider,
    account: Account,
    latesFossilBlock: FormattedBlockData,
    latestStarknetBlock: StarknetBlock,
  ) {
    this.logger = logger;
    this.provider = provider;
    this.account = account;
    this.latestFossilBlock = latesFossilBlock;
    this.latestStarknetBlock = latestStarknetBlock;
  }

  async handleOpenState(roundContract: Contract, vaultContract: Contract) {
    // Send dummy txn to make katana mine a block
    let ethAddress;
    try {
      ethAddress = await vaultContract.get_eth_address();
      
      this.logger.debug("Raw ETH address response:", { 
        ethAddress, 
        type: typeof ethAddress 
      });
      
      if (ethAddress === undefined || ethAddress === null) {
        this.logger.warn("ETH address is not set, skipping dummy transaction");
        return;
      }
    } catch (error) {
      this.logger.error("Failed to get ETH address:", error);
      return;
    }
    
    const ethAddressHex = "0x" + BigInt(ethAddress).toString(16);
    const ethContract = new Contract(
      erc20ABI,
      ethAddressHex,
      this.provider,
    ).typedv2(erc20ABI);
    ethContract.connect(this.account);
    const { transaction_hash } = await ethContract.transfer(
      this.account.address,
      123n,
    );
    await this.provider.waitForTransaction(transaction_hash);

    try {
      // Check if this is the first round that needs initialization
      let reservePrice;
      try {
        reservePrice = await roundContract.get_reserve_price();
        
        this.logger.debug("Raw reserve price response:", { 
          reservePrice, 
          type: typeof reservePrice 
        });
        
        // Check if reserve price is valid
        if (reservePrice === undefined || reservePrice === null) {
          this.logger.warn("Reserve price is not set, skipping reserve price logic");
          return;
        }
      } catch (error) {
        this.logger.error("Failed to get reserve price:", error);
        return;
      }

      if (reservePrice === 0n) {
        this.logger.info("First round detected - needs initialization");
        let requestData;
        try {
          requestData = await vaultContract.get_request_to_start_first_round();
          
          this.logger.debug("Raw request data response:", { 
            requestData, 
            type: typeof requestData 
          });
          
          if (requestData === undefined || requestData === null || typeof requestData !== 'object') {
            this.logger.warn("Request data is invalid, skipping first round initialization");
            this.logger.warn("This might indicate the vault contract is not ready for first round initialization");
            return;
          }
          
          // Check if the request data has the required structure
          if (!requestData.params || !requestData.program_id || !requestData.vault_address) {
            this.logger.warn("Request data is missing required fields, skipping first round initialization");
            this.logger.warn("Required fields: params, program_id, vault_address");
            return;
          }
        } catch (error) {
          this.logger.error("Failed to get request data for first round:", error);
          this.logger.warn("This might indicate the vault contract is not properly initialized or the method is failing");
          this.logger.warn("Skipping first round initialization for now - the round will remain in Open state");
          return;
        }

        // Format request data for timestamp check
        // The request data is now an object, so we need to extract the timestamp from params
        // Based on the ABI, the timestamp should be in params.twap[1]
        const requestTimestamp = Number(requestData.params.twap[1]);
        
        this.logger.debug("Request timestamp extracted:", {
          requestTimestamp,
          twapParams: requestData.params.twap,
          fullParams: requestData.params
        });

        //// Check if Fossil has required blocks before proceeding
        //if (this.latestFossilBlock.timestamp < requestTimestamp) {
        //  this.logger.info(
        //    `Fossil blocks haven't reached the request timestamp yet`
        //  );
        //  //return;
        //}

        // Initialize first round
        await sendFossilRequest(
          formatRawFossilRequest(requestData),
          vaultContract,
          this.logger,
        );

        // The fossil request takes some time to process, so we'll exit here
        // and let the cron handle the state transition in the next iteration
        return;
      } else {
        this.logger.info("Reserve price is not 0, proceeding with auction start logic");
      }

      // Existing auction start logic
      //
      let auctionStartTimeRaw;
      try {
        auctionStartTimeRaw = await roundContract.get_auction_start_date();
        
        this.logger.debug("Raw auction start time response:", { 
          auctionStartTimeRaw, 
          type: typeof auctionStartTimeRaw 
        });
        
        // Check if auction start time is valid
        if (auctionStartTimeRaw === undefined || auctionStartTimeRaw === null) {
          this.logger.warn("Auction start date is not set yet, skipping auction start logic");
          return;
        }
      } catch (error) {
        this.logger.error("Failed to get auction start date:", error);
        return;
      }
      
      const auctionStartTime = Number(auctionStartTimeRaw);

      console.log("DEBUGGING: auctionStartTime", auctionStartTime);
      console.log(
        "DEBUGGING: latest starknet block timestamp" +
          this.latestStarknetBlock.timestamp,
      );
      console.log("DEBUGGING: now unix" + new Date().getTime() / 1000);

      const latestBlockStarknet = await this.provider.getBlock("latest");
      if (!latestBlockStarknet) {
        console.error("No latest block found");
        return;
      }
      const latestBlockStarknetFormatted =
        rpcToStarknetBlock(latestBlockStarknet);

      console.log(
        "DEBUGGING: updated latestBlockStarknet",
        latestBlockStarknetFormatted.timestamp,
      );

      let w, x, y, z;
      try {
        const roundIdRaw = await roundContract.get_round_id();
        const transitionDurationRaw = await vaultContract.get_round_transition_duration();
        const auctionDurationRaw = await vaultContract.get_auction_duration();
        const roundDurationRaw = await vaultContract.get_round_duration();
        
        this.logger.debug("Raw duration responses:", {
          roundId: roundIdRaw,
          transitionDuration: transitionDurationRaw,
          auctionDuration: auctionDurationRaw,
          roundDuration: roundDurationRaw
        });
        
        // Check if any values are undefined
        if (roundIdRaw === undefined || transitionDurationRaw === undefined || 
            auctionDurationRaw === undefined || roundDurationRaw === undefined) {
          this.logger.warn("One or more duration values are undefined, skipping duration logic");
          return;
        }
        
        w = Number(roundIdRaw);
        x = Number(transitionDurationRaw);
        y = Number(auctionDurationRaw);
        z = Number(roundDurationRaw);
      } catch (error) {
        this.logger.error("Failed to get duration values:", error);
        return;
      }

      console.log("DEBUGGING: round id", w);
      console.log("DEBUGGING: durations", { x, y, z });
      console.log("DEGGUGGING: durations in hours", {
        x: (x / 3600).toFixed(2),
        y: (y / 3600).toFixed(2),
        z: (z / 3600).toFixed(2),
      });

      // get the vault.get_round_tr

      //if (this.latestFossilBlock.timestamp < auctionStartTime) {
      //  this.logger.info(
      //    `Waiting for auction start time. Time left: ${formatTimeLeft(
      //      this.latestFossilBlock.timestamp,
      //      auctionStartTime,
      //    )}`,
      //  );
      //  return;
      //}

      this.logger.info("Starting auction...");

      const { suggestedMaxFee: estimatedMaxFee } =
        await this.account.estimateInvokeFee([
          {
            contractAddress: vaultContract.address,
            entrypoint: "start_auction",
            calldata: [],
          },
        ]);

      console.log("ARE WE HERE");
      const { transaction_hash } = await vaultContract.start_auction();
      await this.provider.waitForTransaction(transaction_hash);

      this.logger.info("Auction started successfully", {
        transactionHash: transaction_hash,
      });
    } catch (error) {
      this.logger.error("Error handling Open state:", error);
      throw error;
    }
  }

  async handleAuctioningState(
    roundContract: Contract,
    vaultContract: Contract,
  ) {
    try {
      let auctionEndTimeRaw;
      try {
        auctionEndTimeRaw = await roundContract.get_auction_end_date();
        
        this.logger.debug("Raw auction end time response:", { 
          auctionEndTimeRaw, 
          type: typeof auctionEndTimeRaw 
        });
        
        // Check if auction end time is valid
        if (auctionEndTimeRaw === undefined || auctionEndTimeRaw === null) {
          this.logger.warn("Auction end date is not set, skipping auction end logic");
          return;
        }
      } catch (error) {
        this.logger.error("Failed to get auction end date:", error);
        return;
      }
      
      const auctionEndTime = Number(auctionEndTimeRaw);

      if (this.latestStarknetBlock.timestamp < auctionEndTime) {
        this.logger.info(
          `Waiting for auction end time. Time left: ${formatTimeLeft(
            this.latestStarknetBlock.timestamp,
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
    } catch (error) {
      this.logger.error("Error handling Auctioning state:", error);
      throw error;
    }
  }

  async handleRunningState(
    roundContract: Contract,
    vaultContract: Contract,
  ): Promise<void> {
    try {
      let settlementTimeRaw;
      try {
        settlementTimeRaw = await roundContract.get_option_settlement_date();
        
        this.logger.debug("Raw settlement time response:", { 
          settlementTimeRaw, 
          type: typeof settlementTimeRaw 
        });
        
        // Check if settlement time is valid
        if (settlementTimeRaw === undefined || settlementTimeRaw === null) {
          this.logger.warn("Settlement date is not set, skipping settlement logic");
          return;
        }
      } catch (error) {
        this.logger.error("Failed to get settlement date:", error);
        return;
      }
      
      const settlementTime = Number(settlementTimeRaw);

      if (this.latestStarknetBlock.timestamp < settlementTime) {
        this.logger.info(
          `Waiting for settlement time. Time left: ${formatTimeLeft(
            this.latestStarknetBlock.timestamp,
            settlementTime,
          )}`,
        );
        return;
      }

      this.logger.info("Settlement time reached");

      //// Check if Fossil has required blocks before proceeding
      //if (this.latestFossilBlock.timestamp < Number(requestData.timestamp)) {
      //  this.logger.info(
      //    `Fossil blocks haven't reached the request timestamp yet`
      //  );
      //  return;
      //}

      const rawRequestData = await vaultContract.get_request_to_settle_round();

      await sendFossilRequest(
        formatRawFossilRequest(rawRequestData),
        vaultContract,
        this.logger,
      );
    } catch (error) {
      this.logger.error("Error handling Running state:", error);
      throw error;
    }
  }
}
