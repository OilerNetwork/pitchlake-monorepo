"use client";
import RoundPerformanceChart from "./VaultChart/Chart";
import { useState } from "react";
import AuctionIcon from "../Icons/AuctionIcon";
import CoinStackedIcon from "../Icons/CoinStackedIcon";
import PanelRight from "./PanelRight";
import PanelLeft from "./PanelLeft";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import useIsMobile from "@/hooks/window/useIsMobile";
import MobileScreen from "../BaseComponents/MobileScreen";
import { useHelpContext } from "@/context/HelpProvider";
import { HelpBoxPanel } from "../HelpBoxComponents/HelpBoxPanel";
import Hoverable from "../BaseComponents/Hoverable";
import WrongNetworkScreen from "@/components/WrongNetworkScreen";
import { useNetwork } from "@starknet-react/core";
import { ChartProvider } from "@/context/ChartProvider";

export const Vault = () => {
  const [isProviderView, setIsProviderView] = useState(true);
  const { isMobile } = useIsMobile();
  const { isHelpBoxOpen } = useHelpContext();
  const { chain } = useNetwork();
  const router = useRouter();

  if (isMobile) {
    return <MobileScreen />;
  }

  if (chain.network === "mainnet") {
    return <WrongNetworkScreen />;
  }
  return (
    <div className="px-6 py-4 pt-[120px] bg-faded-black-alt flex-grow flex-box overflow-auto">
      <div className="flex flex-row-reverse text-primary">
        <div className="flex flex-row rounded-md border-[1px] border-greyscale-800 h-[44px] w-[220px]">
          <Hoverable
            dataId="userToggleLP"
            className={`user-toggle-lp provider-tab flex flex-row items-center justify-center m-[1px] hover:cursor-pointer px-4 py-1 rounded-md text-[14px] w-[115px] ${
              isProviderView ? "bg-[#373632]" : ""
            }`}
            onClick={() => {
              setIsProviderView(true);
            }}
          >
            <CoinStackedIcon
              classname="mr-2"
              stroke={isProviderView ? "var(--primary)" : "var(--greyscale)"}
            />
            <p
              className={`font-medium ${
                isProviderView ? "text-primary" : "text-greyscale"
              }`}
            >
              Provider
            </p>
          </Hoverable>
          <Hoverable
            dataId="userToggleOB"
            className={`user-toggle-ob buyer-tab flex flex-row items-center justify-center m-[1px] hover:cursor-pointer px-4 py-1 rounded-md text-[14px] w-[115px] ${
              !isProviderView ? "bg-[#373632]" : ""
            }`}
            onClick={() => {
              setIsProviderView(false);
            }}
          >
            <AuctionIcon
              classname="mr-2"
              fill={isProviderView ? "var(--greyscale)" : "var(--primary)"}
            />
            <p
              className={`font-medium ${
                !isProviderView ? "text-primary" : "text-greyscale"
              }`}
            >
              Buyer
            </p>
          </Hoverable>
        </div>

        <div className="flex flex-row items-center ml-[16px] mr-[auto] text-[16px] font-medium text-[#FAFAFA]">
          Vault Details
        </div>
        <Hoverable
          dataId="logo"
          className="vault-back-button back-button-container hover-zoom-small flex items-center justify-center"
        >
          <div
            onClick={() => {
              router.push("/");
            }}
            className="back-button flex items-center justify-center w-[44px] h-[44px] border border-[#262626] rounded-lg cursor-pointer"
          >
            <ChevronLeft className="w-[16px] h-[16px] stroke-[#F5EBB8]" />
          </div>
        </Hoverable>
      </div>
      <div className="mt-6 flex flex-row">
        <PanelLeft userType={isProviderView ? "lp" : "ob"} />
        <ChartProvider>
          <RoundPerformanceChart />
        </ChartProvider>

        <div className="w-full ml-6 max-w-[350px] flex flex-col max-h-[834px]">
          <div
            className={`
              bg-[#121212] border border-[#262626] rounded-lg flex flex-col
              ${isHelpBoxOpen ? "h-[60%]" : "h-[100%]"} transition-all duration-300
            `}
          >
            <PanelRight userType={isProviderView ? "lp" : "ob"} />
          </div>
          {isHelpBoxOpen && (
            <div className="mt-6">
              <HelpBoxPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
