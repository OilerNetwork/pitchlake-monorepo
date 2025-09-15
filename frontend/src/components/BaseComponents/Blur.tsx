"use client";
import React from "react";
import { useUiContext } from "@/context/UiProvider";

const Blur: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isBlurOpen } = useUiContext();

  return (
    <>
      {children}
      {isBlurOpen && (
        <div className="fixed inset-0 bg-transparent backdrop-blur-sm pointer-events-none"></div>
      )}
    </>
  );
};

export { Blur };
