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
    const ethAddress = await vaultContract.get_eth_address();
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
      const reservePrice = await roundContract.get_reserve_price();

      if (reservePrice === 0n) {
        this.logger.info("First round detected - needs initialization");
        const requestData =
          await vaultContract.get_request_to_start_first_round();

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
        this.logger.info(
          "Reserve price is not 0, proceeding with auction start logic",
        );
      }

      // Existing auction start logic
      const latestBlockStarknet = await this.provider.getBlock("latest");
      if (!latestBlockStarknet) {
        console.error("No latest block found");
        return;
      }
      const latestBlockStarknetFormatted =
        rpcToStarknetBlock(latestBlockStarknet);

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
    const auctionEndTimeRaw = await roundContract.get_auction_end_date();
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
  }

  async handleRunningState(
    roundContract: Contract,
    vaultContract: Contract,
  ): Promise<void> {
    const settlementTimeRaw = await roundContract.get_option_settlement_date();
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
  }
}
