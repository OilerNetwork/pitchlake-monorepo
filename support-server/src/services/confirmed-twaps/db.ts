import {
  BlockWithNextTimestamp,
  FormattedBlockData,
  TWAPState,
  TWAPWindowType,
} from "./types";
import { Client } from "pg";
import { TWAP_RANGES } from "./config";
import { demoBlocks } from "../../shared/demoData";

export class DatabaseService {
  private fossilClient?: Client;
  private pitchlakeClient?: Client;

  constructor() {
    this.fossilClient = new Client({
      connectionString: process.env.FOSSIL_DB_CONNECTION_STRING,
    });
    this.pitchlakeClient = new Client({
      connectionString: process.env.PITCHLAKE_DB_CONNECTION_STRING,
    });
  }

  async connect() {
    await this.fossilClient?.connect();
    await this.pitchlakeClient?.connect();
  }
  async getTWAPState(windowType: TWAPWindowType): Promise<TWAPState | null> {
    if (process.env.USE_DEMO_DATA === "true") {
      return null;
    }

    const query = `
          SELECT weighted_sum, total_seconds, twap_value, last_block_number, last_block_timestamp
          FROM twap_state
          WHERE window_type = $1
          AND is_confirmed = true
          FOR UPDATE
        `;

    try {
      const result = await this.pitchlakeClient?.query(query, [windowType]);
      if (!result || result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        weightedSum: Number(row.weighted_sum),
        totalSeconds: Number(row.total_seconds),
        twapValue: Number(row.twap_value),
        lastBlockNumber: Number(row.last_block_number),
        lastBlockTimestamp: Number(row.last_block_timestamp),
      };
    } catch (error) {
      console.error(`Error fetching TWAP state for ${windowType}:`, error);
      throw error;
    }
  }

  async fetchFossilBlocks(
    currentLastBlock: number,
    BATCH_SIZE: number
  ): Promise<BlockWithNextTimestamp[]> {
    const query = `
  SELECT number, timestamp, base_fee_per_gas
  FROM blockheaders 
  WHERE number > $1
  ORDER BY number ASC
  LIMIT $2
`;

const result = await this.fossilClient?.query(query, [currentLastBlock, BATCH_SIZE]);
    return result?.rows || [];
  }
 


  async fetchRelevantBlocks(
    oldestTimestamp: number,
    newestTimestamp: number
  ): Promise<BlockWithNextTimestamp[]> {
    if (process.env.USE_DEMO_DATA === "true") {
      // For demo mode, construct block history from demo data
      // Include enough history for all window sizes
      const minTimestamp = Math.min(
        oldestTimestamp - TWAP_RANGES.THIRTY_DAYS,
        newestTimestamp - TWAP_RANGES.THIRTY_DAYS
      );

      const relevantBlocks = demoBlocks
        .filter(
          (block) =>
            block.timestamp >= minTimestamp &&
            block.timestamp <= newestTimestamp
        )
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((block, index, array) => ({
          number: block.blockNumber,
          timestamp: block.timestamp,
          next_timestamp:
            index < array.length - 1 ? array[index + 1].timestamp : null,
          basefee: block.basefee || 0,
        }));

      if (relevantBlocks.length === 0) {
        console.warn(
          "No relevant blocks found in demo data for the specified time range"
        );
      }

      return relevantBlocks;
    }

    const query = `
      WITH time_windows AS (
        SELECT 
          timestamp::numeric,
          LEAD(timestamp::numeric) OVER (ORDER BY timestamp ASC) as next_timestamp,
          basefee::numeric
        FROM blocks
        WHERE timestamp >= ($1::numeric - $4::numeric)  -- 30 days before oldest block
          AND timestamp <= $2::numeric       -- newest block
      )
      SELECT 
        timestamp,
        next_timestamp,
        basefee
      FROM time_windows
      WHERE timestamp <= $2::numeric
        AND (
          timestamp >= ($2::numeric - $3::numeric) OR  -- 12 min window
          timestamp >= ($2::numeric - $4::numeric) OR  -- 3 hour window
          timestamp >= ($2::numeric - $5::numeric)     -- 30 day window
        )
      ORDER BY timestamp DESC
    `;

    const result = await this.pitchlakeClient?.query(query, [
      oldestTimestamp,
      newestTimestamp,
      TWAP_RANGES.TWELVE_MIN,
      TWAP_RANGES.THREE_HOURS,
      TWAP_RANGES.THIRTY_DAYS,
    ]);

    if (!result && process.env.USE_DEMO_DATA !== "true") {
      throw new Error("Failed to fetch relevant blocks");
    }

    return result?.rows || [];
  }
  async saveTWAPState(
    windowType: TWAPWindowType,
    state: TWAPState
  ): Promise<void> {
    if (process.env.USE_DEMO_DATA === "true") {
      return;
    }

    const query = `
            INSERT INTO twap_state (
            window_type, weighted_sum, total_seconds, twap_value, 
            last_block_number, last_block_timestamp, is_confirmed
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, true)
            ON CONFLICT ON CONSTRAINT twap_state_window_type_is_confirmed_key
            DO UPDATE SET 
            weighted_sum = EXCLUDED.weighted_sum,
            total_seconds = EXCLUDED.total_seconds,
            twap_value = EXCLUDED.twap_value,
            last_block_number = EXCLUDED.last_block_number,
            last_block_timestamp = EXCLUDED.last_block_timestamp
        `;

    try {
      const result = await this.pitchlakeClient?.query(query, [
        windowType,
        state.weightedSum,
        state.totalSeconds,
        state.twapValue,
        state.lastBlockNumber,
        state.lastBlockTimestamp,
      ]);
      if (!result && process.env.USE_DEMO_DATA !== "true") {
        throw new Error("Failed to save TWAP state");
      }
    } catch (error) {
      console.error(`Error saving TWAP state for ${windowType}:`, error);
      throw error;
    }
  }

