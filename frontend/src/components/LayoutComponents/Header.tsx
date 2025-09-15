"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { ChevronDownIcon, XIcon } from "lucide-react";
import { CheckIcon, GlobeIcon } from "@/components/Icons";
import logo_full from "@/../public/logo_full.svg";
import braavosIcon from "@/../public/braavos.svg";
import argent from "@/../public/argent.svg";
import keplr from "@/../public/keplr.svg";
import avatar from "@/../public/avatar.svg";
import { toast } from "react-toastify";
import { useNetwork } from "@starknet-react/core";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import ProfileDropdown from "../BaseComponents/ProfileDropdown";
import { useRouter, usePathname } from "next/navigation";
import { constants } from "starknet";
import { formatEther } from "ethers";
import useErc20Balance from "@/hooks/erc20/useErc20Balance";
import { LoginIcon } from "../Icons";
import useIsMobile from "@/hooks/window/useIsMobile";
import { Chain } from "@starknet-react/chains";
import { useHelpContext } from "@/context/HelpProvider";
import QuestionCircleIcon from "../Icons/QuestionCircleIcon";
import Hoverable from "../BaseComponents/Hoverable";
import { useUiContext } from "@/context/UiProvider";
import { formatNumber } from "@/lib/utils";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useLPState from "@/hooks/vault_v2/states/useLPState";
import { useNewContext } from "@/context/NewProvider";
import { useTimeContext } from "@/context/TimeProvider";

