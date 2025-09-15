import React, { useState, useEffect, useRef } from "react";
import classNames from "classnames";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
} from "@/components/Icons";
import { History } from "lucide-react";
import GasPriceChart from "@/components/Vault/VaultChart/ChartInner";
import Hoverable from "@/components/BaseComponents/Hoverable";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import { useNewContext } from "@/context/NewProvider";
import { useChartContext } from "@/context/ChartProvider";
import { getDemoRoundId } from "@/lib/demo/utils";

const RoundPerformanceChart = () => {
  // Protocol context
  const { conn, selectedRound, setSelectedRound } = useNewContext();
  const { vaultState } = useVaultState();
  // Chart context
  const { isExpandedView, setIsExpandedView } = useChartContext();

  // Chart toggles
  const [activeLines, setActiveLines] = useState<{ [key: string]: boolean }>({
    TWAP: true,
    BASEFEE: true,
    STRIKE: true,
    CAP_LEVEL: true,
  });

  const toggleLine = (line: string) => {
    setActiveLines((prev) => ({ ...prev, [line]: !prev[line] }));
  };

  // Round selector dropdown and updators
  const [roundNavIsOpen, setRoundNavIsOpen] = useState(false);

  const decrementRound = () => {
    if (selectedRound > 1) {
      setSelectedRound(selectedRound - 1);
    }
  };

  const incrementRound = () => {
    if (
      vaultState?.currentRoundId &&
      selectedRound < Number(vaultState.currentRoundId)
    ) {
      setSelectedRound(selectedRound + 1);
    }
  };

  // Refs
  const headerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Set initial selectedRound
  useEffect(() => {
    if (!selectedRound && vaultState?.currentRoundId) {
      setSelectedRound(Number(vaultState.currentRoundId));
    }
  }, [selectedRound]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        headerRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setRoundNavIsOpen(false);
      }
    };

    if (roundNavIsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [roundNavIsOpen]);

  const roundHeaderFormatter = (
    selectedRound: string | undefined,
    currentRoundId: string | undefined,
    conn: string,
  ): string => {
    if (!selectedRound || !currentRoundId) return "";

    let str: string = `Round `;

    if (conn === "demo")
      str += `${getDemoRoundId(Number(selectedRound))} (${selectedRound})`;
    else str += selectedRound;

    if (selectedRound === currentRoundId) {
      str += " (Live)";
    }

    return str;
  };

  return (
    <div className="w-full h-[800px] bg-black-alt rounded-[12px] border border-greyscale-800 relative">
      {/* Round Navigation */}
      <div className="flex flex-row items-center p-5 justify-between border-b-[1px] border-greyscale-800 pb-4 h-[56px]">
        <Hoverable
          dataId="chartRoundSelector"
          ref={headerRef}
          onClick={() => setRoundNavIsOpen(!roundNavIsOpen)}
          className="p-2 cursor-pointer font-medium text-[14px] text-primary flex flex-row items-center"
        >
          <p className="flex flex-row items-center">
            {roundHeaderFormatter(
              selectedRound.toString(),
              vaultState?.currentRoundId.toString(),
              conn,
            )}
          </p>
          <div className="flex items-center ">
            {!roundNavIsOpen ? (
              <ArrowDownIcon
                stroke="var(--primary)"
                classname="flex items-center ml-2 w-4 h-4"
              />
            ) : (
              <ArrowUpIcon stroke="var(--primary)" classname="ml-2 w-4 h-4" />
            )}
          </div>
        </Hoverable>
        <div className="flex flex-row items-center gap-0">
          <Hoverable
            dataId="chartPreviousRound"
            onClick={decrementRound}
            className="p-2 previous-next-round"
          >
            <ArrowLeftIcon
              stroke={
                !selectedRound || selectedRound === 1
                  ? "var(--greyscale)"
                  : "var(--primary)"
              }
              classname={`${
                !selectedRound || selectedRound === 1
                  ? ""
                  : "hover:cursor-pointer hover-zoom"
              } w-[15px] h-[15px] mr-2 ${
                !selectedRound || selectedRound === 1
                  ? "hover:cursor-default"
                  : ""
              } `}
            />
          </Hoverable>
          <Hoverable
            dataId="chartNextRound"
            onClick={incrementRound}
            className="p-2 chart-next-round"
          >
            <ArrowRightIcon
              stroke={
                !selectedRound ||
                !vaultState?.currentRoundId ||
                selectedRound === Number(vaultState.currentRoundId)
                  ? "var(--greyscale)"
                  : "var(--primary)"
              }
              classname={`${
                !selectedRound ||
                !vaultState?.currentRoundId ||
                selectedRound === Number(vaultState.currentRoundId)
                  ? ""
                  : "hover:cursor-pointer hover-zoom"
              } w-[15px] h-[15px] ml-2 ${
                !selectedRound ||
                !vaultState?.currentRoundId ||
                selectedRound === Number(vaultState.currentRoundId)
                  ? "hover:cursor-default"
                  : ""
              }`}
            />
          </Hoverable>
          <Hoverable
            dataId="chartHistory"
            onClick={() => setIsExpandedView(!isExpandedView)}
            className="p-2 chart-history-button"
          >
            <History
              className={classNames(
                "w-5 h-5 cursor-pointer",
                isExpandedView ? "text-primary" : "text-greyscale",
              )}
            />
          </Hoverable>
        </div>
      </div>

      {/* Dropdown */}
      {roundNavIsOpen && (
        <div
          ref={dropdownRef}
          tabIndex={-1}
          className="custom-scrollbar absolute top-[61px] left-1 right-0 bg-[#161616] pt-2 z-10 border border-[#262626] rounded-lg w-[200px] max-h-[244px] overflow-scroll"
        >
          {[
            ...Array(
              vaultState?.currentRoundId
                ? Number(vaultState.currentRoundId)
                : 1,
            ),
          ]
            .map((_, index) => index)
            .reverse()
            .map((index) => (
              <div
                key={index}
                className={`flex flex-row justify-between items-center px-4 pt-3 pb-3 hover:bg-greyscale-800 cursor-pointer font-regular text-[14px] text-[#FFFFFF] ${
                  index + 1 === Number(vaultState?.currentRoundId)
                    ? "bg-greyscale-800"
                    : ""
                }`}
                onClick={() => {
                  setSelectedRound(index + 1);
                  setRoundNavIsOpen(false);
                }}
              >
                {`Round ${index + 1}${conn === "demo" ? ` (${getDemoRoundId(index + 1)})` : ""}`}
                {index + 1 === Number(vaultState?.currentRoundId)
                  ? " (Live)"
                  : ""}
                {index + 1 === selectedRound && (
                  <CheckIcon stroke="#ffffff" fill="none" />
                )}
              </div>
            ))}
        </div>
      )}

      {/* Line Toggle Buttons */}
      <div className="flex justify-center items-center my-2">
        <div className="flex gap-4">
          {["TWAP", "BASEFEE", "STRIKE", "CAP_LEVEL"].map((line) => (
            <Hoverable
              key={line}
              dataId={`chartLineButton_${line}`}
              className="p-2"
            >
              <button
                className={`hover-zoom-small flex flex-row items-center font-regular text-[12px]
                   ${
                     line === "CAP_LEVEL"
                       ? "text-success"
                       : line === "BASEFEE"
                         ? "text-greyscale"
                         : line === "STRIKE"
                           ? "text-warning-300"
                           : "text-error-300"
                   }`}
                onClick={() => toggleLine(line)}
              >
                {line === "CAP_LEVEL" ? "CAP LEVEL" : line}
                {activeLines[line] ? (
                  <EyeIcon className="w-4 h-4 ml-2 mr-3" />
                ) : (
                  <EyeOffIcon className="w-4 h-4 ml-2 mr-3" />
                )}
              </button>
            </Hoverable>
          ))}
        </div>
      </div>

      {/* Chart */}
      <GasPriceChart activeLines={activeLines} />
    </div>
  );
};

export default RoundPerformanceChart;
