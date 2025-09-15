import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { formatEther } from "ethers";
import Hoverable from "./Hoverable";
import { formatNumber } from "@/lib/utils";

interface TimelineTooltipProps {
  roundTransitionDuration: string | number;
  auctionDuration: string | number;
  roundDuration: string | number;
  children: React.ReactNode;
}

const TimelineTooltip: React.FC<TimelineTooltipProps> = ({
  roundTransitionDuration,
  auctionDuration,
  roundDuration,
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
            <Hoverable dataId="leftPanelVaultSchedule">
              <h2 className="text-sm p-3 border-b border-[#262626]">
                Vault Schedule
              </h2>
            </Hoverable>
            <div className="space-y-1">
              <Hoverable
                dataId="vaultTransitionDuration"
                className="py-1 px-4 flex justify-between"
              >
                <span>Open</span>
                <span>{roundTransitionDuration}</span>
              </Hoverable>
              <Hoverable
                dataId="vaultAuctionDuration"
                className="py-1 px-4 flex justify-between"
              >
                <span>Auctioning</span>
                <span>{auctionDuration}</span>
              </Hoverable>
              <Hoverable
                dataId="vaultRoundDuration"
                className="py-1 px-4 flex justify-between"
              >
                <span>Running</span>
                <span>{roundDuration}</span>
              </Hoverable>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export { TimelineTooltip };
