"use server";

import { NextResponse } from "next/server";
import { formatUnits } from "ethers";
import { Pool } from "pg";
import { RawBlockData, FormattedBlockData } from "@/lib/types";

// Helper to fetch data from the database
async function fetchBlockData(
  pool: Pool,
  bucketCount: number,
  fromTs: number,
  toTs: number,
): Promise<RawBlockData[]> {
  const query = `
    WITH selected_blocks AS (
      SELECT DISTINCT ON (bucket) number, base_fee_per_gas, timestamp
      FROM (
        SELECT number, base_fee_per_gas, timestamp,
              NTILE($1) OVER (ORDER BY timestamp ASC) AS bucket
        FROM blockheaders
        WHERE timestamp BETWEEN $2 AND $3
      ) AS sub
      ORDER BY bucket, timestamp DESC
    )
    SELECT number AS block_number, base_fee_per_gas, timestamp
    FROM selected_blocks
    ORDER BY timestamp ASC;
  `;
  const values = [bucketCount, fromTs, toTs];
  const result = await pool.query(query, values);
  return result.rows.map((r: any) => ({
    block_number: r.block_number || undefined,
    base_fee_per_gas: r.base_fee_per_gas || undefined,
    timestamp: Number(r.timestamp),
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timestampFrom = searchParams.get("from_timestamp");
  const timestampTo = searchParams.get("to_timestamp");
  const blocksToFetch = searchParams.get("blocks_to_fetch");

  if (!timestampFrom || !timestampTo || !blocksToFetch) {
    return NextResponse.json(
      {
        error:
          "Missing from_timestamp, to_timestamp, or blocks_to_fetch parameter",
      },
      { status: 400 },
    );
  }

  const bucketCount = parseInt(blocksToFetch, 10);
  const fromTimestamp = parseInt(timestampFrom, 10);
  const toTimestamp = parseInt(timestampTo, 10);

  try {
    const pool = new Pool({
      connectionString: process.env.FOSSIL_DB_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    // Fetch gas data
    const gasData = await fetchBlockData(
      pool,
      bucketCount,
      fromTimestamp,
      toTimestamp,
    );

    await pool.end();

    // Ensure sorted by timestamp
    let sortedData = gasData.sort((a, b) => a.timestamp - b.timestamp);

    // Convert base_fee_per_gas to gwei
    const formattedData: FormattedBlockData[] = sortedData.map((r) => ({
      blockNumber: r.block_number ? r.block_number : 0,
      timestamp: r.timestamp ? r.timestamp : 0,
      basefee: r.base_fee_per_gas
        ? Number(formatUnits(parseInt(r.base_fee_per_gas), "gwei"))
        : 0,
    }));

    return NextResponse.json(formattedData, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching data", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.FOSSIL_DB_URL ?? "Error",
      },
      { status: 500 },
    );
  }
}