  async updateBlockTWAPs(
    block_number: number,
    twelve_min_twap: number,
    three_hour_twap: number,
    thirty_day_twap: number
  ): Promise<void> {
    const query = `
      UPDATE blocks 
      SET twelve_min_twap = $2,
          three_hour_twap = $3,
          thirty_day_twap = $4,
          is_confirmed = true
      WHERE block_number = $1
    `;

    try {
      await this.pitchlakeClient?.query(query, [
        block_number,
        twelve_min_twap,
        three_hour_twap,
        thirty_day_twap,
      ]);
    } catch (error) {
      console.error(`Error updating TWAPs for block ${block_number}:`, error);
      throw error;
    }
  }
  async storeNewBlocks(blocks: FormattedBlockData[]): Promise<void> {
    if (!blocks.length) return;

    const blockNumbers = blocks.map((b) => b.blockNumber!);
    const timestamps = blocks.map((b) => b.timestamp);
    const basefees = blocks.map((b) => b.basefee!);

    console.log("Creating and executing prepared statement...");

    // Create and execute the prepared statement in one go
    const query = `
      WITH new_blocks AS (
        SELECT unnest($1::int[]) as block_number,
               unnest($2::int[]) as timestamp,
               unnest($3::numeric[]) as basefee
      )
      INSERT INTO blocks (block_number, timestamp, basefee, is_confirmed)
      SELECT block_number, timestamp, basefee, true
      FROM new_blocks
      ON CONFLICT (block_number) 
      DO UPDATE SET 
        basefee = EXCLUDED.basefee,
        is_confirmed = true
    `;

    try {
      const result = await this.pitchlakeClient?.query(query, [
        blockNumbers,
        timestamps,
        basefees,
      ]);
    } catch (error) {
      console.error("Error storing blocks:", error);
      throw error;
    }
  }


  //Notify

  async notify(blocks: FormattedBlockData[], startTimestamp: number, endTimestamp: number): Promise<void> {
    await this.pitchlakeClient?.query(`
        SELECT pg_notify(
          'confirmed_insert',
          $1::text
        )
      `, [JSON.stringify({
        start_timestamp: startTimestamp,
        end_timestamp: endTimestamp
      })]);
    }

  //Transaction Methods
  async beginTransaction() {
    await this.pitchlakeClient?.query("BEGIN");
  }

  async commitTransaction() {
    await this.pitchlakeClient?.query("COMMIT");
  }

  async rollbackTransaction() {
    await this.pitchlakeClient?.query("ROLLBACK");
  }
  async shutdown() {
    await this.fossilClient?.end();
    await this.pitchlakeClient?.end();
  }

  async checkForNextBlock(blockNumber: number): Promise<boolean> {
    if (process.env.USE_DEMO_DATA === 'true') {
      const nextBlock = demoBlocks.find(block => block.blockNumber > blockNumber);
      return !!nextBlock;
    }

    const query = `
      SELECT 1
      FROM blockheaders 
      WHERE number > $1
      AND base_fee_per_gas IS NOT NULL
      LIMIT 1
    `;

    const result = await this.fossilClient?.query(query, [blockNumber]);
    return !!(result?.rows.length);
  }
}
