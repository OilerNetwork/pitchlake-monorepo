import { Client,Pool } from "pg";
import { demoBlocks } from "../../shared/demoData";
import {
  FormattedBlockData,
  TWAPWindowType,
  TWAPState,
  BlockWithNextTimestamp,
  TWAPStateContainer,
} from "./types";
import { TWAP_RANGES } from "./config";
import { DatabaseService } from "./db";

// Time ranges in seconds


export class GasDataService {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = new DatabaseService();
  }

  private async connect() {
    await this.databaseService.connect();
  }

  private readonly WINDOW_CONFIGS = [
    {
      type: "twelve_min" as TWAPWindowType,
      duration: TWAP_RANGES.TWELVE_MIN,
      stateKey: "twelveminTwap" as const,
    },
    {
      type: "three_hour" as TWAPWindowType,
      duration: TWAP_RANGES.THREE_HOURS,
      stateKey: "threeHourTwap" as const,
    },
    {
      type: "thirty_day" as TWAPWindowType,
      duration: TWAP_RANGES.THIRTY_DAYS,
      stateKey: "thirtyDayTwap" as const,
    },
  ];


  

  // TWAP calculation
  private calculateTWAP(
    state: TWAPState,
    windowSize: number,
    windowStart: number,
    currentBlock: FormattedBlockData,
    relevantBlocks: BlockWithNextTimestamp[]
  ): TWAPState {
    let newState = { ...state };

    // Sort blocks by timestamp ascending to ensure correct order
    const sortedBlocks = [...relevantBlocks]
      .sort((a, b) => a.timestamp - b.timestamp);

    // Get all blocks that fall within our window
    const blocksInWindow = sortedBlocks.filter(
      (block) =>
        block.timestamp <= currentBlock.timestamp &&
        block.timestamp > windowStart &&
        block.next_timestamp // only include blocks with known duration
    );

    // If there's no history, use 0
    if (blocksInWindow.length === 0) {
      newState.weightedSum = 0;
      newState.totalSeconds = windowSize;
      newState.twapValue = 0;
      newState.lastBlockNumber = currentBlock.blockNumber || 0;
      newState.lastBlockTimestamp = currentBlock.timestamp;
      return newState;
    }

    // Reset the weighted sum for this window
    newState.weightedSum = 0;
    
    // Calculate the actual window coverage
    // Window can't start before the first block or end after the current block
    const effectiveWindowStart = Math.max(windowStart, blocksInWindow[0].timestamp);
    const effectiveWindowEnd = currentBlock.timestamp;
    newState.totalSeconds = effectiveWindowEnd - effectiveWindowStart;

    // Calculate contribution of each block in the window
    for (let i = 0; i < blocksInWindow.length; i++) {
      const block = blocksInWindow[i];
      const nextBlock = i < blocksInWindow.length - 1 ? blocksInWindow[i + 1] : currentBlock;
      
      const blockStart = Math.max(block.timestamp, effectiveWindowStart);
      const blockEnd = Math.min(nextBlock.timestamp, effectiveWindowEnd);
      const duration = blockEnd - blockStart;
      
      if (duration > 0 && block.basefee) {
        newState.weightedSum += block.basefee * duration;
      }
    }

    // Calculate TWAP
    newState.twapValue = newState.totalSeconds > 0 
      ? newState.weightedSum / newState.totalSeconds 
      : 0;

    newState.lastBlockNumber = currentBlock.blockNumber || 0;
    newState.lastBlockTimestamp = currentBlock.timestamp;

    return newState;
  }

  private initializeTWAPState(
    states: (TWAPState | null)[]
  ): TWAPStateContainer {
      return {
      twelveminTwap: states[0] || {
        weightedSum: 0,
        totalSeconds: 0,
        twapValue: 0,
        lastBlockNumber: 0,
        lastBlockTimestamp: 0,
      },
      threeHourTwap: states[1] || {
        weightedSum: 0,
        totalSeconds: 0,
        twapValue: 0,
        lastBlockNumber: 0,
        lastBlockTimestamp: 0,
      },
      thirtyDayTwap: states[2] || {
        weightedSum: 0,
        totalSeconds: 0,
        twapValue: 0,
        lastBlockNumber: 0,
        lastBlockTimestamp: 0,
      },
    };
  }


  private async getTWAPs(blockData: FormattedBlockData[]): Promise<void> {
    if (!blockData?.length) return;

    try {
      // Sort blocks by timestamp and remove any blocks with undefined basefee
      const sortedBlocks = [...blockData]
        .filter(block => block.blockNumber != null && block.basefee != null)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (sortedBlocks.length === 0) {
        console.log("No valid blocks to process after filtering");
        return;
      }

      const oldestTimestamp = sortedBlocks[0].timestamp;
      const newestTimestamp = sortedBlocks[sortedBlocks.length - 1].timestamp;
      const startTimestamp = sortedBlocks[0].timestamp;
      const endTimestamp = sortedBlocks[sortedBlocks.length - 1].timestamp;

      // Check if the last block in batch has a next block
      const isLastBlockInBatch = sortedBlocks[sortedBlocks.length - 1].blockNumber;
      const hasNextBlock = await this.databaseService.checkForNextBlock(isLastBlockInBatch);
      const shouldSkipLastBlock = !hasNextBlock;

      // Get the blocks to process (exclude last block if it's the latest)
      const blocksToProcess = shouldSkipLastBlock ? 
        sortedBlocks.slice(0, -1) : 
        sortedBlocks;

      if (blocksToProcess.length === 0) {
        console.log("No blocks to process after filtering out latest block");
        return;
      }

      // Initialize state once at the start
      const states = await Promise.all(
        this.WINDOW_CONFIGS.map((config) => this.databaseService.getTWAPState(config.type))
      );
      let currentState = this.initializeTWAPState(states);

      if (process.env.USE_DEMO_DATA !== 'true') {
        await this.databaseService.beginTransaction();
      }

      try {
        // Store all new blocks in a single operation
        await this.databaseService.storeNewBlocks(blocksToProcess);

        // Fetch all relevant blocks once for the entire batch
        const relevantBlocks = await this.databaseService.fetchRelevantBlocks(
          oldestTimestamp,
          newestTimestamp
        );

        if (relevantBlocks.length === 0) {
          console.log(`No relevant blocks found for batch`);
          if (process.env.USE_DEMO_DATA !== 'true') {
            await this.databaseService.rollbackTransaction();
          }
          return;
        }

        // Calculate TWAPs for all blocks
        const blockTWAPs: { 
          blockNumber: number, 
          twelveminTwap: number,
          threeHourTwap: number,
          thirtyDayTwap: number 
        }[] = [];

        // Process each block's TWAPs
        for (const currentBlock of blocksToProcess) {
          // Update TWAPs for each time window
          this.WINDOW_CONFIGS.forEach((config) => {
            currentState[config.stateKey] = this.calculateTWAP(
              currentState[config.stateKey],
              config.duration,
              currentBlock.timestamp - config.duration,
              currentBlock,
              relevantBlocks
            );
          });

          blockTWAPs.push({
            blockNumber: currentBlock.blockNumber!,
            twelveminTwap: currentState.twelveminTwap.twapValue,
            threeHourTwap: currentState.threeHourTwap.twapValue,
            thirtyDayTwap: currentState.thirtyDayTwap.twapValue
          });
        }
        if (process.env.USE_DEMO_DATA === 'true') {
          // Handle demo mode
          blockTWAPs.forEach(twap => {
            console.log(`Demo Mode - Processed block ${twap.blockNumber}`);
          });
        } else {
          // Batch update all block TWAPs
          const updatePromises = blockTWAPs.map(twap =>
            this.databaseService.updateBlockTWAPs(
              twap.blockNumber,
              twap.twelveminTwap,
              twap.threeHourTwap,
              twap.thirtyDayTwap
            )
          );
          await Promise.all(updatePromises);

          // Save the final state for each window type at the end of the batch
          await Promise.all(
            this.WINDOW_CONFIGS.map((config) =>
              this.databaseService.saveTWAPState(config.type, currentState[config.stateKey])
            )
          );

          // Commit the transaction for the entire batch
          await this.databaseService.commitTransaction();
          
          // Send NOTIFY for the batch
          await this.databaseService.notify(blocksToProcess, startTimestamp, endTimestamp);
          

          console.log(`Successfully processed batch of ${blocksToProcess.length} blocks (${startTimestamp} to ${endTimestamp})`);
        }
      } catch (error) {
        console.error(`Error processing batch:`, error);
        if (process.env.USE_DEMO_DATA !== 'true') {
          await this.databaseService.rollbackTransaction();
        }
        throw error;
      }

      if (process.env.USE_DEMO_DATA === 'true') {
        // Log final states to console for demo mode
        console.log('Demo Mode - Final TWAP States:');
        this.WINDOW_CONFIGS.forEach(config => {
          console.log(`${config.type}:`, currentState[config.stateKey]);
        });
      }
    } catch (error) {
      console.error("Error in getTWAPs:", error);
      throw error;
    }
  }

  public async updateTWAPs(): Promise<FormattedBlockData | undefined> {
    console.log("Starting TWAP updates");
    if (process.env.USE_DEMO_DATA !== 'true') {
      try {
        await this.connect();
      } catch (error) {
        console.error("Error connecting to fossil or pitchlake:", error);
        await this.cleanup();
        throw error;
      }
    }

    try {
      if (process.env.USE_DEMO_DATA === 'true') {
        console.log('Running in demo mode with sample data');
        const newBlocks = demoBlocks;
        await this.getTWAPs(newBlocks);
        return;
      }

      const BATCH_SIZE = 1000;
      let hasMoreBlocks = true;
      let latestBlock;
      // Get last processed block from TWAP state or use initial block from env
      const lastState = await this.databaseService.getTWAPState("twelve_min");
      let currentLastBlock: number;
      
      if (lastState?.lastBlockNumber) {
        currentLastBlock = lastState.lastBlockNumber;
        console.log("Resuming from last processed block:", currentLastBlock);
      } else {
        const initialBlock = process.env.INITIAL_BLOCK_NUMBER ? parseInt(process.env.INITIAL_BLOCK_NUMBER) : 0;
        currentLastBlock = initialBlock;
        console.log("No TWAP state found. Starting from initial block:", initialBlock);
      }

      while (hasMoreBlocks) {
        // Fetch next batch of blocks
        const query = `
          SELECT number, timestamp, base_fee_per_gas
          FROM blockheaders 
          WHERE number > $1
          ORDER BY number ASC
          LIMIT $2
        `;

        const result = await this.databaseService.fetchFossilBlocks(currentLastBlock, BATCH_SIZE);
        
        if (!result || result.length === 0) {
          console.log("No more blocks to process");
          hasMoreBlocks = false;
          break;
        }

        const blocks = result.map((row) => ({
          blockNumber: row.number,
          timestamp: Number(row.timestamp),
          basefee: row.basefee ? Number(row.basefee) : undefined,
        }));

        console.log(`Processing batch of ${blocks.length} blocks starting from ${blocks[0].blockNumber}`);

        // Process this batch of blocks
        await this.getTWAPs(blocks);

        // Update the last processed block for the next iteration
        currentLastBlock = blocks[blocks.length - 1].blockNumber;
        console.log(`Completed processing batch. Last block: ${currentLastBlock}`);

        // If we got fewer blocks than the batch size, we've reached the end
        if (blocks.length < BATCH_SIZE) {
          console.log("Reached end of blocks");
          latestBlock = blocks[blocks.length - 1];
          hasMoreBlocks = false;
        }
      }

      console.log("Completed all TWAP updates");
      return latestBlock;
    } catch (error) {
      console.error("Error updating TWAPs:", error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }
  public async cleanup(): Promise<void> {
    if (process.env.USE_DEMO_DATA !== 'true') {
      await this.databaseService.shutdown();
    }
  }

}
