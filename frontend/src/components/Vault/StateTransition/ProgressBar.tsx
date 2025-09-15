import Hoverable from "@/components/BaseComponents/Hoverable";
import { StateTransitionTooltip } from "@/components/BaseComponents/SettlementEstimateTooltip";
import { timeUntilTarget } from "@/lib/utils";
import { Info } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ProgressBarProps = {
  conn: string;
  roundState: string;
  now: number;
  progressStart: number;
  timeEstimate: number;
  isPanelOpen: boolean;
};

const ProgressBar = ({
  roundState,
  now,
  progressStart,
  timeEstimate,
  isPanelOpen,
}: ProgressBarProps) => {
  const [progress, setProgress] = useState(10);

  const msg =
    roundState === "Open"
      ? "Auction Starting..."
      : roundState == "Auctioning"
        ? "Auction Ending..."
        : "Round Settling...";

  const tooltipMsg = useMemo(() => {
    let msg = "";
    let timeUntil = timeUntilTarget("0", timeEstimate.toString());

    if (timeUntil === "Now" || timeUntil === "Just now") timeUntil = "0s";

    if (roundState === "Open") msg = `Auction starting in ~${timeUntil}`;
    else if (roundState === "Auctioning")
      msg = `Auction ending in ~${timeUntil}`;
    else if (roundState === "Running") {
      msg = `Round settlement takes ~${timeUntil}`;
    } else msg = `Round settled ~${timeUntil}`;

    return msg;
  }, [timeEstimate, roundState, now, progressStart]);

  const progressEnd = Number(progressStart) + Number(timeEstimate);

  useEffect(() => {
    // Calculate progress percentage
    const elapsedTime = Number(now) - Number(progressStart);
    let percentage = (elapsedTime / timeEstimate) * 100;

    // Ensure progress stays between 0 and 100
    if (elapsedTime > timeEstimate) {
      percentage = 100;
    }

    // Set progress percentage
    setProgress(Math.min(Math.max(percentage, 0), 100));
  }, [progressStart, progressEnd, now, timeEstimate]);

  if (!isPanelOpen) return null;
  else
    return (
      <Hoverable
        dataId={`progressBar_${roundState}`}
        className="w-full flex flex-col items-left gap-2 p-2"
      >
        <div className="w-full flex flex-row justify-between">
          <div>{msg}</div>
          <StateTransitionTooltip msg={tooltipMsg}>
            Est.{" "}
            {timeUntilTarget(
              now.toString(),
              (Number(progressStart) + timeEstimate).toString(),
            )}
            <Info size={16} color="#CFC490" className="cursor-pointer" />
          </StateTransitionTooltip>
        </div>

        <div className="w-full bg-[#373632] rounded-full h-[10px] relative">
          <div
            className="bg-[#F5EBB8] h-[10px] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </Hoverable>
    );
};

export default ProgressBar;
