import { PoolClient, Pool } from "pg";

export class DB {
  private fossilPool: Pool;
  private pitchlakePool: Pool;

  constructor() {
    // Check if we're in demo mode
    if (process.env.USE_DEMO_DATA === 'true') {
      // In demo mode, create mock pools or use fallback connection strings
      const fallbackFossilUrl = process.env.FOSSIL_DB_URL || 'postgresql://demo:demo@localhost:5432/fossil_demo';
      const fallbackPitchlakeUrl = process.env.PITCHLAKE_DB_URL || 'postgresql://demo:demo@localhost:5433/pitchlake_demo';
      
      this.fossilPool = new Pool({
        connectionString: fallbackFossilUrl,
        ssl: this.getSSLConfig(fallbackFossilUrl),
      });
      this.pitchlakePool = new Pool({
        connectionString: fallbackPitchlakeUrl,
        ssl: this.getSSLConfig(fallbackPitchlakeUrl),
      });
    } else {
      // Production mode - require the database URLs
      if (!process.env.FOSSIL_DB_URL) {
        throw new Error("FOSSIL_DB_URL is required in production mode");
      }
      if (!process.env.PITCHLAKE_DB_URL) {
        throw new Error("PITCHLAKE_DB_URL is required in production mode");
      }
      
      this.fossilPool = new Pool({
        connectionString: process.env.FOSSIL_DB_URL,
        ssl: this.getSSLConfig(process.env.FOSSIL_DB_URL),
      });
      this.pitchlakePool = new Pool({
        connectionString: process.env.PITCHLAKE_DB_URL,
        ssl: this.getSSLConfig(process.env.PITCHLAKE_DB_URL),
      });
    }
  }

  private getSSLConfig(connectionString: string) {
    // For localhost connections, don't use SSL
    if (connectionString.includes('localhost') || connectionString.includes('127.0.0.1')) {
      return false;
    }
    
    // For production/remote connections, use SSL with rejectUnauthorized: false
    return {
      rejectUnauthorized: false,
    };
  }
  async shutdown() {
    await this.fossilPool.end();
    await this.pitchlakePool.end();
  }

  async getLatestFossilBlock(): Promise<number> {
    const result = await this.fossilPool.query(`
    SELECT number AS block_number
    FROM blockheaders
    ORDER BY number DESC
    LIMIT 1
  `);

    if (result.rows.length === 0) {
      return 0;
    }

    return Number(result.rows[0].block_number);
  }

  async getRelevantBlocks(currentTimestamp: number, timeWindow: number) {
    const query = `
    WITH time_windows AS (
      SELECT 
        block_number,
        timestamp::numeric,
        LEAD(timestamp::numeric) OVER (ORDER BY timestamp ASC) as next_timestamp,
        basefee::numeric
      FROM blocks
      WHERE timestamp >= ($1::numeric - $2::numeric)  
        AND timestamp <= $1::numeric
      ORDER BY timestamp ASC
    )
    SELECT 
      timestamp,
      next_timestamp,
      basefee
    FROM time_windows
    WHERE next_timestamp IS NOT NULL
  `;

    try {
      const result = await this.pitchlakePool.query(query, [
        currentTimestamp,
        timeWindow,
      ]);

      return result.rows;
    } catch (error) {
      console.error("Error getting relevant blocks:", error);
      throw error;
    }
  }
  async initializeTWAPState(
    windowType: string,
    initialBlock: number
  ): Promise<void> {
    await this.pitchlakePool.query(
      `
      INSERT INTO twap_state (
        window_type, 
        weighted_sum,
        total_seconds,
        twap_value,
        last_block_number, 
        last_block_timestamp, 
        is_confirmed    
      ) VALUES ($1::twap_window_type, $2, $3, $4, $5, $6, false)
      ON CONFLICT ON CONSTRAINT twap_state_window_type_is_confirmed_key DO UPDATE SET
        weighted_sum = $2,
        total_seconds = $3,
        twap_value = $4,
        last_block_number = $5,
        last_block_timestamp = $6,
        is_confirmed = false
    `,
      [windowType, 0, 0, 0, initialBlock, 0]
    );
  }

