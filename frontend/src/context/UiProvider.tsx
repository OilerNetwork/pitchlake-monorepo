"use client";
import React, { createContext, useContext, useState, useEffect, useRef } from "react";

interface UiContextProps {
  isBlurOpen: boolean;
  setBlurOpen: (b: boolean) => void;
  toggleBlurOpen: () => void;
  isWalletLoginOpen: boolean;
  openWalletLogin: () => void;
  closeWalletLogin: () => void;
  walletLoginRef: React.RefObject<HTMLDivElement>;
  toggleWalletLogin: () => void;
}

const UiContext = createContext<UiContextProps | undefined>(undefined);

export const UiProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isBlurOpen, setIsBlurOpen] = useState<boolean>(false);
  const [isWalletLoginOpen, setIsWalletLoginOpen] = useState<boolean>(false);
  const walletLoginRef = useRef<HTMLDivElement>(null);

  const toggleBlurOpen = () => {
    setIsBlurOpen((prev) => !prev);
  };

  const setBlurOpen = (b: boolean) => {
    setIsBlurOpen(b);
  };

  const openWalletLogin = () => {
    setIsWalletLoginOpen(true);
    setIsBlurOpen(true);
  };

  const closeWalletLogin = () => {
    setIsWalletLoginOpen(false);
    setIsBlurOpen(false);
  };

  const toggleWalletLogin = () => {
 setIsWalletLoginOpen((prev) => !prev);
 setIsBlurOpen((prev) => !prev);
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isWalletLoginOpen &&
        walletLoginRef.current &&
        !walletLoginRef.current.contains(event.target as Node)
      ) {
        closeWalletLogin();
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (isWalletLoginOpen && event.key === "Escape") {
        closeWalletLogin();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [isWalletLoginOpen]);

  return (
    <UiContext.Provider
      value={{
        isBlurOpen,
        setBlurOpen,
        toggleBlurOpen,
        isWalletLoginOpen,
        openWalletLogin,
        closeWalletLogin,
        toggleWalletLogin,
        walletLoginRef,
      }}
    >
      {children}
    </UiContext.Provider>
  );
};

export const useUiContext = () => {
  const context = useContext(UiContext);
  if (!context) {
    throw new Error("useUiContext must be used within a UiProvider");
  }
  return context;
};
