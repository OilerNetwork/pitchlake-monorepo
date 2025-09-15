import { useMemo } from "react";
import useGasData from "./useGasData";
import { getDemoRoundId } from "@/lib/demo/utils";
import { useChartContext } from "@/context/ChartProvider";
import { useHistoricalRoundParams } from "./useHistoricalRoundParams";
import { useNewContext } from "@/context/NewProvider";
import demoRoundData from "@/lib/demo/demo-round-data.json";
import { FormattedBlockData } from "@/lib/types";
import { formatUnits } from "ethers";

const useChartData = (activeLines: any, vaultAddress?: string) => {
  const { conn, selectedRound } = useNewContext();
  // Chart context
  const { isExpandedView, setIsExpandedView, xMax, xMin } = useChartContext();
  const { gasData } = useGasData();
  // Help context

  // Strike and cap for all possibly displayed rounds
  const { fromRound, toRound } = useMemo(() => {
    if (!selectedRound) return { fromRound: 1, toRound: 1 };

    const toRound =
      conn === "demo" ? getDemoRoundId(selectedRound) : Number(selectedRound);
    const fromRound = !isExpandedView ? toRound : toRound > 6 ? toRound - 6 : 1;

    return { fromRound, toRound };
  }, [selectedRound, isExpandedView]);

  const { vaultData: _historicalData } = useHistoricalRoundParams({
    vaultAddress: vaultAddress,
    fromRound,
    toRound,
  });

  const historicalData = useMemo(() => {
    if (conn === "demo") {
      return { rounds: demoRoundData };
    } else return _historicalData;
  }, [_historicalData]);

  // Add strike and cap to gas data
  const {
    parsedData,
    maxValue,
  }: { parsedData: FormattedBlockData[]; maxValue: number } = useMemo(() => {
    if (!selectedRound || !historicalData || !gasData)
      return { parsedData: [], maxValue: 0 };

    const dataPoints =
      gasData.length > 0 ? gasData : [{ timestamp: xMin }, { timestamp: xMax }];

    let max = 0; // Add max calculation

    const refined = dataPoints?.map((item: any) => {
      const newItem: any = { ...item };

      // Find the round this gas point falls in
      const roundThisItemIsIn = historicalData.rounds.find((r: any) => {
        const lowerBound = Number(r.deploymentDate);
        const upperBound = Number(r.optionSettleDate);
        return item?.timestamp >= lowerBound && item?.timestamp <= upperBound;
      });

      if (roundThisItemIsIn) {
        const strike = Number(
          formatUnits(roundThisItemIsIn.strikePrice, "gwei"),
        );
        const cap = strike * (1 + Number(roundThisItemIsIn.capLevel) / 10000);

        newItem.STRIKE = strike;
        newItem.CAP_LEVEL = cap;

        // Update max for strike and cap
        if (strike > max) max = strike;
        if (cap > max) max = cap;
      } else {
        newItem.STRIKE = undefined;
        newItem.CAP_LEVEL = undefined;
      }

      // Calculate max for all other values
      if (newItem.TWAP !== null && newItem.TWAP > max) max = newItem.TWAP;
      if (newItem.BASEFEE !== null && newItem.BASEFEE > max)
        max = newItem.BASEFEE;
      if (newItem.basefee && newItem.basefee > max) max = newItem.basefee;
      if (newItem.unconfirmedBasefee && newItem.unconfirmedBasefee > max)
        max = newItem.unconfirmedBasefee;
      if (newItem.confirmedBasefee && newItem.confirmedBasefee > max)
        max = newItem.confirmedBasefee;
      if (newItem.unconfirmedTwap && newItem.unconfirmedTwap > max)
        max = newItem.unconfirmedTwap;
      if (newItem.confirmedTwap && newItem.confirmedTwap > max)
        max = newItem.confirmedTwap;

      return newItem;
    });

    return {
      parsedData: refined,
      maxValue: max,
    };
  }, [selectedRound, historicalData, gasData, xMin, xMax]);

  // Compute vertical segments and round areas based on historical data
  const { verticalSegments, roundAreas } = useMemo(() => {
    if (
      !historicalData ||
      !historicalData.rounds ||
      !parsedData ||
      !fromRound ||
      !toRound ||
      !isExpandedView
    )
      return { verticalSegments: [], roundAreas: [] };

    const segments: any = [];
    const areas: any = [];
    const sortedData: any = [...parsedData].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    // Filter rounds based on fromRoundId and toRoundId
    const filteredRounds = historicalData.rounds.filter(
      (round: any) => round.roundId >= fromRound && round.roundId <= toRound,
    );

    filteredRounds.forEach((round: any) => {
      if (!round || !round.capLevel || !round.strikePrice) return;

      const capLevel = Number(round.capLevel);
      const strikePriceGwei = parseFloat(
        formatUnits(round.strikePrice, "gwei"),
      );
      const deploymentDate = Number(round.deploymentDate);
      const optionSettleDate = Number(round.optionSettleDate);
      const capMultiplier = 1 + capLevel / 10000;
      const cappedStrike = strikePriceGwei * capMultiplier;

      // Find the nearest data points for deploymentDate and optionSettleDate
      const start = sortedData.find((d: any) => d.timestamp >= deploymentDate);
      const end = [...sortedData]
        .reverse()
        .find((d) => d.timestamp <= optionSettleDate);

      if (!start || !end) return;

      // Add deployment date line
      segments.push({
        roundId: round.roundId,
        segment: [
          { x: start.timestamp, y: cappedStrike },
          { x: start.timestamp, y: 0 },
        ],
      });

      // Add settlement date line
      segments.push({
        roundId: round.roundId,
        segment: [
          { x: end.timestamp, y: cappedStrike },
          { x: end.timestamp, y: 0 },
        ],
      });

      // Add round area for interactive region
      areas.push({
        roundId: round.roundId,
        x1: start.timestamp,
        x2: end.timestamp,
        y1: 0,
        y2: cappedStrike,
      });
    });

    return { verticalSegments: segments, roundAreas: areas };
  }, [
    isExpandedView,
    historicalData,
    parsedData,
    maxValue,
    fromRound,
    toRound,
  ]);

  const { yMax, yTicks } = useMemo((): { yMax: number; yTicks: number[] } => {
    if (!parsedData) return { yMax: 0, yTicks: [] };

    // Find the maximum value in the data

    const _yMax = maxValue * 1.2; // 20% padding
    if (_yMax === 0) return { yMax: _yMax, yTicks: [] };

    // Define Y-axis ticks
    const step = _yMax / 4;
    const _yTicks = [
      0,
      Number(step.toFixed(1)),
      Number((step * 2).toFixed(1)),
      Number((step * 3).toFixed(1)),
      Number(_yMax.toFixed(1)),
    ];

    return { yMax: _yMax, yTicks: _yTicks };
  }, [parsedData, activeLines]);

  // Compute X-axis ticks and labels based on view
  const { xTicks, xTickLabels } = useMemo(() => {
    let _xTicks: number[] = [];
    let _xTickLabels: {
      [key: number]: { label: string | null; roundId?: number };
    } = {};

    if (!parsedData) return { xTicks: _xTicks, xTickLabels: _xTickLabels };

    if (!historicalData || !historicalData.rounds || !fromRound || !toRound) {
      return { xTicks: _xTicks, xTickLabels: _xTickLabels };
    }

    const defaultTickFormat = { label: null };

    const filteredRounds = historicalData.rounds.filter(
      (round: any) => round.roundId >= fromRound && round.roundId <= toRound,
    );

    // Generate midpoints for round IDs
    filteredRounds.forEach((round: any) => {
      const start = Number(round.deploymentDate);
      const end = Number(round.optionSettleDate);

      const midpoint = (Number(start) + Number(end)) / 2;
      if (
        midpoint >= parsedData[1]?.timestamp &&
        midpoint <= parsedData[parsedData.length - 1]?.timestamp
      ) {
        _xTickLabels[midpoint] = {
          label: `Round ${round.roundId}`,
          roundId: round.roundId,
        };
        _xTicks.push(midpoint);
      }
    });

    // Generate timestamp ticks
    const timestamps = parsedData.map((item: any) => item.timestamp);
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Math.max(...timestamps);

    _xTicks.push(minTimestamp);
    _xTickLabels[minTimestamp] = defaultTickFormat;
    _xTicks.push(maxTimestamp);
    _xTickLabels[maxTimestamp] = defaultTickFormat;

    // Ensure ticks are sorted
    _xTicks.sort((a, b) => a - b);

    return { xTicks: _xTicks, xTickLabels: _xTickLabels };
  }, [parsedData, isExpandedView, historicalData, fromRound, toRound]);
  return {
    parsedData,
    verticalSegments,
    roundAreas,
    xTicks,
    xTickLabels,
    yMax,
    yTicks,
  };
};

export default useChartData;
