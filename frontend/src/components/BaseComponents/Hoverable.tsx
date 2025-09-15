"use client";
import React, { useMemo, useRef, useCallback, forwardRef } from "react";
import { useHelpContext } from "@/context/HelpProvider";
import helpData from "@/lang/en/help.json";

interface HoverableProps {
  dataId?: string | null; // e.g. "item1"
  delay?: number; // e.g. 300 (milliseconds)
  lockDuration?: number; // e.g. 3000 (3 seconds)
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const Hoverable = forwardRef<HTMLDivElement, HoverableProps>(
  (
    {
      dataId,
      delay = 700,
      lockDuration = 3000, // after 3 seconds, we won't update
      children,
      className,
      onClick,
    },
    ref,
  ) => {
    const {
      setActiveDataId,
      activeDataId,
      isHelpBoxOpen,
      header,
      isHoveringHelpBox,
    } = useHelpContext();
    const hoverTimer = useRef<NodeJS.Timeout | null>(null);
    const lockTimer = useRef<NodeJS.Timeout | null>(null);
    const isLocked = useRef(false);

    const isActive = isHelpBoxOpen && dataId === activeDataId;

    // On mouse enter, start the 300ms timer
    const handleMouseEnter = useCallback(() => {
      if (isHoveringHelpBox || !dataId) {
        // If the user is reading the InfoBox, do NOT auto-update
        return;
      }
      // Clear any leftover timers
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      if (lockTimer.current) clearTimeout(lockTimer.current);
      isLocked.current = false;

      // Start the 300ms "activation" timer
      hoverTimer.current = setTimeout(() => {
        // If the user is still not inside the InfoBox, update content
        if (!isHoveringHelpBox) setActiveDataId(dataId);

        // Optionally "lock" the content for the next X ms
        lockTimer.current = setTimeout(() => {
          // After 3s of hovering, we no longer auto-update
          isLocked.current = true;
        }, lockDuration);
      }, delay);
    }, [dataId, delay, lockDuration, isHoveringHelpBox, setActiveDataId]);

    // On mouse leave, clear the timer if we haven't set content yet
    const handleMouseLeave = useCallback(() => {
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
      }
      if (lockTimer.current) {
        clearTimeout(lockTimer.current);
        lockTimer.current = null;
      }
      isLocked.current = false;
    }, []);

    return (
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-item={dataId}
        className={`${isActive ? "rounded-lg border-[1px] border-[#8C8C8C]" : "border-[1px] border-transparent"} ${className} `}
        onClick={() => {
          onClick && onClick();
          dataId && setActiveDataId(dataId);
        }}
        ref={ref}
        //key={key_}
      >
        {children}
      </div>
    );
  },
);

Hoverable.displayName = "Hoverable";

export default Hoverable;
