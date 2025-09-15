import React, { useState, ReactNode } from "react";
import { WithdrawSubTabs } from "@/lib/types";
import ButtonTabs from "../../ButtonTabs";
import WithdrawLiquidity from "@/components/Vault/VaultActions/Tabs/Provider/Withdraw/WithdrawLiquidity";
import QueueWithdrawal from "@/components/Vault/VaultActions/Tabs/Provider/Withdraw/QueueWithdrawal";
import WithdrawStash from "@/components/Vault/VaultActions/Tabs/Provider/Withdraw/WithdrawStash";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";

interface WithdrawProps {
  showConfirmation: (
    modalHeader: string,
    action: ReactNode,
    onConfirm: () => Promise<void>,
  ) => void;
}

const Withdraw: React.FC<WithdrawProps> = ({ showConfirmation }) => {
  const { selectedRoundAddress } = useVaultState();
  const selectedRoundState = useRoundState(selectedRoundAddress);

  const [activeWithdrawTab, setActiveWithdrawTab] = useState<WithdrawSubTabs>(
    "Unlocked" as WithdrawSubTabs,
  );

  return (
    <>
      <div className="flex-col space-y-6 p-6 pb-2">
        <ButtonTabs
          tabs={
            selectedRoundState?.roundState.toString() === "Auctioning" ||
            selectedRoundState?.roundState.toString() === "Running"
              ? ["Unlocked", "Locked", "Stashed"]
              : ["Unlocked", "Stashed"]
          }
          activeTab={activeWithdrawTab}
          setActiveTab={(newActiveTab: string) => {
            setActiveWithdrawTab(newActiveTab as WithdrawSubTabs);
          }}
        />
      </div>
      <div className="h-full flex flex-col">
        {activeWithdrawTab === "Unlocked" && (
          <WithdrawLiquidity showConfirmation={showConfirmation} />
        )}

        {(selectedRoundState?.roundState === "Auctioning" ||
          selectedRoundState?.roundState === "Running") &&
          activeWithdrawTab === "Locked" && (
            <QueueWithdrawal showConfirmation={showConfirmation} />
          )}

        {activeWithdrawTab === "Stashed" && (
          <WithdrawStash showConfirmation={showConfirmation} />
        )}
      </div>
    </>
  );
};

export default Withdraw;
