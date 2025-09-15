"use server";

import { NextResponse } from "next/server";
import { formatUnits } from "ethers";
import { Pool } from "pg";

// Type to return
interface BlockData {
  block_number: number;
  base_fee_per_gas: string;
  timestamp: string;
}

/// Get the latest block data from the database
export async function GET(request: Request) {
  try {
    // SQL Query to select the latest block based on the highest block number
    const query = `
      SELECT number AS block_number, base_fee_per_gas, timestamp
      FROM blockheaders
      ORDER BY number DESC
      LIMIT 10;
    `;

    const pool = new Pool({
      connectionString: process.env.FOSSIL_DB_URL,
      ssl: {
        rejectUnauthorized: false, // For testing purposes; ensure proper SSL config in production
      },
    });

    const result = await pool.query(query);
    await pool.end();

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          error: "No blocks found in the database.",
        },
        { status: 404 },
      );
    }

    result.rows.forEach((r) => {
      const block: BlockData = {
        block_number: r.block_number,
        timestamp: r.timestamp,
        base_fee_per_gas: r.base_fee_per_gas
          ? formatUnits(r.base_fee_per_gas, "gwei")
          : "undefined",
      };
      return block;
    });

    return NextResponse.json(result.rows, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching the latest block data:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.FOSSIL_DB_URL
          ? "Check database configuration."
          : "DB URL not set.",
      },
      { status: 500 },
    );
  }
}
