"use server";

import { NextResponse } from "next/server";
import { vaultABI, optionRoundABI } from "@/lib/abi"; // Ensure vaultABI is correctly defined
import { num, RpcProvider, Contract } from "starknet";
import { stringToHex } from "@/lib/utils";

interface ReadVaultRoundsResponse {
  vaultAddress: string;
  currentRoundId: number;
  rounds: RoundData[];
}

interface RoundData {
  roundAddress: string;
  capLevel?: string;
  strikePrice?: string;
  deploymentDate?: string;
  auctionStartDate?: string;
  auctionEndDate?: string;
  optionSettleDate?: string;
  error?: string;
}

/// GET historical round params for a given vault (from round 1 to current round)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const vaultAddress = searchParams.get("vaultAddress");
  const fromRound = searchParams.get("fromRound");
  const toRound = searchParams.get("toRound");
  // In the devenv, server side calls to the node need to use the docker host
  // This logic does not apply to prod. JUNO_DOCKER_HOST does not need to be set in prod
  // TODO: To get rid of this workaround and remove JUNO_DOCKER_HOST from the env, we need to
  // all the calls to the node need to be either on the clients side, or on the server side.
  let nodeUrl =
    searchParams.get("nodeUrl") === process.env.NEXT_PUBLIC_RPC_URL_JUNO_DEVNET
      ? process.env.JUNO_DOCKER_HOST
      : searchParams.get("nodeUrl");

  // Validate required parameters
  try {
    if (!vaultAddress || !fromRound || !toRound || !nodeUrl) {
      return NextResponse.json(
        {
          error:
            "Missing vaultAddress, fromRound, toRound, or nodeUrl query parameter.",
        },
        { status: 400 },
      );
    }

    // Create provider
    const provider = new RpcProvider({ nodeUrl });

    if (!nodeUrl || !provider) {
      return NextResponse.json(
        { error: "RPC URL not found." },
        { status: 500 },
      );
    }
    // Get vault dispatcher
    const vaultContract = new Contract(vaultABI, vaultAddress, provider);
    // Get vault's current round ID
    const currentRoundId: string = num
      .toBigInt(await vaultContract.get_current_round_id())
      .toString();

    // Helper function to fetch a round address
    const getRoundAddress = async (roundId: number): Promise<string> => {
      try {
        const roundAddress: string = await vaultContract.get_round_address(
          num.toBigInt(roundId),
        );
        return roundAddress;
      } catch (error: any) {
        console.error(`Error fetching address for round ID ${roundId}:`, error);
        throw new Error(`Failed to fetch address for round ID ${roundId}.`);
      }
    };

    // Helper function to read contract data in bulk
    const readContractData = async (
      roundAddress: string,
    ): Promise<RoundData> => {
      try {
        const roundContract = new Contract(
          optionRoundABI,
          roundAddress,
          provider,
        );

        const [
          capLevel,
          strikePrice,
          deploymentDate,
          auctionStartDate,
          auctionEndDate,
          optionSettleDate,
        ] = await Promise.all([
          roundContract.get_cap_level(),
          roundContract.get_strike_price(),
          roundContract.get_deployment_date(),
          roundContract.get_auction_start_date(),
          roundContract.get_auction_end_date(),
          roundContract.get_option_settlement_date(),
        ]);

        return {
          roundAddress,
          capLevel: capLevel.toString(),
          strikePrice: strikePrice.toString(),
          deploymentDate: deploymentDate.toString(),
          auctionStartDate: auctionStartDate.toString(),
          auctionEndDate: auctionEndDate.toString(),
          optionSettleDate: optionSettleDate.toString(),
        };
      } catch (error: any) {
        console.error(`Error reading contract at ${roundAddress}:`, error);
        return {
          roundAddress,
          error: error.message || "Failed to read contract data.",
        };
      }
    };

    const roundPromises: Promise<RoundData>[] = [];
    const stop =
      Number(toRound) > Number(currentRoundId)
        ? Number(currentRoundId)
        : Number(toRound);
    const start = Number(fromRound);
    for (let roundId = start; roundId <= stop; roundId++) {
      try {
        const roundAddress = await getRoundAddress(roundId);
        if (!roundAddress) continue;
        roundPromises.push(
          readContractData(stringToHex(roundAddress)).then((data) => ({
            roundId,
            ...data,
          })),
        );
      } catch (error: any) {
        // If fetching the round address fails, push an error entry
        roundPromises.push(
          Promise.resolve({
            roundId,
            roundAddress: "",
            error: error.message || "Failed to fetch round address.",
          }),
        );
      }
    }

    const rounds: RoundData[] = await Promise.all(roundPromises);
    const response: ReadVaultRoundsResponse = {
      vaultAddress,
      currentRoundId: Number(currentRoundId),
      rounds,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json(
      { error: "Internal server error.", details: error.message },
      { status: 500 },
    );
  }
}
