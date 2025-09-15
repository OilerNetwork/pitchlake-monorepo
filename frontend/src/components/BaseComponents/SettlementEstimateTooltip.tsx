import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Hoverable from "./Hoverable";

interface StateTransitionTooltipProps {
  msg: string;
  children: React.ReactNode;
}

const StateTransitionTooltip: React.FC<StateTransitionTooltipProps> = ({
  msg,
  children,
}) => {
  const [tooltipStyles, setTooltipStyles] = useState<React.CSSProperties>({});
  const [isHovered, setIsHovered] = useState(false);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isHovered && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      const tooltipHeight = 65;
      setTooltipStyles({
        position: "absolute",
        top: rect.top + window.scrollY - tooltipHeight, // Position above, accounting for triangle
        left: rect.right + window.scrollX + 4,
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
      {isHovered &&
        msg &&
        createPortal(
          <div
            style={tooltipStyles}
            className="relative text-white text-[14px] font-regular rounded-md border border-[#262626] bg-[#161616] shadow-sm p-4"
          >
            {/* Triangle */}
            <div className="absolute bottom-[-15px] right-[5px] ">
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
            <div>{msg}</div>
          </div>,
          document.body,
        )}
      {children}
    </div>
  );
};

export { StateTransitionTooltip };
