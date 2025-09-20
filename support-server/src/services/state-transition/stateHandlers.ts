import { Account, Contract, RpcProvider } from "starknet";
import { FormattedBlockData } from "../confirmed-twaps/types";
import { Logger } from "winston";
import { findJobId, formatRawToFossilRequest, formatTimeLeft } from "./utils";
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
    latestStarknetBlock: StarknetBlock
  ) {
    this.logger = logger;
    this.provider = provider;
    this.account = account;
    this.latestFossilBlock = latesFossilBlock;
    this.latestStarknetBlock = latestStarknetBlock;
  }

  async handleOpenState(roundContract: Contract, vaultContract: Contract) {
    const ethAddress = await vaultContract.get_eth_address();
    console.log("DEBUGGING: ethAddress", ethAddress);
    const ethAddressHex = "0x" + BigInt(ethAddress).toString(16);
    const ethContract = new Contract(erc20ABI, ethAddressHex, this.account);
    const data = await ethContract.transfer(
      this.account.address,
      1000000000000000n
    );
    console.log("DEBUGGING: data", data);
    await this.provider.waitForTransaction(data.transaction_hash);
    try {
      // Check if this is the first round that needs initialization
      const reservePrice = await roundContract.get_reserve_price();

      if (reservePrice === 0n) {
        //logger.info("First round detected - needs initialization");
        const requestData =
          await vaultContract.get_request_to_start_first_round();
        const findJobIdResponse = await findJobId(
          formatRawToFossilRequest(requestData),
          vaultContract.address,
          vaultContract,
          this.logger
        );
        if (!findJobIdResponse.job_id) {
          await sendFossilRequest(
            formatRawToFossilRequest(requestData),
            vaultContract.address,
            vaultContract,
            this.logger
          );
          return;
        }

        // The fossil request takes some time to process, so we'll exit here
        // and let the cron handle the state transition in the next iteration
      }

      // Existing auction start logic
      //
      const auctionStartTime = Number(
        await roundContract.get_auction_start_date()
      );

      console.log("DEBUGGING: auctionStartTime", auctionStartTime);
      console.log(
        "DEBUGGING: latest starknet block timestamp" +
          this.latestStarknetBlock.timestamp
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
        latestBlockStarknetFormatted.timestamp
      );

      const w = Number(await roundContract.get_round_id());
      const x = Number(await vaultContract.get_round_transition_duration());
      const y = Number(await vaultContract.get_auction_duration());
      const z = Number(await vaultContract.get_round_duration());

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
    vaultContract: Contract
  ) {
    try {
      const auctionEndTime = Number(await roundContract.get_auction_end_date());

      if (this.latestStarknetBlock.timestamp < auctionEndTime) {
        this.logger.info(
          `Waiting for auction end time. Time left: ${formatTimeLeft(
            this.latestStarknetBlock.timestamp,
            auctionEndTime
          )}`
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
    vaultContract: Contract
  ): Promise<void> {
    try {
      const settlementTime = Number(
        await roundContract.get_option_settlement_date()
      );

      if (this.latestStarknetBlock.timestamp < settlementTime) {
        this.logger.info(
          `Waiting for settlement time. Time left: ${formatTimeLeft(
            this.latestStarknetBlock.timestamp,
            settlementTime
          )}`
        );
        return;
      }

      this.logger.info("Settlement time reached");

      const rawRequestData = await vaultContract.get_request_to_settle_round();
      const requestData = formatRawToFossilRequest(rawRequestData);

      //// Check if Fossil has required blocks before proceeding
      //if (this.latestFossilBlock.timestamp < Number(requestData.timestamp)) {
      //  this.logger.info(
      //    `Fossil blocks haven't reached the request timestamp yet`
      //  );
      //  return;
      //}

      await sendFossilRequest(
        requestData,
        vaultContract.address,
        vaultContract,
        this.logger
      );
    } catch (error) {
      this.logger.error("Error handling Running state:", error);
      throw error;
    }
  }
}
