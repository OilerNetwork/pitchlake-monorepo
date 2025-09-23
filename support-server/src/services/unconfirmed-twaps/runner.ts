import { Block, WatchBlocksReturnType } from "viem";
import { DB } from "../../shared/db";
import {
  UnconfirmedIndexerConfig,
  loadUnconfirmedIndexerConfig,
} from "./config";
import { UnconfirmedTWAPService } from "./twapService";
import { UnconfirmedBlockProcessor } from "./blockProcessor";
import { RPCClient } from "../../utils/rpcClient";

export class UnconfirmedTWAPsRunner {
  private db: DB;
  private config: UnconfirmedIndexerConfig;
  private rpcClient: RPCClient;
  private twapService: UnconfirmedTWAPService;
  private blockProcessor: UnconfirmedBlockProcessor;
  private unwatch: WatchBlocksReturnType | undefined;

  constructor() {
    this.db = new DB();
    this.config = loadUnconfirmedIndexerConfig();
    this.rpcClient = new RPCClient(this.config);
    this.twapService = new UnconfirmedTWAPService(this.db);
    this.blockProcessor = new UnconfirmedBlockProcessor(
      this.db,
      this.twapService,
      this.config,
    );
  }

  async initialize(): Promise<void> {
    let shouldRecalibrate = true;
    while (shouldRecalibrate) {
      shouldRecalibrate = await this.initializeOnce();
    }
  }

  private async initializeOnce(): Promise<boolean> {
    let currentBlock = Number(await this.rpcClient.getBlockNumber());

    const lastProcessedBlock = Number(
      await this.db.getLastProcessedBlock(currentBlock),
    );

    console.log(
      `Last processed block: ${lastProcessedBlock}, Current chain head: ${currentBlock}`,
    );

    // Catch up on missing blocks
    if (lastProcessedBlock < Number(currentBlock)) {
      console.log(
        `Catching up from block ${lastProcessedBlock + 1} to ${currentBlock}`,
      );

      let blockNumber = Number(lastProcessedBlock);
      while (blockNumber <= currentBlock) {
        try {
          const length = Math.min(currentBlock - blockNumber + 1, 500);
          const blocks = await this.rpcClient.getBlocks(blockNumber, length);
          const shouldRecalibrate =
            await this.blockProcessor.processBlocks(blocks);

          currentBlock = Number(await this.rpcClient.getBlockNumber());
          blockNumber += length;
          console.log("currentBlock, blockNumber", currentBlock, blockNumber);

          if (shouldRecalibrate) {
            return true; // Signal recalibration needed
          }

          // Add delay between batches for rate limiting
          if (blockNumber <= currentBlock) {
            await this.sleep(500);
          }
        } catch (error) {
          console.error(`Error fetching blocks at ${blockNumber}:`, error);

          // If it's a rate limit error, wait longer
          if (
            error &&
            typeof error === "object" &&
            "status" in error &&
            error.status === 429
          ) {
            console.warn("Rate limited, waiting 5 seconds before retrying...");
            await this.sleep(5000);
          } else {
            await this.sleep(1000); // Wait before retrying the batch
          }
          continue;
        }
      }
    }
    return false;
  }

  startListening() {
    let isProcessing = false; // Prevent concurrent block processing

    const unwatch = this.rpcClient.getClient().watchBlocks({
      onBlock: async (block: Block) => {
        if (isProcessing) {
          console.log("Skipping block - already processing another block");
          return;
        }

        isProcessing = true;
        try {
          const shouldRecalibrate =
            await this.blockProcessor.processBlock(block);
          if (shouldRecalibrate) {
            unwatch();
            await this.initialize();
            this.startListening();
          }
        } catch (error) {
          console.error("Error handling new block:", error);

          // If it's a rate limit error, wait before processing next block
          if (
            error &&
            typeof error === "object" &&
            "status" in error &&
            error.status === 429
          ) {
            console.warn(
              "Rate limited in real-time processing, waiting 2 seconds...",
            );
            await this.sleep(2000);
          }
        } finally {
          isProcessing = false;
        }
      },
    });
    this.unwatch = unwatch;
  }

  async shutdown() {
    if (this.unwatch) {
      this.unwatch();
      this.db.shutdown();
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
