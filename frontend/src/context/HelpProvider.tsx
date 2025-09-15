"use client";
import React, { createContext, useContext, useMemo, useState } from "react";
import helpData from "@/lang/en/help.json";

interface HelpContextProps {
  isHelpBoxOpen: boolean;
  toggleHelpBoxOpen: () => void;

  activeDataId: string | null;
  content: string | null;
  header: string | null;

  isHoveringHelpBox: boolean;
  setIsHoveringHelpBox: (val: boolean) => void;
  setActiveDataId: (dataId: string | null) => void;
}

type ContentAndHeader = {
  content: string | null;
  header: string | null;
};

const HelpContext = createContext<HelpContextProps | undefined>(undefined);

export const HelpProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isHelpBoxOpen, setIsHelpBoxOpen] = useState(false);
  const [activeDataId, _setActiveDataId] = useState<string | null>(null);
  const [isHoveringHelpBox, setIsHoveringHelpBox] = useState(false);

  const toggleHelpBoxOpen = () => {
    setIsHelpBoxOpen((prev) => !prev);
    _setActiveDataId(null);
  };

  const setActiveDataId = (dataId: string | null) => {
    if (dataId) _setActiveDataId(dataId);
  };

  const { content, header }: ContentAndHeader = useMemo(() => {
    if (!activeDataId) return { content: null, header: null };

    return {
      content:
        helpData[activeDataId as keyof typeof helpData]?.text ||
        "No description available for " + activeDataId,
      header:
        helpData[activeDataId as keyof typeof helpData]?.header ||
        "No header available for " + activeDataId,
    };
  }, [activeDataId]);

  return (
    <HelpContext.Provider
      value={{
        isHelpBoxOpen,
        toggleHelpBoxOpen,
        isHoveringHelpBox,
        setIsHoveringHelpBox,
        activeDataId,
        setActiveDataId,
        content,
        header,
      }}
    >
      {children}
    </HelpContext.Provider>
  );
};

export const useHelpContext = () => {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error("useHelpContext must be used within a HelpProvider");
  }
  return context;
};
