import { AlchemyProvider, formatUnits, toNumber } from "ethers";
import { NextResponse } from "next/server";
import { FormattedBlockData } from "@/lib/types";

interface FeeHistoryResult {
  oldestBlock: string;
  baseFeePerGas: string[];
  gasUsedRatio: number[];
  reward: string[][];
}

interface BlockByNumberResult {
  number: string;
  baseFeePerGas: string;
  timestamp: string;
}

// Gets latest 100 unconfirmed blocks from Alchemy
const MAX_UNCONFIRMED_BLOCKS = 100;
export async function POST() {
  const provider = new AlchemyProvider(
    "homestead",
    process.env.ALCHEMY_API_KEY,
  );

  try {
    const history: FeeHistoryResult = await provider.send("eth_feeHistory", [
      MAX_UNCONFIRMED_BLOCKS,
      "latest",
      [],
    ]);

    const { oldestBlock, baseFeePerGas } = history;

    try {
      const fullBlock: BlockByNumberResult = await provider.send(
        "eth_getBlockByNumber",
        [oldestBlock, false],
      );
      const timestamp = toNumber(fullBlock.timestamp);
      const blockData: FormattedBlockData[] = [];

      baseFeePerGas.forEach((fee: string, index: number) => {
        blockData.push({
          timestamp: timestamp + 12 * index,
          blockNumber: toNumber(fullBlock.number) + index,
          basefee: Number(formatUnits(fee, "gwei")),
          isUnconfirmed: true,
        });
      });

      return NextResponse.json(blockData, { status: 200 });
    } catch (error) {
      console.error("Error processing fee history request:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error processing fee history request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
