"use client";
import WrongNetworkScreen from "@/components/WrongNetworkScreen";
import MobileScreen from "@/components/BaseComponents/MobileScreen";
import VaultCard from "@/components/VaultCard/VaultCard";
import useWebSocketHome from "@/hooks/websocket/useWebSocketHome";
import useIsMobile from "@/hooks/window/useIsMobile";
import { useNetwork } from "@starknet-react/core";
import { useState, useEffect } from "react";

export const HomeView = () => {
  const { vaults: wsVaults } = useWebSocketHome();
  const { chain } = useNetwork();
  const [vaults, setVaults] = useState<string[] | undefined>(undefined);
  const [mode, setMode] = useState<string>("");
  

  useEffect(() => {
    if(process.env.NEXT_PUBLIC_ENVIRONMENT){  
    const environment = process.env.NEXT_PUBLIC_ENVIRONMENT;
    setMode(environment);
    }
  }, []);
  // Handle vault addresses after hydration to prevent mismatch
  useEffect(() => {
    
    if (mode === "demo") {
      setVaults(["0x0677ead18a571524525eb1d5fbb18431efe869f07d700f03aa66ad0abb5de01d"]);
    } else if (mode === "ws") {
      const wsVaultList = [
        "0x2e0f81a9f5179c2be73cabeb92e8a6e526add4bab32e4855aa5522690c78217",
        "0x7edaf2d262f347619f24eaa11cdc7ae125e373843d5248368887fea4aa8ee7d",
        "0x19809922504ef98d98a406d12b2a67205a10294d3bf38f047e40239ce04c949",
      ].filter((addr) => wsVaults?.includes(addr));
      setVaults(wsVaultList);
    } else {
      console.log("process.env", process.env.NEXT_PUBLIC_ENVIRONMENT, process.env.NEXT_PUBLIC_RPC_URL_DEVNET);
      console.log("process.env.NEXT_PUBLIC_VAULT_ADDRESSES", process.env.NEXT_PUBLIC_VAULT_ADDRESSES);
      setVaults(process.env.NEXT_PUBLIC_VAULT_ADDRESSES?.split(","));
    }
  }, [mode]);

  useEffect(() => {
    console.log("vaults123", vaults);
  }, [wsVaults]);

  const { isMobile } = useIsMobile();

  if (isMobile) return <MobileScreen />;

  // Don't render vaults until hydrated to prevent mismatch
  if (!mode) {
    return (
      <div className="flex flex-grow flex-col px-8 pt-[84px] py-4 w-full bg-faded-black-alt">
        <div className="flex items-center justify-center h-64">
          <div className="text-white-alt">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-grow flex-col px-8 pt-[84px] py-4 w-full bg-faded-black-alt">
      {
        //Disable mainnet
        chain.network !== "mainnet" && (
          <div>
            <p className="my-2 mt-4 text-base text-white-alt py-2 font-medium">
              Popular Vaults
            </p>
            <div className="grid grid-cols-2 w-full pt-2 gap-x-6 gap-y-6">
              {vaults?.map((vault: string, index: number) => (
                <VaultCard key={index} vaultAddress={vault} />
              ))}
            </div>
          </div>
        )
      }
      {chain.network === "mainnet" && <WrongNetworkScreen />}
    </div>
  );
};