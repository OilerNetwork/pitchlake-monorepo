import React, { ReactNode, useState, useEffect, ReactElement } from "react";
import Tabs from "./VaultActions/Tabs/Tabs";
import { useTabContent } from "@/hooks/vault/useTabContent";
import ConfirmationModal from "@/components/Vault/Utils/ConfirmationModal";
import { useTransactionContext } from "@/context/TransactionProvider";
import { HourglassIcon } from "@/components/Icons";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";
import LoadingSpinner from "@/components/Vault/Utils/LoadingSpinner";
import TxnSuccess from "@/components/Vault/Utils/TxnSuccess";
import TxnFailure from "@/components/Vault/Utils/TxnFailure";

interface RightPanelProps {
  userType: string;
}

interface TabContentProps {
  showConfirmation: (
    amount: string,
    action: string,
    onConfirm: () => Promise<void>,
  ) => void;
  setIsShowingTabs: (value: boolean) => void;
}

const PanelRight: React.FC<RightPanelProps> = ({ userType }) => {
  const { pendingTx, modalState, setModalState, statusModalProps } =
    useTransactionContext();
  const { selectedRoundAddress } = useVaultState();
  const selectedRoundState = useRoundState(selectedRoundAddress);

  const [activeTab, setActiveTab] = useState<string>("");
  const [isShowingTabs, setIsShowingTabs] = useState<boolean>(true);

  const { tabs, tabContent } = useTabContent(
    userType,
    activeTab,
    selectedRoundState,
  );

  useEffect(() => {
    if (tabs.length === 0) {
    } else if (activeTab === "") {
      setActiveTab(tabs[0]);
    } else if (!tabs.includes(activeTab)) {
      setActiveTab(tabs[0]);
    }
  }, [tabs, activeTab, selectedRoundState?.roundState]);

  const showConfirmation = (
    modalHeader: string,
    action: ReactNode,
    onConfirm: () => Promise<void>,
  ) => {
    setModalState({
      show: true,
      type: "confirmation",
      modalHeader,
      action,
      onConfirm,
    });
  };

  const hideModal = () => {
    setModalState({
      show: false,
      type: "confirmation",
      modalHeader: "",
      action: "",
      onConfirm: async () => {},
    });
  };

  const handleConfirm = async () => {
    await modalState.onConfirm();
    setModalState((prev) => ({ ...prev, type: "pending" }));
  };

  const renderTabContent = () => {
    if (!tabContent) {
      return null;
    }
    return React.isValidElement(tabContent)
      ? React.cloneElement(tabContent as ReactElement<TabContentProps>, {
          showConfirmation,
          setIsShowingTabs,
        })
      : tabContent;
  };

  const { txnHeader, txnOutcome, txnHash, version } = statusModalProps;

  useEffect(() => {
    setIsShowingTabs(true);
  }, [activeTab]);

  if (modalState.show) {
    if (modalState.type === "confirmation")
      return (
        <ConfirmationModal
          modalHeader={`${modalState.modalHeader} Confirmation`}
          action={modalState.action}
          onConfirm={handleConfirm}
          onClose={hideModal}
        />
      );

    if (pendingTx) return <LoadingSpinner />;

    if (version === "success")
      return (
        <TxnSuccess
          txnHeader={txnHeader}
          txnOutcome={txnOutcome}
          txnHash={txnHash}
          onClose={() => {
            hideModal();
          }}
        />
      );

    if (version === "failure")
      return (
        <TxnFailure
          txnHeader={txnHeader}
          txnOutcome={txnOutcome}
          onClose={() => {
            hideModal();
          }}
        />
      );
  }

  return (
    <div className="bg-[#121212] border border-[#262626] rounded-lg w-full flex flex-col h-full justify-center">
      {tabs.length > 0 ? (
        <>
          {isShowingTabs && (
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              setActiveTab={(tab: string) => {
                setActiveTab(tab);
              }}
            />
          )}
          <div className="flex flex-col flex-grow h-[max]">
            {renderTabContent()}
          </div>
        </>
      ) : (
        <NotStartedYet />
      )}
    </div>
  );
};

const NotStartedYet = () => {
  return (
    <div className="flex flex-col flex-grow items-center justify-center text-center p-6">
      <HourglassIcon />
      <p className="text-[16px] font-medium text-[#FAFAFA] text-center mt-4 mb-3">
        Round In Process
      </p>
      <p className="max-w-[290px] font-regular text-[14px] text-[#BFBFBF] pt-0">
        This round has not started yet. To place a bid, please wait until the
        round&#39;s auction starts.
      </p>
    </div>
  );
};

//const NoAccount = () => {
//  return (
//    <div className="flex flex-col flex-grow items-center justify-center text-center p-6">
//      <ExclamationIcon />
//      <p className="text-[16px] font-medium text-[#FAFAFA] text-center mt-4 mb-3">
//        No Account
//      </p>
//      <p className="max-w-[290px] font-regular text-[14px] text-[#BFBFBF] pt-0">
//        Connect an account.
//      </p>
//    </div>
//  );
//};

export default PanelRight;
