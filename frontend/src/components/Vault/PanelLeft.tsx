"use client";
import React, { useState } from "react";
import StateTransitionConfirmationModal from "@/components/Vault/Utils/StateTransitionConfirmationModal";
import { PanelLeft as IconPanelLeft } from "lucide-react";
import Hoverable from "@/components/BaseComponents/Hoverable";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";
import { useNewContext } from "@/context/NewProvider";
import PanelLeftRoundSection from "@/components/Vault/PanelLeftRoundSection";
import PanelLeftVaultSection from "./PanelLeftVaultSection";
import StateTransition from "./StateTransition/StateTransition";

const PanelLeft = ({ userType }: { userType: string }) => {
  const { conn } = useNewContext();
  const { vaultState, selectedRoundAddress } = useVaultState();
  const selectedRoundState = useRoundState(selectedRoundAddress);
  const [vaultIsOpen, setVaultIsOpen] = useState<boolean>(false);
  const [optionRoundIsOpen, setOptionRoundIsOpen] = useState<boolean>(false);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [modalState, setModalState] = useState<{
    show: boolean;
    action: string;
    onConfirm: () => Promise<void>;
  }>({
    show: false,
    action: "",
    onConfirm: async () => {},
  });

  const hideModal = () => {
    setModalState({
      show: false,
      action: "",
      onConfirm: async () => {},
    });
  };

  const handleConfirm = async () => {
    await modalState.onConfirm();
  };

  const toggleVaultOpen = () => {
    setVaultIsOpen(!vaultIsOpen);
  };

  const toggleOptionRoundOpen = () => {
    setOptionRoundIsOpen(!optionRoundIsOpen);
  };

  const openAllTabs = () => {
    setIsPanelOpen(true);
    setVaultIsOpen(true);
    setOptionRoundIsOpen(true);
  };
  const closeAllTabs = () => {
    setIsPanelOpen(false);
    setVaultIsOpen(false);
    setOptionRoundIsOpen(false);
  };

  const openJustVaultTab = () => {
    setIsPanelOpen(true);
    setVaultIsOpen(true);
    setOptionRoundIsOpen(false);
  };
  const openJustRoundTab = () => {
    setIsPanelOpen(true);
    setVaultIsOpen(false);
    setOptionRoundIsOpen(true);
  };

  return (
    <>
      <div
        className={`flex flex-col mr-4 max-w-[350px] transition-all duration-300 max-h-[800px] overflow-hidden ${
          isPanelOpen ? "w-full" : "w-[110px]"
        } ${!isPanelOpen ? "" : ""}`}
      >
        <div className="align-center text-[14px] bg-black-alt border-[1px] border-greyscale-800 items-start rounded-lg w-full flex flex-col flex-grow h-full max-h-full">
          <Hoverable
            dataId="leftPanelStatisticsBar"
            onClick={() => {
              isPanelOpen ? closeAllTabs() : openAllTabs();
            }}
            className="flex items-center h-[56px] w-full border-b-1 p-4 cursor-pointer"
          >
            <div
              className={`flex flex-row w-full items-center rounded-md hover:cursor-pointer ${
                isPanelOpen ? "justify-between" : "justify-center"
              }`}
            >
              <p
                className={`${
                  isPanelOpen ? "flex" : "hidden"
                } font-medium flex items-center`}
              >
                Statistics
              </p>
              <div className="w-[20px] h-[20px]">
                <IconPanelLeft
                  className="w-[20px] h-[20px] stroke-[1px] hover-zoom"
                  stroke="var(--buttonwhite)"
                />
              </div>
            </div>
          </Hoverable>

          <PanelLeftVaultSection
            vaultState={vaultState}
            selectedRoundState={selectedRoundState}
            isPanelOpen={isPanelOpen}
            toggleVaultOpen={toggleVaultOpen}
            openJustVaultTab={openJustVaultTab}
            vaultIsOpen={vaultIsOpen}
          />

          <PanelLeftRoundSection
            conn={conn}
            isPanelOpen={isPanelOpen}
            toggleRoundOpen={toggleOptionRoundOpen}
            openJustRoundTab={openJustRoundTab}
            optionRoundIsOpen={optionRoundIsOpen}
            selectedRoundState={selectedRoundState}
            userType={userType}
          />

          <StateTransition
            conn={conn}
            vaultState={vaultState}
            selectedRoundState={selectedRoundState}
            isPanelOpen={isPanelOpen}
            setModalState={setModalState}
          />
        </div>
      </div>

      {modalState.show && (
        <StateTransitionConfirmationModal
          action={modalState.action}
          onConfirm={handleConfirm}
          onClose={hideModal}
        />
      )}
    </>
  );
};

export default PanelLeft;
