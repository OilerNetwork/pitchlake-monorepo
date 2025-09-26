import { OptionRoundStateType, VaultStateType } from "@/lib/types";
import Countdown from "./Countdown";
import ProgressBar from "./ProgressBar";
import ManualButtons from "./ManualButtons";
import { useProgressEstimates } from "@/hooks/stateTransition/useProgressEstimates";
import { useDemoTime } from "@/lib/demo/useDemoTime";
import { useTimeContext } from "@/context/TimeProvider";
import { useMemo } from "react";

type StateTransitionProps = {
  conn: string;
  vaultState: VaultStateType | undefined;
  selectedRoundState: OptionRoundStateType | undefined;
  isPanelOpen: boolean;
  setModalState?: any;
};

type StateTransitionComponentType =
  | "Countdown"
  | "ProgressBar"
  | "ManualButtons";

const StateTransition = ({
  conn,
  vaultState,
  selectedRoundState,
  isPanelOpen,
  setModalState,
}: StateTransitionProps) => {
  const { demoNow: clientNow } = useDemoTime(true, true, 1000);
  const { timestamp: l2Now } = useTimeContext();
  const { totalEstimate } = useProgressEstimates();

  const { roundState, targetTimestamp } = selectedRoundState && vaultState
    ? getRoundStateAndTargetDate(selectedRoundState, vaultState)
    : { roundState: "Settled", targetTimestamp: "0" };

  const componentType = useMemo((): StateTransitionComponentType => {
    const _clientNow = Number(clientNow);
    const _l2Now = Number(l2Now);
    const _target = Number(targetTimestamp);

    if (roundState === "Settled") return "Countdown";
    else if (_clientNow < _target) return "Countdown";
    // (Client) now is > target
    else {
      // Non-demo, show manual buttons after total estimate
      if (conn !== "demo") {
        if (_clientNow > _target + totalEstimate)
          return "ManualButtons";
        else return "ProgressBar";
      }
      // Demo, ignore estimates, show progress bar until block is ready for manual buttons
      else {
        // If l2Now > bounds, manual buttons, else progress bar
        if (_l2Now > _target) return "ManualButtons";
        else return "ProgressBar";
      }
    }
  }, [
    roundState,
    clientNow,
    l2Now,
    targetTimestamp,
    conn,
    totalEstimate,
  ]);

  if (!vaultState?.provingDelay) return null;
  if (!selectedRoundState) return null;

  if (
    !isPanelOpen &&
    (componentType === "Countdown" || componentType === "ProgressBar")
  )
    return null;
  else
    return (
      <div className="w-full border border-transparent border-t-[#262626] p-2">
        {componentType === "Countdown" ? (
          <Countdown
            roundState={roundState}
            now={clientNow}
            targetTimestamp={Number(targetTimestamp)}
            isPanelOpen={isPanelOpen}
            isRound1Init={roundState === "Open" && Number(selectedRoundState.reservePrice) === 0}
          />
        ) : componentType === "ProgressBar" ? (
          <ProgressBar
            conn={conn}
            roundState={roundState}
            timeEstimate={totalEstimate}
            now={clientNow}
            progressStart={Number(targetTimestamp)}
            isPanelOpen={isPanelOpen}
            isRound1Init={roundState === "Open" && Number(selectedRoundState.reservePrice) === 0}
          />
        ) : (
          <ManualButtons
            isPanelOpen={isPanelOpen}
            setModalState={setModalState}
          />
        )}
      </div>
    );
};

const getRoundStateAndTargetDate = (
  round: OptionRoundStateType,
  vaultState?: VaultStateType,
): { roundState: string; targetTimestamp: string } => {
  const { roundState, auctionStartDate, auctionEndDate, optionSettleDate, reservePrice } =
    round;

  if (roundState === "Open") {
    // Check if this is Round 1 initialization case
    if (Number(reservePrice) === 0 && vaultState?.deploymentDate) {
      return { roundState, targetTimestamp: vaultState.deploymentDate.toString() };
    }
    return { roundState, targetTimestamp: auctionStartDate.toString() };
  }
  else if (roundState === "Auctioning")
    return { roundState, targetTimestamp: auctionEndDate.toString() };
  else return { roundState, targetTimestamp: optionSettleDate.toString() };
};

export default StateTransition;
