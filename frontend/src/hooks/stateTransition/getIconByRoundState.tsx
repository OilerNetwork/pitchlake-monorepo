import React from "react";
import { Clock, Cog } from "lucide-react";
import {
  LineChartDownIcon,
  LineChartUpIcon,
  BriefCaseIcon,
} from "@/components/Icons";

export const getIconByRoundState = (
  roundState: string,
  isDisabled: boolean,
  isPanelOpen: boolean,
) => {
  const stroke = isDisabled ? "var(--greyscale)" : "var(--primary)";

  const cName: string = `w-4 h-4 ${isPanelOpen ? "ml-2" : ""} min-h-[18px] min-w-[18px]`;

  if (roundState === "Pending" || isDisabled)
    return <Clock className={cName} />;
  if (roundState === "Open")
    return <LineChartUpIcon classname={cName} stroke={stroke} />;
  if (roundState === "Auctioning")
    return <LineChartDownIcon classname={cName} stroke={stroke} />;
  if (roundState === "FossilReady")
    return <Cog className={cName} stroke={stroke} />;
  if (roundState === "Running")
    return (
      <BriefCaseIcon classname={cName} fill="transparent" stroke={stroke} />
    );
  return null;
};
