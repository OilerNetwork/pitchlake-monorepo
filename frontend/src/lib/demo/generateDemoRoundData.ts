interface RoundData {
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

const lookup: any = {
  // lose 100%
  1: {
    strikePrice: 4.69 * 1e9,
    capLevel: 4500,
    settlementPrice: 4.48 * 1e9,
    reservePrice: 1 * 1e9,
    //volatility: 0.0, // todo fill in ?
  },
  // ob B outbids ob A for all options, payout ~= clearing price
  2: {
    strikePrice: 4.48 * 1e9,
    capLevel: 4200,
    settlementPrice: 5.22 * 1e9,
    reservePrice: 0.7 * 1e9, // 0.74 is payout
  },
  // all options sell at res price
  // - ob A bids for 75% @ res + 1, ob B bids for 75% @ res price
  3: {
    strikePrice: 5.22 * 1e9,
    capLevel: 3300,
    settlementPrice: 6.21 * 1e9,
    reservePrice: 0.5 * 1e9,
  },
  // Payout capped, still profit
  4: {
    strikePrice: 6.21 * 1e9,
    capLevel: 1500,
    settlementPrice: 7.3 * 1e9,
    reservePrice: 0.5 * 1e9, // payout is 0.99
  },
  5: {
    strikePrice: 7.3 * 1e9,
    capLevel: 2500,
    settlementPrice: 4.69 * 1e9,
    reservePrice: 1e9,
  },
};

function calculateVolatility(cl: string): string {
  const vol = (0.5 * Number(cl)) / 2.33;
  return Math.floor(vol).toString();
}

function generateDemoRounds(
  numRounds: number,
  genesis: number,
  roundTransitionPeriod: number,
  auctionRunTime: number,
  optionRunTime: number,
  delay: number,
): RoundData[] {
  function randomHex32(): string {
    // create a 32-byte hex string starting with "0x"
    let hexStr = "0x";
    for (let i = 0; i < 64; i++) {
      hexStr += Math.floor(Math.random() * 16).toString(16);
    }
    return hexStr;
  }

  const rounds: RoundData[] = [];

  let deploymentDate = genesis;

  for (let i = 1; i <= numRounds; i++) {
    const { capLevel, strikePrice, settlementPrice, reservePrice } = lookup[i];

    const auctionStartDate = deploymentDate + roundTransitionPeriod;
    const auctionEndDate = auctionStartDate + auctionRunTime;
    const optionSettleDate = auctionEndDate + optionRunTime;

    const volatility = calculateVolatility(capLevel);

    const round: RoundData = {
      roundId: i,
      roundAddress: randomHex32(), // or use any deterministic approach
      capLevel: capLevel.toString(),
      strikePrice: strikePrice.toString(),
      deploymentDate: deploymentDate.toString(),
      auctionStartDate: auctionStartDate.toString(),
      auctionEndDate: auctionEndDate.toString(),
      optionSettleDate: optionSettleDate.toString(),
      settlementPrice: settlementPrice.toString(),
      reservePrice: reservePrice.toString(),
      volatility: volatility.toString(),
    };

    rounds.push(round);

    deploymentDate = optionSettleDate + delay;
  }

  return rounds;
}

function main2() {
  const numRounds = 5;

  const genesis = 1735707623 + 3600; // base start
  const roundTransitionPeriod = 60;
  const auctionRunTime = 180;
  const optionRunTime = 180;
  const delay = 30;

  const demoRounds = generateDemoRounds(
    numRounds,
    genesis,
    roundTransitionPeriod,
    auctionRunTime,
    optionRunTime,
    delay,
  );

  console.log(JSON.stringify(demoRounds, null, 2));
}

main2();
