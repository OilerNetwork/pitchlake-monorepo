"use client";
import { useMemo} from "react";
import { FormattedBlockData } from "@/lib/types";
import { getTWAPs, scaleInRange } from "@/lib/utils";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";
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
    console.log("acbs3", confirmedGasData);
    if ((!confirmedGasData && !unconfirmedGasData) || conn === "demo")
      return { combinedGasData: [] };

    // Remove all unconfirmed blocks if timestamp < last fossil block

    // Set bounds if there is no fossil data
    if (confirmedGasData?.length === 0) {
      confirmedGasData.push({ timestamp: xMin }, { timestamp: xMax });
    }

    // If there is fossil data, remove all unconfirmed blocks if timestamp < last fossil block

    const allGasData: FormattedBlockData[] = [
      ...(confirmedGasData
        ? confirmedGasData.map(
            (d,index) =>
              ({
                basefee: d.baseFee ? d.baseFee/10**9 : undefined,
                blockNumber: d.blockNumber,
                timestamp: d.timestamp,
                twap: d.twap ? d.twap/10**9 : undefined,
                unconfirmedBasefee: index===confirmedGasData.length-1?d.baseFee ? d.baseFee/10**9 : undefined:undefined,
                unconfirmedTwap: index===confirmedGasData.length-1?d.twap ? d.twap/10**9 : undefined:undefined,
                confirmedBasefee: d.baseFee ? d.baseFee/10**9 : undefined,
                confirmedTwap: d.twap ? d.twap/10**9 : undefined,
                isUnconfirmed: false,
              } as FormattedBlockData)
          )
        : []),
      ...(unconfirmedGasData
        ? unconfirmedGasData.map(
            (d, index) =>
             {  return ({
                basefee: d.baseFee ? d.baseFee/10**9 : undefined,
                blockNumber: d.blockNumber,
                timestamp: d.timestamp,
                twap: d.twap ? d.twap/10**9 : undefined,
                unconfirmedBasefee: d.baseFee ? d.baseFee/10**9 : undefined,
                unconfirmedTwap: d.twap ? d.twap/10**9 : undefined,
                confirmedBasefee: undefined,
                confirmedTwap: undefined,
                isUnconfirmed: true,
              } as FormattedBlockData)}
          )
        : []),
    ];
    console.log("allData", allGasData);

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

    return {
      combinedGasData: allGasData
        .sort((a, b) => a.timestamp - b.timestamp)
        .filter((d) => {
          return d.timestamp <= xMax && d.timestamp >= xMin;
        }),
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

  console.log("11gasData", gasData);
  return { gasData };
};

export default useGasData;
