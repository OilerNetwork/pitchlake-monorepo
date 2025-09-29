import { useMemo } from "react";
import { useNewContext } from "@/context/NewProvider";
import useVaultState from "../vault/states/useVaultState";
import useRoundState from "../vault/states/useRoundState";

export const useProgressEstimates = () => {
  const { conn } = useNewContext();
  const { vaultState, selectedRoundAddress } = useVaultState();
  const selectedRoundState = useRoundState(selectedRoundAddress);

  const { cronEstimate, fossilEstimate, errorEstimate, totalEstimate } =
    useMemo(() => {
      if (!selectedRoundState || !vaultState) {
        return {
          cronEstimate: 0,
          fossilEstimate: 0,
          errorEstimate: 0,
          totalEstimate: 0,
        };
      }

      const { roundState, reservePrice } = selectedRoundState;
      const { provingDelay } = vaultState;

      // Base estimates
      const CRON_ESTIMATE = 30; // 30 seconds for cron processing
      const FOSSIL_ESTIMATE = 30; // 30 seconds for fossil processing
      const ERROR_ESTIMATE = 10; // 30 seconds error tolerance

      let cronEstimate = 0;
      let fossilEstimate = 0;
      let errorEstimate = ERROR_ESTIMATE;

      if (conn === "demo") {
        // Demo mode - faster estimates
        cronEstimate = 30;
        fossilEstimate = 30;
        errorEstimate = 0;
      } else {
        cronEstimate = CRON_ESTIMATE;
        fossilEstimate = FOSSIL_ESTIMATE;
        errorEstimate = ERROR_ESTIMATE;
      }

      // Calculate total estimate based on scenario
      let totalEstimate = 0;

      if (roundState === "Open") {
        if (Number(reservePrice) === 0) {
          // Round 1 initialization case
          totalEstimate = Number(provingDelay) + fossilEstimate + errorEstimate;
        } else {
          // Normal auction start case
          totalEstimate = cronEstimate + errorEstimate;
        }
      } else if (roundState === "Auctioning") {
        // Auction end case
        totalEstimate = cronEstimate + errorEstimate;
      } else if (roundState === "Running") {
        // Settlement case
        totalEstimate = Number(provingDelay) + fossilEstimate + errorEstimate;
      }

      return { cronEstimate, fossilEstimate, errorEstimate, totalEstimate };
    }, [
      conn,
      selectedRoundState?.roundState,
      selectedRoundState?.reservePrice,
      selectedRoundState?.auctionEndDate,
      selectedRoundState?.optionSettleDate,
      vaultState?.provingDelay,
    ]);

  return {
    cronEstimate,
    fossilEstimate,
    errorEstimate,
    totalEstimate,
  };
};
