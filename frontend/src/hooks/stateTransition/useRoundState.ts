import { useMemo, useRef, useEffect } from "react";
import { OptionRoundStateType } from "@/lib/types";
import { StatusData } from "@/hooks/fossil/useFossilStatus";

const getRoundState = ({
  selectedRoundState,
  fossilStatus,
  fossilError,
  isPendingTx,
  expectedNextState,
}: {
  selectedRoundState: OptionRoundStateType | undefined;
  fossilStatus: StatusData | null;
  fossilError: string | null;
  isPendingTx: boolean;
  expectedNextState: string | null;
}): string => {
  if (!selectedRoundState) return "Settled";
  if (isPendingTx || fossilStatus?.status === "Pending") return "Pending";
  const rawState = selectedRoundState?.roundState.toString();
  if (
    rawState === "Open" ||
    rawState === "Auctioning" ||
    rawState === "Settled"
  ) {
    // Is the contract's state the expected next state?
    if (expectedNextState && rawState !== expectedNextState) return "Pending";
    return rawState;
  }

  if (rawState === "Running") {
    if (fossilStatus?.status === "Completed") {
      if (expectedNextState === "Open") return "Pending";
      return rawState;
    }
    if (
      fossilError ||
      fossilStatus === null ||
      fossilStatus.error ||
      fossilStatus.status === "Failed"
    )
      return "FossilReady";
  }

  return "Pending";
};

export const useRoundState = ({
  selectedRoundState,
  fossilStatus,
  fossilError,
  pendingTx,
  expectedNextState,
}: {
  selectedRoundState: OptionRoundStateType | undefined;
  fossilStatus: StatusData | null;
  fossilError: string | null;
  pendingTx: string | undefined;
  expectedNextState: string | null;
}) => {
  const roundState = useMemo(() => {
    return getRoundState({
      selectedRoundState,
      fossilStatus,
      fossilError,
      isPendingTx: pendingTx ? true : false,
      expectedNextState,
    });
  }, [
    selectedRoundState,
    fossilStatus,
    fossilError,
    pendingTx,
    expectedNextState,
  ]);

  // Previous roundState to detect changes
  const prevRoundStateRef = useRef(roundState);

  useEffect(() => {
    prevRoundStateRef.current = roundState;
  }, [roundState]);

  return { roundState, prevRoundState: prevRoundStateRef.current };
};
