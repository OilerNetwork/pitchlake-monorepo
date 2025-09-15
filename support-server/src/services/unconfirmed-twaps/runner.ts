import { Block, WatchBlocksReturnType } from "viem";
import { DB } from "../../shared/db";
import { UnconfirmedIndexerConfig, loadUnconfirmedIndexerConfig } from "./config";
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
    this.blockProcessor = new UnconfirmedBlockProcessor(this.db, this.twapService, this.config);
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
      await this.db.getLastProcessedBlock(currentBlock)
    );

    console.log(
      `Last processed block: ${lastProcessedBlock}, Current chain head: ${currentBlock}`
    );

    // Catch up on missing blocks
    if (lastProcessedBlock < Number(currentBlock)) {
      console.log(
        `Catching up from block ${lastProcessedBlock + 1} to ${currentBlock}`
      );

      let blockNumber = Number(lastProcessedBlock);
      while (blockNumber <= currentBlock) {
        try {
          const length = Math.min(currentBlock - blockNumber + 1, 1000);
          const blocks = await this.rpcClient.getBlocks(blockNumber, length);
          const shouldRecalibrate = await this.blockProcessor.processBlocks(blocks);

          currentBlock = Number(await this.rpcClient.getBlockNumber());
          blockNumber += length;
          console.log("currentBlock, blockNumber", currentBlock, blockNumber);

          if (shouldRecalibrate) {
            return true; // Signal recalibration needed
          }
        } catch (error) {
          console.error(`Error fetching blocks at ${blockNumber}:`, error);
          await this.sleep(1000); // Wait before retrying the batch
          continue;
        }
      }
    }
    return false;
  }

  startListening() {
    const unwatch = this.rpcClient.getClient().watchBlocks({
      onBlock: async (block: Block) => {
        try {
          const shouldRecalibrate = await this.blockProcessor.processBlock(block);
          if (shouldRecalibrate) {
            unwatch();
            await this.initialize();
            this.startListening();
          }
        } catch (error) {
          console.error("Error handling new block:", error);
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