export default function Header() {
  const dropdownChainRef = useRef<HTMLDivElement>(null);
  const { conn } = useNewContext();
  const { timestamp, mockTimeForward } = useTimeContext();
  const lpState = useLPState();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDropdownChainOpen, setIsDropdownChainOpen] = useState(false);
  const isDropdownChainOpenRef = useRef(isDropdownChainOpen);
  const { isMobile } = useIsMobile();
  const { isHelpBoxOpen, toggleHelpBoxOpen } = useHelpContext();
  const {
    isWalletLoginOpen,
    closeWalletLogin,
    walletLoginRef,
    toggleWalletLogin,
  } = useUiContext();
  const router = useRouter();
  const pathName = usePathname();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { chains, chain } = useNetwork();
  const { account } = useAccount();
  const { balance } = useErc20Balance(
    "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
  );

  const balanceData = useMemo(() => {
    let wallet = "0";
    let locked = "0";
    let unlocked = "0";
    let stashed = "0";

    const _default: any = {
      wallet,
      locked,
      unlocked,
      stashed,
    };

    if (!lpState) return _default;
    const { lockedBalance, unlockedBalance, stashedBalance } = lpState;

    if (balance)
      wallet = formatNumber(
        parseFloat(formatEther(BigInt(balance).toString())),
      );
    if (lockedBalance)
      locked = formatNumber(
        parseFloat(formatEther(BigInt(lpState.lockedBalance).toString())),
      );
    if (unlockedBalance)
      unlocked = formatNumber(
        parseFloat(formatEther(BigInt(lpState.unlockedBalance).toString())),
      );
    if (stashedBalance)
      stashed = formatNumber(
        parseFloat(formatEther(BigInt(lpState.stashedBalance).toString())),
      );

    return { wallet, locked, unlocked, stashed };
  }, [
    balance,
    lpState?.lockedBalance,
    lpState?.unlockedBalance,
    lpState?.stashedBalance,
  ]);

  useEffect(() => {
    isDropdownChainOpenRef.current = isDropdownChainOpen;
  }, [isDropdownChainOpen]);

  const handleSwitchChain = async (chainId: string) => {
    let chain: string | undefined = undefined;
    switch (chainId) {
      case "sepolia":
        chain = constants.StarknetChainId.SN_SEPOLIA;
        break;
      case "mainnet":
        chain = constants.StarknetChainId.SN_MAIN;
        break;
      case "juno":
        chain = "0x534e5f4a554e4f5f53455155454e434552";
    }
    if (!chain) {
      return Error("Chain not found");
    }
    return;
  };
  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast("Copied to clipboard", { type: "success" });
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  const shortenString = (str: string) => {
    return str ? `${str.slice(0, 6)}...${str.slice(-4)}` : "";
  };

  return (
    !isMobile && (
      <nav className="absolute top-0 z-50 w-full h-[84px] bg-[#121212] px-8 py-6 flex justify-between items-center border-b border-[#262626]">
        <Hoverable dataId="logo" className="flex-shrink-0 px-2">
          <Image
            onClick={() => {
              router.push("/");
            }}
            src={logo_full}
            alt="Pitchlake logo"
            width={200}
            height={100}
            className="cursor-pointer h-8 sm:h-10 md:h-12 lg:h-14"
            style={{ objectFit: "contain" }}
          />
        </Hoverable>

        <div className="flex items-center space-x-4 text-[14px] font-medium">
          {conn === "mock" && (
            <div>
              <p>{timestamp.toString()}</p>
              <button onClick={() => mockTimeForward()}>
                Forward Mock Time
              </button>
            </div>
          )}
          <Hoverable
            dataId="networkSelector"
            className="relative"
            ref={dropdownChainRef}
          >
            {
              <button
                className="w-[150px] h-[44px] flex flex-row min-w-16 border-[1px] border-[#454545] text-sm px-2 text-white py-3 rounded-md items-center"
                onClick={() => {
                  setIsDropdownChainOpen(true);
                }}
                disabled
              >
                <GlobeIcon fill="none" />
                <p className="pl-[0.5rem]">{`${chain.network.charAt(0).toUpperCase() + chain.network.slice(1)}`}</p>
              </button>
            }

            {isDropdownChainOpen && (
              <div className="absolute left-0 mt-[0.5rem] rounded-md border-[#262626] border-[1px] bg-[#161616] w-[167px] h-[196px] text-left text-primary-400 text-sm flex flex-col justify-center">
                {chains.map((c: Chain, index: number) => {
                  return (
                    <div
                      key={index}
                      onClick={() => {
                        handleSwitchChain(chain.network);
                      }}
                      className={`p-2 flex flex-row  ${chain.network === c.network ? "bg-[#262626]" : ""} ${c.network === "mainnet" ? "" : "hover:bg-[#262626]"}`}
                    >
                      <div
                        className={`px-2 py-1 cursor-pointer sticky w-full text-[14px] text-[#FFFFFF] font-normal text-nowrap ${
                          c.network === "mainnet" ? "text-greyscale-500" : ""
                        }`}
                      >
                        {`${c.network.charAt(0).toUpperCase() + c.network.slice(1)}${c.network === "mainnet" ? " (Disabled)" : ""}`}
                      </div>
                      {chain.network === c.network && (
                        <div className="px-2 flex flex-row items-center justify-center">
                          <CheckIcon stroke="#ffffff" fill="none" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Hoverable>
          {!isMobile && pathName?.includes("vault") && (
            <div className="relative">
              <button
                onClick={toggleHelpBoxOpen}
                className={`w-[44px] h-[44px] border rounded-md text-primary-400 flex flex-row items-center justify-center ${isHelpBoxOpen ? "border-[#454545] bg-[#1A1A16]" : "border-[#262626]"}`}
              >
                {<QuestionCircleIcon classname="" stroke="#F5EBB8" />}
              </button>
            </div>
          )}
          <div className="relative" ref={walletLoginRef}>
            {account ? (
              <Hoverable dataId="accountDropdown">
                <button
                  onClick={() => {
                    setIsDropdownOpen(!isDropdownOpen);
                  }}
                  className="flex items-center space-x-2 py-2 px-3 rounded-md border border-greyscale-800 w-[164px] h-[44px]"
                >
                  <Image
                    src={avatar}
                    alt="User avatar"
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <span className="text-white font-medium">
                    {shortenString(account.address)}
                  </span>

                  <ChevronDownIcon className="h-4 w-4 text-white" />
                </button>

                {isDropdownOpen && (
                  <>
                    <ProfileDropdown
                      account={account}
                      balance={balanceData}
                      disconnect={() => {
                        disconnect();
                      }}
                      copyToClipboard={copyToClipboard}
                    />
                  </>
                )}
              </Hoverable>
            ) : (
              <Hoverable dataId="loginButton">
                <button
                  className={`flex flex-row min-w-16 bg-primary-400 text-black text-sm px-8 py-4 rounded-md w-[123px] h-[44px] items-center justify-center ${isWalletLoginOpen ? "border-[2px] border-[#ADA478]" : ""}`}
                  onClick={toggleWalletLogin}
                >
                  <p>Connect</p>
                  <div>
                    <LoginIcon
                      classname="h-4 w-4 ml-1 text-[var(--buttongrey)]"
                      stroke="#111111"
                      fill="none"
                    />
                  </div>
                </button>

                {isWalletLoginOpen && (
                  <div className="absolute right-0 h-[148px] w-[196px] text-sm flex flex-col mt-3 ">
                    <div className="bg-[#161616] rounded-md">
                      <div className="flex flex-row items-center px-4 py-2 font-regular text-[12px] border border-transparent border-b-[#454545] text-[#BFBFBF]">
                        CHOOSE A WALLET
                        <XIcon
                          className="ml-auto cursor-pointer"
                          color="#FAFAFA"
                          onClick={closeWalletLogin}
                        />
                      </div>
                      {connectors.map((connector) => (
                        <div
                          key={connector.id}
                          onClick={() => {
                            connect({ connector });
                            closeWalletLogin();
                          }}
                          className="cursor-pointer sticky p-2 px-3 bg-[#161616] w-full text-[#FAFAFA] text-[14px] font-medium hover:bg-[#262626]"
                        >
                          {
                            <div className="flex flex-row items-center">
                              <Image
                                src={
                                  connector.id === "braavos"
                                    ? braavosIcon
                                    : connector.id === "keplr"
                                      ? keplr
                                      : argent
                                }
                                alt="Login"
                                width={20}
                                height={30}
                                className="m-2 pr-1"
                                color="#BFBFBF"
                                style={{ objectFit: "contain" }}
                              />
                              {connector.id.toLocaleUpperCase()}
                            </div>
                          }
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Hoverable>
            )}
          </div>
        </div>
      </nav>
    )
  );
}