  async getLastProcessedBlock(currentBlock: number): Promise<number> {
    // First check if we have any unconfirmed TWAP state
    const twapStateQuery = `
    SELECT last_block_number 
    FROM twap_state 
    WHERE NOT is_confirmed 
    ORDER BY last_block_number DESC 
    LIMIT 1
  `;

    const twapResult = await this.pitchlakePool.query(twapStateQuery);

    if (twapResult.rows.length > 0) {
      // Resume from the last processed block in TWAP state
      return twapResult.rows[0].last_block_number;
    }

    // If no TWAP state exists, find the highest confirmed block
    const confirmedBlockQuery = `
    SELECT block_number 
    FROM blocks 
    WHERE is_confirmed = true 
    ORDER BY block_number DESC 
    LIMIT 1
  `;

    const blockResult = await this.pitchlakePool.query(confirmedBlockQuery);
    const startBlock =
      blockResult.rows.length > 0
        ? Number(blockResult.rows[0].block_number) + 1
        : currentBlock;

    console.log(`No TWAP state found. Starting from block ${startBlock}`);

    // Initialize TWAP states with the starting block
    await Promise.all([
      this.initializeTWAPState("twelve_min", startBlock),
      this.initializeTWAPState("three_hour", startBlock),
      this.initializeTWAPState("thirty_day", startBlock),
    ]);

    return startBlock;
  }
  async updateBlockAndTWAPStates(
    blockNumber: number,
    timestamp: number,
    basefee: number,
    twaps: {
      twelveMin: { weightedSum: number; totalSeconds: number; twap: number };
      threeHour: { weightedSum: number; totalSeconds: number; twap: number };
      thirtyDay: { weightedSum: number; totalSeconds: number; twap: number };
    }
  ): Promise<{ shouldRecalibrate: boolean }> {
    const client = await this.pitchlakePool.connect();

    try {
      await client.query("BEGIN");
      // Use direct parameterized query instead of prepared statement
      const blockInsertResult = await client.query(
        `
        WITH block_update AS (
          INSERT INTO blocks (
            block_number, timestamp, basefee, is_confirmed,
            twelve_min_twap, three_hour_twap, thirty_day_twap
          ) VALUES ($1, $2, $3, false, $4, $5, $6)
          ON CONFLICT (block_number) 
          DO UPDATE SET 
            basefee = EXCLUDED.basefee,
            timestamp = EXCLUDED.timestamp,
            twelve_min_twap = EXCLUDED.twelve_min_twap,
            three_hour_twap = EXCLUDED.three_hour_twap,
            thirty_day_twap = EXCLUDED.thirty_day_twap
          WHERE NOT blocks.is_confirmed
          RETURNING blocks.is_confirmed
        )
        SELECT * FROM block_update
        `,
        [
          blockNumber,
          timestamp,
          basefee,
          twaps.twelveMin.twap,
          twaps.threeHour.twap,
          twaps.thirtyDay.twap,
        ]
      );

      // If the block was confirmed, trigger recalibration
      if (
        blockInsertResult.rows.length === 0 ||
        blockInsertResult.rows[0].is_confirmed
      ) {
        console.log("HERE")
        client.query("ROLLBACK");
        return {
          shouldRecalibrate: true,
        };
      }

      // Use direct parameterized query for TWAP updates
      await client.query(
        `
        INSERT INTO twap_state (window_type, weighted_sum, total_seconds, twap_value, last_block_number, last_block_timestamp, is_confirmed)
        VALUES 
          ($1::twap_window_type, $2, $3, $4, $5, $6, false),
          ($7::twap_window_type, $8, $9, $10, $5, $6, false),
          ($11::twap_window_type, $12, $13, $14, $5, $6, false)
        ON CONFLICT ON CONSTRAINT twap_state_window_type_is_confirmed_key 
        DO UPDATE SET
          weighted_sum = EXCLUDED.weighted_sum,
          total_seconds = EXCLUDED.total_seconds,
          twap_value = EXCLUDED.twap_value,
          last_block_number = EXCLUDED.last_block_number,
          last_block_timestamp = EXCLUDED.last_block_timestamp
        WHERE twap_state.is_confirmed = false AND twap_state.window_type = EXCLUDED.window_type::twap_window_type
        `,
        [
          "twelve_min",
          twaps.twelveMin.weightedSum,
          twaps.twelveMin.totalSeconds,
          twaps.twelveMin.twap,
          blockNumber,
          timestamp,
          "three_hour",
          twaps.threeHour.weightedSum,
          twaps.threeHour.totalSeconds,
          twaps.threeHour.twap,
          "thirty_day",
          twaps.thirtyDay.weightedSum,
          twaps.thirtyDay.totalSeconds,
          twaps.thirtyDay.twap,
        ]
      );

      await client.query("COMMIT");
      return { shouldRecalibrate: false };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
// Add a function to get the latest block from FOSSIL DB
export async function getLatestFossilBlock(fossilPool: Pool): Promise<number> {
  const result = await fossilPool.query(`
    SELECT number AS block_number
    FROM blockheaders
    ORDER BY number DESC
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    return 0;
  }

  return Number(result.rows[0].block_number);
}

// This function is no longer needed as we're using direct parameterized queries instead of prepared statements
export async function initializeTWAPState(
  client: PoolClient,
  windowType: string,
  initialBlock: number
): Promise<void> {
  await client.query(
    `
    INSERT INTO twap_state (
      window_type, 
      weighted_sum,
      total_seconds,
      twap_value,
      last_block_number, 
      last_block_timestamp, 
      is_confirmed    
    ) VALUES ($1::twap_window_type, $2, $3, $4, $5, $6, false)
    ON CONFLICT ON CONSTRAINT twap_state_window_type_is_confirmed_key DO UPDATE SET
      weighted_sum = EXCLUDED.weighted_sum,
      total_seconds = EXCLUDED.total_seconds,
      twap_value = EXCLUDED.twap_value,
      last_block_number = EXCLUDED.last_block_number,
      last_block_timestamp = EXCLUDED.last_block_timestamp,
      is_confirmed = false
  `,
    [windowType, 0, 0, 0, initialBlock, 0]
  );
}

export async function updateBlockAndTWAPStates(
  client: PoolClient,
  blockNumber: number,
  timestamp: number,
  basefee: number,
  twaps: {
    twelveMin: { weightedSum: number; totalSeconds: number; twap: number };
    threeHour: { weightedSum: number; totalSeconds: number; twap: number };
    thirtyDay: { weightedSum: number; totalSeconds: number; twap: number };
  }
): Promise<{ shouldRecalibrate: boolean }> {
  await client.query("BEGIN");

  try {
    // Use direct parameterized query instead of prepared statement
    const blockInsertResult = await client.query(
      `
      WITH block_update AS (
        INSERT INTO blocks (
          block_number, timestamp, basefee, is_confirmed,
          twelve_min_twap, three_hour_twap, thirty_day_twap
        ) VALUES ($1, $2, $3, false, $4, $5, $6)
        ON CONFLICT (block_number) 
        DO UPDATE SET 
          basefee = EXCLUDED.basefee,
          timestamp = EXCLUDED.timestamp,
          twelve_min_twap = EXCLUDED.twelve_min_twap,
          three_hour_twap = EXCLUDED.three_hour_twap,
          thirty_day_twap = EXCLUDED.thirty_day_twap
        WHERE NOT blocks.is_confirmed
        RETURNING blocks.is_confirmed
      )
      SELECT * FROM block_update
      `,
      [
        blockNumber,
        timestamp,
        basefee,
        twaps.twelveMin.twap,
        twaps.threeHour.twap,
        twaps.thirtyDay.twap,
      ]
    );

    // If the block was confirmed, trigger recalibration
    if (
      blockInsertResult.rows.length === 0 ||
      blockInsertResult.rows[0].is_confirmed
    ) {
      client.query("ROLLBACK");
      return {
        shouldRecalibrate: true,
      };
    }

    // Use direct parameterized query for TWAP updates
    await client.query(
      `
      INSERT INTO twap_state (window_type, weighted_sum, total_seconds, twap_value, last_block_number, last_block_timestamp, is_confirmed)
      VALUES 
        ($1::twap_window_type, $2, $3, $4, $5, $6, false),
        ($7::twap_window_type, $8, $9, $10, $5, $6, false),
        ($11::twap_window_type, $12, $13, $14, $5, $6, false)
      ON CONFLICT ON CONSTRAINT twap_state_window_type_is_confirmed_key 
      DO UPDATE SET
        weighted_sum = EXCLUDED.weighted_sum,
        total_seconds = EXCLUDED.total_seconds,
        twap_value = EXCLUDED.twap_value,
        last_block_number = EXCLUDED.last_block_number,
        last_block_timestamp = EXCLUDED.last_block_timestamp
      WHERE twap_state.is_confirmed = false AND twap_state.window_type = EXCLUDED.window_type::twap_window_type
      `,
      [
        "twelve_min",
        twaps.twelveMin.weightedSum,
        twaps.twelveMin.totalSeconds,
        twaps.twelveMin.twap,
        blockNumber,
        timestamp,
        "three_hour",
        twaps.threeHour.weightedSum,
        twaps.threeHour.totalSeconds,
        twaps.threeHour.twap,
        "thirty_day",
        twaps.thirtyDay.weightedSum,
        twaps.thirtyDay.totalSeconds,
        twaps.thirtyDay.twap,
      ]
    );

    await client.query("COMMIT");
    return { shouldRecalibrate: false };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
