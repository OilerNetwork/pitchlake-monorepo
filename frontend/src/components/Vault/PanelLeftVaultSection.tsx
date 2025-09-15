"use client";
import React, { useMemo } from "react";
import { SafeIcon } from "@/components/Icons";
import { timeUntilTarget, shortenString } from "@/lib/utils";
import { formatEther } from "ethers";
import {
  ChevronUp,
  ChevronDown,
  SquareArrowOutUpRight,
  Info,
} from "lucide-react";
import { useExplorer } from "@starknet-react/core";
import Hoverable from "@/components/BaseComponents/Hoverable";
import { OptionRoundStateType, VaultStateType } from "@/lib/types";
import { BalanceTooltip } from "../BaseComponents/Tooltip";
import { TimelineTooltip } from "../BaseComponents/TimelineTooltip";

interface PanelLeftVaultSectionProps {
  vaultState: VaultStateType | undefined;
  selectedRoundState: OptionRoundStateType | undefined;
  isPanelOpen: boolean;
  openJustVaultTab: () => void;
  toggleVaultOpen: () => void;
  vaultIsOpen: boolean;
}

const PanelLeftVaultSection = ({
  vaultState,
  selectedRoundState,
  isPanelOpen,
  vaultIsOpen,
  openJustVaultTab,
  toggleVaultOpen,
}: PanelLeftVaultSectionProps) => {
  const explorer = useExplorer();

  const { roundTransitionDuration, auctionDuration, roundDuration } =
    useMemo(() => {
      if (
        selectedRoundState?.deploymentDate &&
        selectedRoundState?.auctionStartDate &&
        selectedRoundState?.auctionEndDate &&
        selectedRoundState?.optionSettleDate
      ) {
        const {
          deploymentDate,
          auctionStartDate,
          auctionEndDate,
          optionSettleDate,
        } = selectedRoundState;
        const roundTransitionDuration = timeUntilTarget(
          deploymentDate.toString(),
          auctionStartDate.toString(),
        );
        const auctionDuration = timeUntilTarget(
          auctionStartDate.toString(),
          auctionEndDate.toString(),
        );
        const roundDuration = timeUntilTarget(
          auctionEndDate.toString(),
          optionSettleDate.toString(),
        );

        if (
          roundTransitionDuration === "Now" ||
          auctionDuration === "Now" ||
          roundDuration === "Now"
        ) {
          return {
            roundTransitionDuration: "Loading...",
            auctionDuration: "Loading...",
            roundDuration: "Loading...",
          };
        }

        return { roundTransitionDuration, auctionDuration, roundDuration };
      } else {
        return {
          roundTransitionDuration: 0,
          auctionDuration: 0,
          roundDuration: 0,
        };
      }
    }, [
      selectedRoundState?.deploymentDate,
      selectedRoundState?.auctionStartDate,
      selectedRoundState?.auctionEndDate,
      selectedRoundState?.optionSettleDate,
    ]);

  return (
    <div
      className={`flex flex-col w-full px-3 border-t-[1px] border-greyscale-800`}
    >
      <div>
        <Hoverable
          onClick={isPanelOpen ? toggleVaultOpen : openJustVaultTab}
          className={`flex flex-row w-full mt-3 rounded-md p-3 ${
            isPanelOpen ? "justify-between bg-faded-black" : "justify-center"
          } cursor-pointer`}
          dataId="leftPanelVaultBar"
        >
          <div>
            <SafeIcon
              fill="none"
              stroke="var(--buttongrey)"
              classname="w-6 h-6 text-primary-800 hover-zoom"
            />
          </div>
          <div className={`${isPanelOpen ? "flex" : "hidden"} flex-row w-full`}>
            <div className="ml-2 text-white w-fit text-nowrap font-[] font-regular">
              Vault
            </div>
            <div className="flex flex-row-reverse w-full">
              {vaultIsOpen ? (
                <ChevronDown stroke="var(--buttonwhite)" />
              ) : (
                <ChevronUp stroke="var(--buttonwhite)" />
              )}
            </div>
          </div>
        </Hoverable>
        <div
          className={`flex flex-col mt-2 overflow-scroll no-scrollbar gap-1 ${
            isPanelOpen ? "" : "hidden"
          } ${
            !vaultIsOpen ? "h-[0]" : "h-[215px]"
          } transition-all duration-900ms `}
        >
          <Hoverable
            dataId="leftPanelVaultRunTime"
            className="flex flex-row justify-between p-2 w-full"
          >
            <p className="text-[#BFBFBF]">Run Time</p>
            <div className="flex flex-row items-center gap-1 overflow-visable">
              <TimelineTooltip
                roundTransitionDuration={roundTransitionDuration}
                auctionDuration={auctionDuration}
                roundDuration={roundDuration}
              >
                {
                  <>
                    <p>
                      {selectedRoundState?.auctionEndDate &&
                      selectedRoundState?.optionSettleDate &&
                      selectedRoundState.auctionEndDate !== "0" &&
                      selectedRoundState.optionSettleDate !== "0"
                        ? timeUntilTarget(
                            selectedRoundState.auctionEndDate.toString(),
                            selectedRoundState.optionSettleDate.toString(),
                          )
                        : "Loading..."}
                    </p>

                    <Info
                      size={16}
                      color="#CFC490"
                      className="cursor-pointer"
                    />
                  </>
                }
              </TimelineTooltip>
            </div>
          </Hoverable>

          <Hoverable
            dataId="leftPanelVaultAddress"
            className="flex flex-row justify-between p-2 w-full"
          >
            <p className="text-[#BFBFBF]">Address</p>
            <a
              href={explorer.contract(
                vaultState?.address ? vaultState.address : "",
              )}
              target="_blank"
              className="flex flex-row justify-center items-center text-[#F5EBB8] cursor-pointer gap-[4px]"
            >
              <p className="">
                {
                  vaultState?.address && vaultState?.address !== "0x"
                    ? shortenString(vaultState?.address)
                    : "Loading..."
                  //Add vault address short string from state here
                }
              </p>
              <SquareArrowOutUpRight size={16} />
            </a>
          </Hoverable>
          <Hoverable
            dataId="leftPanelVaultBalance"
            className="flex flex-row justify-between p-2 w-full"
          >
            <p className="text-[#BFBFBF] font-regular">Balance</p>
            <div className="flex flex-row items-center gap-1 overflow-visable">
              <BalanceTooltip
                balance={{
                  locked: vaultState
                    ? vaultState.lockedBalance.toString()
                    : "0",
                  unlocked: vaultState
                    ? vaultState.unlockedBalance.toString()
                    : "0",
                  stashed: vaultState
                    ? vaultState.stashedBalance.toString()
                    : "0",
                }}
              >
                {
                  <>
                    <p>
                      {vaultState
                        ? Number(
                            formatEther(
                              BigInt(vaultState.lockedBalance) +
                                BigInt(vaultState.unlockedBalance) +
                                BigInt(vaultState.stashedBalance),
                            ),
                          ).toFixed(2)
                        : 0}{" "}
                      ETH
                    </p>
                    <Info
                      size={16}
                      color="#CFC490"
                      className="cursor-pointer"
                    />
                  </>
                }
              </BalanceTooltip>
            </div>
          </Hoverable>
          <Hoverable
            dataId="leftPanelVaultStrike"
            className="flex flex-row justify-between p-2 w-full"
          >
            <p className="text-[#BFBFBF] font-regular">Strike Level</p>
            <p>{Number(vaultState?.strikeLevel) / 100}%</p>
          </Hoverable>
          <Hoverable
            dataId="leftPanelVaultFees"
            className="flex flex-row justify-between p-2 w-full"
          >
            <p className="text-[#BFBFBF] font-regular">Fees</p>
            <p>0%</p>
          </Hoverable>
        </div>
      </div>
    </div>
  );
};

export default PanelLeftVaultSection;
