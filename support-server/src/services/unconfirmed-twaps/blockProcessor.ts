import { Block } from "viem";
import { DB } from "../../shared/db";
import { UnconfirmedTWAPService } from "./twapService";
import { UnconfirmedIndexerConfig } from "./config";

export interface ProcessedBlock {
  number: number;
  timestamp: number;
  basefee: number;
}

export class UnconfirmedBlockProcessor {
  private db: DB;
  private twapService: UnconfirmedTWAPService;
  private config: UnconfirmedIndexerConfig;

  constructor(db: DB, twapService: UnconfirmedTWAPService, config: UnconfirmedIndexerConfig) {
    this.db = db;
    this.twapService = twapService;
    this.config = config;
  }

  async processBlock(block: Block): Promise<boolean> {
    try {
      if (!block.baseFeePerGas) {
        console.log(`Block ${block.number} has no base fee, skipping`);
        return false;
      }

      const basefee = Number(block.baseFeePerGas.toString());
      const processedBlock: ProcessedBlock = {
        number: Number(block.number),
        timestamp: Number(block.timestamp),
        basefee: basefee,
      };

      // Calculate TWAPs
      const twapResults = await this.twapService.calculateAllTWAPs(
        processedBlock,
        this.config.twapRanges
      );

      const result = await this.db.updateBlockAndTWAPStates(
        Number(block.number),
        Number(block.timestamp),
        basefee,
        twapResults
      );

      console.log("Result", result);
      if (result.shouldRecalibrate) return true; // Signal that we need to recalibrate

      console.log(`Processed block ${block.number}`);
      return false;
    } catch (error) {
      console.error(`Error processing block ${block.number}:`, error);
      throw error;
    }
  }

  async processBlocks(blocks: Block[]): Promise<boolean> {
    for (const block of blocks) {
      console.log("Block", block.number);
      while (true) {
        try {
          const needsRecalibration = await this.processBlock(block);
          console.log("Needs recalibration", needsRecalibration);
          if (needsRecalibration) {
            await this.recalibrate();
            return true; // Start over from getInitialState
          }
          break; // Success, move to next block
        } catch (error) {
          console.error(
            `Error processing block ${block.number}, retrying:`,
            error
          );
          await this.sleep(1000); // Wait a second before retrying
        }
      }
      console.log("BlockDone", block.number);
    }
    return false;
  }

  async recalibrate(): Promise<void> {
    const currentBlock = await this.db.getLastProcessedBlock(0);
    const latestFossilBlock = await this.db.getLatestFossilBlock();
    const latestBlock = latestFossilBlock ?? Number(currentBlock);
    
    await Promise.all([
      this.db.initializeTWAPState("twelve_min", latestBlock),
      this.db.initializeTWAPState("three_hour", latestBlock),
      this.db.initializeTWAPState("thirty_day", latestBlock),
    ]);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
} 