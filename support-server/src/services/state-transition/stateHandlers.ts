import { Account, Contract, RpcProvider } from "starknet";
import { FormattedBlockData } from "../confirmed-twaps/types";
import { Logger } from "winston";
import { formatRawToFossilRequest, formatTimeLeft } from "./utils";
import { sendFossilRequest } from "./utils";
import { StarknetBlock } from "../../types/types";

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
    try {
      // Check if this is the first round that needs initialization
      const reservePrice = await roundContract.get_reserve_price();

      if (reservePrice === 0n) {
        //logger.info("First round detected - needs initialization");
        const requestData =
          await vaultContract.get_request_to_start_first_round();

        // Format request data for timestamp check
        const requestTimestamp = Number(requestData[1]);

        // Check if Fossil has required blocks before proceeding
        if (this.latestFossilBlock.timestamp < requestTimestamp) {
          this.logger.info(
            `Fossil blocks haven't reached the request timestamp yet`
          );
          return;
        }

        // Initialize first round
        await sendFossilRequest(
          formatRawToFossilRequest(requestData),
          vaultContract.address,
          vaultContract,
          this.logger
        );

        // The fossil request takes some time to process, so we'll exit here
        // and let the cron handle the state transition in the next iteration
        return;
      }

      // Existing auction start logic
      const auctionStartTime = Number(
        await roundContract.get_auction_start_date()
      );

      if (this.latestFossilBlock.timestamp < auctionStartTime) {
        this.logger.info(
          `Waiting for auction start time. Time left: ${formatTimeLeft(
            this.latestFossilBlock.timestamp,
            auctionStartTime
          )}`
        );
        return;
      }

      this.logger.info("Starting auction...");

      const { suggestedMaxFee: estimatedMaxFee } =
        await vaultContract.estimateInvokeFee({
          contractAddress: vaultContract.address,
          entrypoint: "start_auction",
          calldata: [],
        });

      const { transaction_hash } = await vaultContract.start_auction({
        maxFee: estimatedMaxFee * 2n,
      });
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
        await vaultContract.estimateInvokeFee({
          contractAddress: vaultContract.address,
          entrypoint: "end_auction",
          calldata: [],
        });

      const { transaction_hash } = await vaultContract.end_auction({
        maxFee: estimatedMaxFee * 2n,
      });
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

      // Check if Fossil has required blocks before proceeding
      if (this.latestFossilBlock.timestamp < Number(requestData.timestamp)) {
        this.logger.info(
          `Fossil blocks haven't reached the request timestamp yet`
        );
        return;
      }

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
