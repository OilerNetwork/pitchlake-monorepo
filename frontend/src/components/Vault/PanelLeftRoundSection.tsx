"use client";
import React, { useMemo } from "react";
import { LayerStackIcon } from "@/components/Icons";
import {
  timeUntilTarget,
  formatNumberText,
  roundIdFormatter,
  getProfitAndLoss,
} from "@/lib/utils";
import { formatUnits } from "ethers";
import { ChevronUp, ChevronDown, SquareArrowOutUpRight } from "lucide-react";
import { Explorer, useExplorer } from "@starknet-react/core";
import Hoverable from "@/components/BaseComponents/Hoverable";
import { OptionRoundStateType } from "@/lib/types";

interface PanelLeftRoundSectionProps {
  conn: string;
  userType: string;
  selectedRoundState: OptionRoundStateType | undefined;
  isPanelOpen: boolean;
  openJustRoundTab: () => void;
  toggleRoundOpen: () => void;
  optionRoundIsOpen: boolean;
}

const PanelLeftRoundSection = ({
  conn,
  userType,
  selectedRoundState,
  isPanelOpen,
  openJustRoundTab,
  toggleRoundOpen,
  optionRoundIsOpen,
}: PanelLeftRoundSectionProps) => {
  const explorer = useExplorer();

  const stateStyles: any = {
    Open: {
      bg: "bg-[#214C0B80]",
      text: "text-[#6AB942]",
      border: "border-[#347912]",
    },
    Auctioning: {
      bg: "bg-[#45454580]",
      text: "text-[#FAFAFA]",
      border: "border-[#BFBFBF]",
    },
    Running: {
      bg: "bg-[#6D1D0D59]",
      text: "text-[#F78771]",
      border: "border-[#F78771]",
    },
    Settled: {
      bg: "bg-[#CC455E33]",
      text: "text-[#DA718C]",
      border: "border-[#CC455E]",
    },
    Loading: {
      bg: "bg-[#6D1D0D59]",
      text: "text-[#F78771]",
      border: "border-[#F78771]",
    },
    Default: {
      bg: "bg-[#CC455E33]",
      text: "text-[#CC455E]",
      border: "border-[#CC455E]",
    },
  };
  const roundState = selectedRoundState?.roundState || "Loading";
  const styles = stateStyles[roundState] || stateStyles.Default;

  const { cap } = useMemo(() => {
    if (
      !selectedRoundState ||
      !selectedRoundState.capLevel ||
      !selectedRoundState.strikePrice ||
      !selectedRoundState
    ) {
      return { cap: 0 };
    }

    const strike = Number(
      formatUnits(selectedRoundState.strikePrice.toString(), "gwei"),
    );
    const capLevel = Number(selectedRoundState.capLevel);
    const cap = strike + (capLevel * strike) / 10000;

    return { cap: cap.toFixed(2) };
  }, [selectedRoundState?.strikePrice, selectedRoundState?.capLevel]);

  const { lpPnL, obPnL } = useMemo(() => {
    return getProfitAndLoss(
      selectedRoundState?.premiums,
      selectedRoundState?.totalPayout,
      selectedRoundState?.optionsSold,
    );
  }, [
    selectedRoundState?.premiums,
    selectedRoundState?.totalPayout,
    selectedRoundState?.optionsSold,
  ]);

  return (
    <div className="align-center text-[14px] bg-black-alt border-greyscale-800 items-start w-full flex flex-col flex-grow h-full max-h-full">
      <div className="flex flex-col w-full px-3 border-t-[1px] border-greyscale-800">
        <Hoverable
          dataId="leftPanelRoundBar"
          onClick={isPanelOpen ? toggleRoundOpen : openJustRoundTab}
          className={`flex flex-row w-full mt-3 rounded-md p-3 ${
            isPanelOpen ? "justify-between bg-faded-black" : "justify-center"
          } cursor-pointer`}
        >
          <div>
            <LayerStackIcon
              classname="w-6 h-6 hover-zoom"
              fill="none"
              stroke="var(--buttongrey)"
            />
          </div>
          <div className={`${isPanelOpen ? "flex" : "hidden"} flex-row w-full`}>
            <div className="ml-2 text-white w-fit text-nowrap font-regular">
              Round
            </div>

            <div className="flex flex-row-reverse w-full">
              {optionRoundIsOpen ? (
                <ChevronDown stroke="var(--buttonwhite)" />
              ) : (
                <ChevronUp stroke="var(--buttonwhite)" />
              )}
            </div>
          </div>
        </Hoverable>
        <div
          className={`flex flex-col mt-2 overflow-scroll no-scrollbar ${
            isPanelOpen ? "" : "hidden"
          } ${
            !optionRoundIsOpen ? "h-0" : "h-[238px]"
          } transition-all duration-900 max-h-full`}
        >
          <Hoverable
            dataId="leftPanelRoundId"
            className="max-h-full flex flex-row justify-between items-center p-2 w-full"
          >
            <p className="text-[#BFBFBF]">Selected Round</p>
            {selectedRoundState?.address &&
            selectedRoundState?.roundId &&
            selectedRoundState.address !== "0x0" &&
            selectedRoundState.roundId !== "0" ? (
              <a
                href={explorer.contract(
                  selectedRoundState?.address ? selectedRoundState.address : "",
                )}
                target="_blank"
                className="flex flex-row justify-center items-center text-[#F5EBB8] cursor-pointer gap-[4px]"
              >
                <p>
                  {roundIdFormatter(
                    selectedRoundState.roundId.toString(),
                    conn,
                  )}
                </p>
                <SquareArrowOutUpRight className="size-[16px]" />
              </a>
            ) : (
              <a className="flex flex-row justify-center items-center text-[#F5EBB8] cursor-pointer gap-[4px]">
                <p>Loading... </p>
              </a>
            )}
          </Hoverable>
          <Hoverable
            dataId="leftPanelRoundState"
            className="max-h-full flex flex-row justify-between items-center p-2 w-full"
          >
            <p className="text-[#BFBFBF]">State</p>
            <p
              className={`border-[1px] ${styles.border} ${styles.bg} ${styles.text} font-medium rounded-full px-2 py-[1px]`}
            >
              {selectedRoundState?.roundState
                ? selectedRoundState.roundState
                : "Loading"}
            </p>
          </Hoverable>
          {selectedRoundState?.clearingPrice?.toString() !== "0" ? (
            <Hoverable
              dataId="leftPanelRoundClearingPrice"
              className="max-h-full flex flex-row justify-between items-center   p-2 w-full"
            >
              <p className="text-[#BFBFBF]">Premium</p>
              <p>
                {selectedRoundState?.clearingPrice &&
                  Number(
                    formatUnits(
                      selectedRoundState.clearingPrice.toString(),
                      "gwei",
                    ),
                  ).toFixed(2)}{" "}
                Gwei
              </p>
            </Hoverable>
          ) : (
            <Hoverable
              dataId="leftPanelRoundReservePrice"
              className="max-h-full flex flex-row justify-between items-center   p-2 w-full"
            >
              <p className="text-[#BFBFBF] font-regular text-[14px]">
                Premium (Min)
              </p>
              <p>
                {selectedRoundState?.reservePrice &&
                  Number(
                    formatUnits(
                      selectedRoundState.reservePrice.toString(),
                      "gwei",
                    ),
                  ).toFixed(2)}{" "}
                Gwei
              </p>
            </Hoverable>
          )}
          <Hoverable
            dataId="leftPanelRoundStrikePrice"
            className="max-h-full flex flex-row justify-between items-center p-2 w-full"
          >
            <p className="text-[#BFBFBF]">Strike</p>
            <p>
              {selectedRoundState?.strikePrice &&
              selectedRoundState.strikePrice !== "0"
                ? `${Number(
                    formatUnits(
                      selectedRoundState.strikePrice.toString(),
                      "gwei",
                    ),
                  ).toFixed(2)} Gwei`
                : "Loading..."}
            </p>
          </Hoverable>
          <Hoverable
            dataId="leftPanelRoundMaxPayout"
            className="max-h-full flex flex-row justify-between items-center   p-2 w-full"
          >
            <p className="text-[#BFBFBF]">Cap</p>
            <p>{cap ? `${cap} Gwei` : "Loading..."}</p>
          </Hoverable>
          {roundState == "Auctioning" && (
            <>
              <Hoverable
                dataId="leftPanelRoundTotalOptions"
                className="max-h-full flex flex-row justify-between items-center   p-2 w-full"
              >
                <p className="text-[#BFBFBF]">Options Available</p>
                <p>
                  {formatNumberText(
                    selectedRoundState
                      ? Number(selectedRoundState.availableOptions.toString())
                      : 0,
                  )}
                </p>
              </Hoverable>
            </>
          )}
          {(roundState === "Running" || roundState === "Settled") && (
            <>
              <Hoverable
                dataId="leftPanelRoundOptionsSold"
                className="max-h-full flex flex-row justify-between items-center   p-2 w-full"
              >
                <p className="text-[#BFBFBF]">Options Sold</p>
                <p>
                  {formatNumberText(
                    selectedRoundState
                      ? Number(selectedRoundState.optionsSold.toString())
                      : 0,
                  )}
                </p>
              </Hoverable>
            </>
          )}
          {roundState === "Settled" && (
            <Hoverable
              dataId="leftPanelPnL"
              className="max-h-full flex flex-row justify-between items-center   p-2 w-full"
            >
              <p className="text-[#BFBFBF]">P&L</p>
              <p>
                {selectedRoundState
                  ? userType === "lp"
                    ? lpPnL.toFixed(2)
                    : obPnL.toFixed(2)
                  : 0}{" "}
                Gwei
              </p>
            </Hoverable>
          )}
        </div>
      </div>
    </div>
  );
};

export default PanelLeftRoundSection;
