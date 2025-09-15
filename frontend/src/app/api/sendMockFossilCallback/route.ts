"use server";

import { NextResponse } from "next/server";
import { getDemoFossilCallbackData, getDemoRoundData } from "@/lib/demo/utils";
import { Account, CairoUint256, Contract, Provider } from "starknet";
import { vaultABI } from "@/lib/abi";
import { FossilCallbackArgs, L1Data } from "@/lib/types";

export interface DemoFossilCallParams {
  vaultAddress: string;
  roundId: string;
  toTimestamp: string;
}

export async function POST(request: Request): Promise<Response> {
  // Parse the request body
  const body = await request.json();
  const params: DemoFossilCallParams = body;

  const { vaultAddress, roundId, toTimestamp } = params;

  if (!vaultAddress || !roundId || !toTimestamp) {
    return NextResponse.json(
      {
        error: "Missing vaultAddress, roundId or toTimestamp parameter",
      },
      { status: 400 },
    );
  }

  // Get demo account setup
  const address = process.env.DEMO_ACCOUNT_ADDRESS;
  const pk = process.env.DEMO_PRIVATE_KEY;
  const rpc = process.env.NEXT_PUBLIC_RPC_URL_SEPOLIA;

  if (!address || !pk || !rpc) {
    return NextResponse.json(
      {
        error: "Failed to fetch secrets",
      },
      { status: 400 },
    );
  }

  // Initialize demo account
  const provider = new Provider({ nodeUrl: rpc });
  const account = new Account(provider, address, pk);

  // Initialize vault contract
  const vaultContract = new Contract(vaultABI, vaultAddress, account);

  // Mock the fossil client callback
  const { twap, volatility, reservePrice } = getDemoFossilCallbackData(roundId);

  const args: FossilCallbackArgs = {
    l1_data: {
      twap: { low: twap, high: 0 },
      volatility,
      reserve_price: { low: reservePrice, high: 0 },
    },
    timestamp: toTimestamp,
  };

  // Send the mocked callback
  try {
    const nonce = await account.getNonce();
    const tx = await vaultContract.invoke(
      "fossil_client_callback",
      [args.l1_data, args.timestamp],
      { nonce },
    );
    return NextResponse.json({ tx_hash: tx.transaction_hash }, { status: 200 });
  } catch (error) {
    console.error("Error sending Fossil request:", error);
    return NextResponse.json(
      { error: "Error sending Fossil request: " + error },
      { status: 500 },
    );
  }
}
