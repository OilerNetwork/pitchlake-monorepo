function generateDemoData(): {
  blockNumber: string;
  timestamp: number;
  basefee: number;
}[] {
  const genesisTimestamp = 1735705623 + 1800;
  const startBlock = 21527387;
  const numberOfBlocks = 600;
  const blockTime = 12;

  let currentBasefee = 10;

  const data = [];

  function piecewiseTrend(x: number): number {
    if (x < 0.25) {
      const t = x / 0.5;
      return 10 - 5 * (t * t);
    } else {
      const t = (x - 0.5) / 0.5;
      return 5 + 10 * (t * t);
    }
  }

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  for (let i = 0; i < numberOfBlocks; i++) {
    const blockNumber = startBlock + i;
    const timestamp = genesisTimestamp + i * blockTime;

    const x = i / Math.max(1, numberOfBlocks - 1);
    const ideal = piecewiseTrend(x);

    const maxChange = currentBasefee * 0.125; // ±12.5%

    let difference = ideal - currentBasefee;

    difference += (Math.random() - 0.5) * 4;
    difference = clamp(difference, -maxChange, maxChange);

    let newBasefee = currentBasefee + difference;

    newBasefee = clamp(newBasefee, 1, 25);

    currentBasefee = parseFloat(newBasefee.toFixed(6));

    data.push({
      blockNumber: blockNumber.toString(),
      timestamp,
      basefee: currentBasefee,
    });
  }

  return data;
}

function main() {
  const demoData = generateDemoData();
  console.log(JSON.stringify(demoData, null, 2));
}

main();
