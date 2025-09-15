"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";
interface ChartContextProps {
  isExpandedView: boolean;
  setIsExpandedView: (b: boolean) => void;
  xMax: number;
  xMin: number;
}

const ChartContext = createContext<ChartContextProps | undefined>(undefined);

export const ChartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { selectedRoundAddress } = useVaultState();
  const selectedRoundState = useRoundState(selectedRoundAddress);

  const [isExpandedView, setIsExpandedView] = useState<boolean>(false);

  const { xMin, xMax } = useMemo(() => {
    if (!selectedRoundState) return { xMin: 0, xMax: 0 };

    const xMax = Number(selectedRoundState.optionSettleDate);

    if (!isExpandedView) {
      const xMin = Number(selectedRoundState.deploymentDate);
      return {
        xMin,
        xMax,
      };
    } else {
      const roundOpenDate = Number(selectedRoundState.deploymentDate);
      const roundDuration = xMax - roundOpenDate;
      const expandedChartRange = 6 * roundDuration;
      const xMin = xMax - expandedChartRange;

      return {
        xMin,
        xMax,
      };
    }
  }, [
    selectedRoundState?.deploymentDate,
    selectedRoundState?.optionSettleDate,
    isExpandedView,
  ]);

  return (
    <ChartContext.Provider
      value={{ isExpandedView, setIsExpandedView, xMax, xMin }}
    >
      {children}
    </ChartContext.Provider>
  );
};

export const useChartContext = () => {
  const context = useContext(ChartContext);
  if (!context) {
    throw new Error("useChartContext must be used within a ChartProvider");
  }
  return context;
};
