import { DB } from "../../shared/db";

export interface TWAPResult {
  twap: number;
  weightedSum: number;
  totalSeconds: number;
}

export interface BlockData {
  number: number;
  timestamp: number;
  basefee: number;
}

export class UnconfirmedTWAPService {
  private db: DB;

  constructor(db: DB) {
    this.db = db;
  }

  async calculateTWAP(
    timeWindow: number,
    currentBlock: BlockData
  ): Promise<TWAPResult> {
    const blocks = await this.db.getRelevantBlocks(
      currentBlock.timestamp,
      timeWindow
    );

    // If no historical blocks, use current block's
    if (blocks.length === 0) {
      return {
        twap: currentBlock.basefee,
        weightedSum: currentBlock.basefee,
        totalSeconds: 12,
      };
    }

    let weightedSum = 0;
    let totalSeconds = 0;

    // Calculate weighted sum
    for (const block of blocks) {
      const duration = Number(block.next_timestamp) - Number(block.timestamp);
      weightedSum += Number(block.basefee) * duration;
      totalSeconds += duration;
    }

    // Calculate TWAP
    const twap =
      totalSeconds > 0 ? weightedSum / totalSeconds : currentBlock.basefee;

    return {
      twap,
      weightedSum,
      totalSeconds,
    };
  }

  async calculateAllTWAPs(
    currentBlock: BlockData,
    twapRanges: { TWELVE_MIN: number; THREE_HOURS: number; THIRTY_DAYS: number }
  ): Promise<{ 
    twelveMin: TWAPResult; 
    threeHour: TWAPResult; 
    thirtyDay: TWAPResult; 
  }> {
    const [twelveMin, threeHour, thirtyDay] = await Promise.all([
      this.calculateTWAP(twapRanges.TWELVE_MIN, currentBlock),
      this.calculateTWAP(twapRanges.THREE_HOURS, currentBlock),
      this.calculateTWAP(twapRanges.THIRTY_DAYS, currentBlock),
    ]);

    return {
      twelveMin,
      threeHour,
      thirtyDay,
    };
  }
} 