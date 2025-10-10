"use client";
import { useMemo} from "react";
import { FormattedBlockData } from "@/lib/types";
import { getTWAPs, scaleInRange } from "@/lib/utils";
import useVaultState from "@/hooks/vault/states/useVaultState";
import useRoundState from "@/hooks/vault/states/useRoundState";
import { useChartContext } from "@/context/ChartProvider";
import { useNewContext } from "@/context/NewProvider";
import { useDemoTime } from "@/lib/demo/useDemoTime";
import {
  DemoFossilCallbackDataType,
  getDemoFossilCallbackData,
} from "@/lib/demo/utils";
import demoGasData from "@/lib/demo/demo-gas-data.json";
import useWebsocketChart from "../websocket/useChartWebsocket";

export const useGasData = () => {
  const { conn, selectedRound } = useNewContext();
  const { selectedRoundAddress } = useVaultState();
  const selectedRoundState = useRoundState(selectedRoundAddress);
  const { xMin, xMax, isExpandedView } = useChartContext();

  const { roundDuration, twapXMin } = useMemo(() => {
    if (!selectedRoundState || xMin === 0 || xMax === 0)
      return { twapXMin: xMin, roundDuration: 0 };

    const roundOpenDate = Number(selectedRoundState.deploymentDate);
    const roundDuration = xMax - roundOpenDate;
    const twapXMin = xMin - roundDuration;

    return { roundDuration, twapXMin };
  }, [selectedRoundState?.deploymentDate, xMin, xMax]);

  const { confirmedGasData, unconfirmedGasData } = useWebsocketChart({
    lowerTimestamp: isExpandedView ? twapXMin : xMin,
    upperTimestamp: xMax,
    roundDuration: roundDuration,
  });

  const { combinedGasData } = useMemo(() => {
    if ((!confirmedGasData && !unconfirmedGasData) || conn === "demo")
      return { combinedGasData: [] };
    // Create a copy of confirmed data
    const confirmedDataCopy = [...(confirmedGasData || [])];
    
    // Only add bounds if there is no fossil data
    if (confirmedDataCopy.length === 0) {
      confirmedDataCopy.push({ timestamp: xMin }, { timestamp: xMax });
    }

    // Create a map to deduplicate blocks by blockNumber or timestamp
    const blocksMap = new Map<string, FormattedBlockData>();
    
    // Add confirmed blocks first (they take priority)
    confirmedDataCopy?.forEach((d, index) => {
      const key = d.blockNumber ? `block_${d.blockNumber}` : `timestamp_${d.timestamp}`;
      blocksMap.set(key, {
        basefee: d.baseFee ? d.baseFee : undefined,
        blockNumber: d.blockNumber,
        timestamp: d.timestamp,
        twap: d.twap ? d.twap : undefined,
        unconfirmedBasefee: index === confirmedDataCopy.length - 1 ? d.baseFee ? d.baseFee : undefined : undefined,
        unconfirmedTwap: index === confirmedDataCopy.length - 1 ? d.twap ? d.twap : undefined : undefined,
        confirmedBasefee: d.baseFee ? d.baseFee : undefined,
        confirmedTwap: d.twap ? d.twap : undefined,
        isUnconfirmed: false,
      } as FormattedBlockData);
    });

    // Add unconfirmed blocks only if they don't already exist as confirmed
    unconfirmedGasData?.forEach((d) => {
      const key = d.blockNumber ? `block_${d.blockNumber}` : `timestamp_${d.timestamp}`;
      if (!blocksMap.has(key)) {
        blocksMap.set(key, {
          basefee: d.baseFee ? d.baseFee : undefined,
          blockNumber: d.blockNumber,
          timestamp: d.timestamp,
          twap: d.twap ? d.twap : undefined,
          unconfirmedBasefee: d.baseFee ? d.baseFee : undefined,
          unconfirmedTwap: d.twap ? d.twap : undefined,
          confirmedBasefee: undefined,
          confirmedTwap: undefined,
          isUnconfirmed: true,
        } as FormattedBlockData);
      }
    });

    const allGasData: FormattedBlockData[] = Array.from(blocksMap.values());

    if (allGasData[allGasData.length - 1]?.timestamp < xMax)
      allGasData.push({
        blockNumber: undefined,
        timestamp: xMax,
        basefee: undefined,
      });

    if (
      isExpandedView &&
      allGasData[allGasData.length - 1]?.timestamp < xMax - roundDuration
    )
      allGasData.push({
        blockNumber: undefined,
        timestamp: xMax - roundDuration,
        basefee: undefined,
      });

    const finalData = allGasData
      .sort((a, b) => a.timestamp - b.timestamp)
      .filter((d) => {
        return d.timestamp <= xMax && d.timestamp >= xMin;
      });
    
    return {
      combinedGasData: finalData,
    };
  }, [confirmedGasData, unconfirmedGasData]);

  /// DEMO ///
  const { demoNow } = useDemoTime(true, conn === "demo");

  const { gasData } = useMemo(() => {
    if (conn === "ws" || conn === "rpc") {
      return {
        gasData: combinedGasData,
      };
    }
    /// DEMO ///
    else {
      if (!demoNow) return { gasData: [] };
      const demoRoundData: DemoFossilCallbackDataType =
        getDemoFossilCallbackData(selectedRound);
      const roundStart = Number(demoRoundData.deploymentDate);
      const demoXMax = Number(demoRoundData.optionSettleDate);
      const demoData = demoGasData.filter((d) => d.timestamp <= demoXMax);

      const roundDuration = demoXMax - Number(demoRoundData.deploymentDate);

      const demoXMin = isExpandedView
        ? roundStart - 4 * roundDuration
        : roundStart;

      const allDemoGasData = getTWAPs(demoData, demoXMin, roundDuration);

      const scaledDemoNow = scaleInRange(
        demoNow,
        [xMin, xMax],
        [demoXMin, demoXMax]
      );

      const filteredDemoData = allDemoGasData.filter(
        (d) => d.timestamp <= scaledDemoNow
      );

      if (
        filteredDemoData[filteredDemoData.length - 1]?.timestamp + 12 <=
        demoXMax
      )
        filteredDemoData.push({ timestamp: demoXMax });

      return { gasData: filteredDemoData };
    }
  }, [combinedGasData, selectedRound, demoNow]);

  return { gasData };
};

export default useGasData;
