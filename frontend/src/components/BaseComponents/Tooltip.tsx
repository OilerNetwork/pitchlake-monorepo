import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { formatEther } from "ethers";
import Hoverable from "./Hoverable";
import { formatNumber } from "@/lib/utils";

interface BalanceTooltipProps {
  balance: {
    locked: string;
    unlocked: string;
    stashed: string;
  };
  children: React.ReactNode;
}

const BalanceTooltip: React.FC<BalanceTooltipProps> = ({
  balance,
  children,
}) => {
  const [tooltipStyles, setTooltipStyles] = useState<React.CSSProperties>({});
  const [isHovered, setIsHovered] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHovered && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setTooltipStyles({
        position: "absolute",
        top: rect.bottom + window.scrollY + 9, // Adjusted to account for triangle
        left: rect.right + window.scrollX + 8,
        transform: "translateX(-100%)",
        zIndex: 9999,
      });
    }
  }, [isHovered]);

  return (
    <div
      ref={iconRef}
      className="flex flex-row items-center gap-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {isHovered &&
        createPortal(
          <div
            style={tooltipStyles}
            className="relative text-white text-[14px] font-regular rounded-md border border-[#262626] bg-[#161616] shadow-sm w-[251px] h-[156px]"
          >
            {/* Triangle */}
            <div className=" absolute -top-3.5 right-2 rotate-180">
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <polygon
                  points="8,10 16,0 0,0"
                  fill="#161616"
                  stroke="#262626"
                  strokeWidth="1"
                />
              </svg>
            </div>
            {/* Tooltip Content */}
            <Hoverable dataId="leftPanelVaultBalance">
              <h2 className="text-sm p-3 border-b border-[#262626]">
                Balance Distribution
              </h2>
            </Hoverable>
            <div className="space-y-1">
              <Hoverable
                dataId="vaultLockedBalance"
                className="py-1 px-4 flex justify-between"
              >
                <span>Locked</span>
                <span>
                  {formatNumber(parseFloat(formatEther(balance.locked))) || "0"}{" "}
                  ETH
                </span>
              </Hoverable>
              <Hoverable
                dataId="vaultUnlockedBalance"
                className="py-1 px-4 flex justify-between"
              >
                <span>Unlocked</span>
                <span>
                  {formatNumber(parseFloat(formatEther(balance.unlocked))) ||
                    "0"}{" "}
                  ETH
                </span>
              </Hoverable>
              <Hoverable
                dataId="vaultStashedBalance"
                className="py-1 px-4 flex justify-between"
              >
                <span>Stashed</span>
                <span>
                  {formatNumber(parseFloat(formatEther(balance.stashed))) ||
                    "0"}{" "}
                  ETH
                </span>
              </Hoverable>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
//const BalanceTooltip: React.FC<BalanceTooltipProps> = ({
//  balance,
//  children,
//}) => {
//  const [isHovered, setIsHovered] = useState(false);
//  const iconRef = useRef<HTMLDivElement>(null);
//  const [tooltipPosition, setTooltipPosition] = useState<{
//    top: number;
//    left: number;
//  }>({ top: 0, left: 0 });
//  const [tooltipStyles, setTooltipStyles] = useState<React.CSSProperties>({});
//
//  useEffect(() => {
//    if (isHovered && iconRef.current) {
//      const rect = iconRef.current.getBoundingClientRect();
//      setTooltipStyles({
//        position: "absolute",
//        top: rect.bottom + window.scrollY + 8, // Position tooltip below the icon
//        left: rect.right + window.scrollX + 8,
//        transform: "translateX(-100%)", // Shift tooltip left by its full width
//        zIndex: 9999,
//      });
//    }
//  }, [isHovered]);
//  return (
//    <div
//      ref={iconRef}
//      className="flex flex-row items-center gap-1"
//      onMouseEnter={() => setIsHovered(true)}
//      onMouseLeave={() => setIsHovered(false)}
//    >
//      {children}
//      {isHovered &&
//        createPortal(
//          <div
//            style={tooltipStyles}
//            //style={{
//            //  position: "absolute",
//            //  top: tooltipPosition.top,
//            //  left: tooltipPosition.left,
//            //  zIndex: 49,
//            //}}
//            className="text-white text-[14px] font-regular rounded-md border border-[#262626] bg-[#161616] shadow-sm w-[251px] h-[156px]"
//          >
//            <h2 className="text-sm p-3 px-4 border-b border-[#262626]">
//              Balance Distribution
//            </h2>
//            <div className="space-y-2">
//              <div className="p-2 px-4 pb-0 flex justify-between">
//                <span>Locked</span>
//                <span>{balance.locked || "0"} ETH</span>
//              </div>
//              <div className="p-2  px-4 pb-0 flex justify-between">
//                <span>Unlocked</span>
//                <span>{balance.unlocked || "0"} ETH</span>
//              </div>
//              <div className="p-2 px-4  pb-0 flex justify-between">
//                <span>Stashed</span>
//                <span>{balance.stashed || "0"} ETH</span>
//              </div>
//            </div>
//          </div>,
//          document.body,
//        )}
//    </div>
//  );
//};
//const BalanceTooltip: React.FC<BalanceTooltipProps> = ({
//  balance,
//  children,
//}) => {
//  return (
//    <div className="relative group">
//      <div className="flex flex-row items-center gap-1">{children}</div>
//      <div className="absolute z-50 overflow-visable top-full mt-2 block group-hover:block text-white p-4 rounded-md border border-[#262626] border-1 bg-[#121212] shadow-sm">
//        <h2 className="text-sm mb-2 border-b border-[#262626]">
//          Balance Distribution
//        </h2>
//        <div className="space-y-2">
//          <div className="flex justify-between">
//            <span>Locked</span>
//            <span>{balance.locked || "0"} ETH</span>
//          </div>
//          <div className="flex justify-between">
//            <span>Unlocked</span>
//            <span> {balance.unlocked || "0"} ETH</span>
//          </div>
//          <div className="flex justify-between">
//            <span>Stashed</span>
//            <span>{balance.stashed || "0"} ETH</span>
//          </div>
//        </div>
//      </div>
//    </div>
//  );
//};

const Tooltip: React.FC<MessageProps> = ({ text, children }) => {
  return (
    <div className="tooltip-container relative group">
      {children}
      <div className="tooltip-content absolute bottom-full mb-2 hidden group-hover:block text-white p-2 rounded-md border border-[#262626] border-1 bg-[#121212] shadow-sm">
        {text}
      </div>
    </div>
  );
};

interface MessageProps {
  text: string;
  children: React.ReactNode;
}

export { Tooltip, BalanceTooltip };
