import demoRoundData from "@/lib/demo/demo-round-data.json";
import demoFossilCallbackData from "@/lib/demo/demo-fossil-data.json";

export interface DemoRoundDataType {
  roundId: number;
  roundAddress: string;
  capLevel: string;
  strikePrice: string;
  deploymentDate: string;
  auctionStartDate: string;
  auctionEndDate: string;
  optionSettleDate: string;
  settlementPrice: string;
  reservePrice: string;
  volatility: string;
}

export interface DemoFossilCallbackDataType {
  roundId: number;
  deploymentDate: string;
  auctionStartDate: string;
  auctionEndDate: string;
  optionSettleDate: string;
  twap: string;
  reservePrice: string;
  volatility: string;
}

export function getDemoRoundData(roundId: number | string): DemoRoundDataType {
  // Get the normalized round ID
  const demoRoundId: number = getDemoRoundId(roundId);

  // Find the corresponding round data
  const roundData = demoRoundData.find((data) => data.roundId === demoRoundId);

  if (!roundData) {
    throw new Error(`No demo data found for round id ${demoRoundId}`);
  }

  return roundData;
}

export function getDemoFossilCallbackData(
  roundId: number | string,
): DemoFossilCallbackDataType {
  // Get the normalized round ID
  const demoRoundId: number = getDemoRoundId(roundId);

  // Find the corresponding fossil data
  const fossilData = demoFossilCallbackData.find(
    (data) => data.roundId === demoRoundId,
  );

  if (!fossilData) {
    throw new Error(`No demo data found for round id ${demoRoundId}`);
  }

  return fossilData;
}

export function getDemoRoundId(roundId: number | string): number {
  const id = Number(roundId) >= 1 ? Number(roundId) : 1;
  return ((id - 1) % 5) + 1; // Cycles through 1-5
}
