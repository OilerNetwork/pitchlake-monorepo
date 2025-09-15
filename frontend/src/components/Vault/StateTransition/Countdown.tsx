import { StateTransitionTooltip } from "@/components/BaseComponents/SettlementEstimateTooltip";
import { timeUntilTarget } from "@/lib/utils";
import { Info } from "lucide-react";
import { useMemo } from "react";

type CountdownProps = {
  roundState: string;
  now: number;
  targetTimestamp: number;
  isPanelOpen: boolean;
};

const Countdown = ({
  roundState,
  now,
  isPanelOpen,
  targetTimestamp,
}: CountdownProps) => {
  const msg =
    roundState === "Open"
      ? "Auction Starts In"
      : roundState == "Auctioning"
        ? "Auction Ends In"
        : roundState === "Running"
          ? "Round Settles In"
          : "Settlement Date";

  const tooltipMsg = useMemo(() => {
    let msg = "";
    if (roundState === "Open") msg = "Auction starts on:";
    else if (roundState === "Auctioning") msg = "Auction ends on:";
    else if (roundState === "Running") msg = "Round settles on: ";
    else if (roundState === "Settled") msg = "Round settled on: ";

    msg += ` ${new Date(targetTimestamp * 1000).toLocaleString()}`;

    return msg;
  }, [roundState, targetTimestamp]);

  const timeLeft = useMemo(() => {
    return timeUntilTarget(now.toString(), targetTimestamp.toString());
  }, [targetTimestamp, now]);

  if (!isPanelOpen) return null;
  else
    return (
      <div className="w-full flex flex-row justify-between items-center p-2">
        <div className="text-[#BFBFBF] w-fit text-nowrap font-regular">
          {msg}
        </div>
        <StateTransitionTooltip msg={tooltipMsg}>
          <div className="flex flex-row items-center gap-2">
            {timeLeft}
            <Info size={16} color="#CFC490" className="cursor-pointer" />
          </div>
        </StateTransitionTooltip>
      </div>
    );
};

export default Countdown;
