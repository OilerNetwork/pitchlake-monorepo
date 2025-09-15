import { OptionRoundStateType, VaultStateType } from "@/lib/types";
import Countdown from "./Countdown";
import ProgressBar from "./ProgressBar";
import ManualButtons from "./ManualButtons";
import { useProgressEstimates } from "@/hooks/stateTransition/useProgressEstimates";
import { useDemoTime } from "@/lib/demo/useDemoTime";
import { useTimeContext } from "@/context/TimeProvider";

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
  const { txnEstimate, fossilEstimate, errorEstimate } = useProgressEstimates();

  if (!vaultState) return null;
  if (!selectedRoundState) return null;

  const { roundState, targetTimestamp } =
    getRoundStateAndTargetDate(selectedRoundState);

  const timeEstimate =
    roundState === "Open" || roundState === "Auctioning"
      ? txnEstimate
      : fossilEstimate;

  const componentType = (): StateTransitionComponentType => {
    const _clientNow = Number(clientNow);
    const _l2Now = Number(l2Now);
    const _target = Number(targetTimestamp);

    if (roundState === "Settled") return "Countdown";
    else if (_clientNow < _target) return "Countdown";
    // (Client) now is > target
    else {
      // Non-demo, show manual buttons after cron estimate
      if (conn !== "demo") {
        if (_clientNow > _target + timeEstimate + errorEstimate)
          return "ManualButtons";
        else return "ProgressBar";
      }
      // Demo, ignore cron estimate, show progress bar until block is ready for manual buttons
      else {
        // If l2Now > bounds, manual buttons, else progress bar
        if (_l2Now > _target) return "ManualButtons";
        else return "ProgressBar";
      }
    }
  };

  if (
    !isPanelOpen &&
    (componentType() === "Countdown" || componentType() === "ProgressBar")
  )
    return null;
  else
    return (
      <div className="w-full border border-transparent border-t-[#262626] p-2">
        {componentType() === "Countdown" ? (
          <Countdown
            roundState={roundState}
            now={clientNow}
            targetTimestamp={Number(targetTimestamp)}
            isPanelOpen={isPanelOpen}
          />
        ) : componentType() === "ProgressBar" ? (
          <ProgressBar
            conn={conn}
            roundState={roundState}
            timeEstimate={timeEstimate}
            now={clientNow}
            progressStart={Number(targetTimestamp)}
            isPanelOpen={isPanelOpen}
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
): { roundState: string; targetTimestamp: string } => {
  const { roundState, auctionStartDate, auctionEndDate, optionSettleDate } =
    round;

  if (roundState === "Open")
    return { roundState, targetTimestamp: auctionStartDate.toString() };
  else if (roundState === "Auctioning")
    return { roundState, targetTimestamp: auctionEndDate.toString() };
  else return { roundState, targetTimestamp: optionSettleDate.toString() };
};

export default StateTransition;
