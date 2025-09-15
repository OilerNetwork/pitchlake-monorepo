import { useMemo } from "react";
import { num } from "starknet";
import { OptionRoundStateType } from "@/lib/types";
import { useNewContext } from "@/context/NewProvider";

export const useRoundPermissions = (
  timestamp: number,
  selectedRoundState: OptionRoundStateType | undefined,
  FOSSIL_DELAY: number,
) => {
  const { conn } = useNewContext();
  const canAuctionStart = useMemo(() => {
    return BigInt(timestamp) >= Number(selectedRoundState?.auctionStartDate);
  }, [timestamp, selectedRoundState]);

  const canAuctionEnd = useMemo(() => {
    return BigInt(timestamp) >= Number(selectedRoundState?.auctionEndDate);
  }, [timestamp, selectedRoundState]);

  const canRoundSettle = useMemo(() => {
    const roundSettleDate =
      Number(selectedRoundState?.optionSettleDate) + conn === "demo"
        ? 0
        : FOSSIL_DELAY;

    return BigInt(timestamp) >= roundSettleDate;
  }, [timestamp, selectedRoundState]);

  // will rm
  const canSendFossilRequest = useMemo(() => {
    const roundSettleDate =
      Number(selectedRoundState?.optionSettleDate) + conn === "demo"
        ? 0
        : FOSSIL_DELAY;

    return BigInt(timestamp) >= roundSettleDate;
  }, [timestamp, selectedRoundState]);

  return {
    canAuctionStart,
    canAuctionEnd,
    canRoundSettle,
    // will rm
    canSendFossilRequest,
  };
};
