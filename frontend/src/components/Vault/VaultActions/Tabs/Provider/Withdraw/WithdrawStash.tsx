import React, { ReactNode, useMemo } from "react";
import ActionButton from "@/components/Vault/Utils/ActionButton";
import { formatEther } from "ethers";
import { useAccount } from "@starknet-react/core";
import { CollectEthIcon } from "@/components/Icons";
import { useTransactionContext } from "@/context/TransactionProvider";
import Hoverable from "@/components/BaseComponents/Hoverable";
import { formatNumber } from "@/lib/utils";
import useVaultActions from "@/hooks/vault_v2/actions/useVaultActions";
import useLPState from "@/hooks/vault_v2/states/useLPState";

interface WithdrawStashProps {
  showConfirmation: (
    modalHeader: string,
    action: ReactNode,
    onConfirm: () => Promise<void>,
  ) => void;
}

const WithdrawStash: React.FC<WithdrawStashProps> = ({ showConfirmation }) => {
  const { account } = useAccount();
  const { pendingTx, setStatusModalProps } = useTransactionContext();

  const lpState = useLPState();
  const vaultActions = useVaultActions();

  const withdrawStashedBalance = async (): Promise<string> => {
    return await vaultActions.withdrawStash({
      account: account?.address || "",
    });
  };

  const handleSubmit = () => {
    showConfirmation(
      "Withdraw Stashed",
      <>
        collect your stashed{" "}
        <span className="font-semibold text-[#fafafa]">
          {formatNumber(
            Number(
              formatEther(
                lpState?.stashedBalance
                  ? lpState.stashedBalance.toString()
                  : "0",
              ),
            ),
          )}{" "}
          ETH
        </span>{" "}
      </>,
      async () => {
        try {
          const hash = await withdrawStashedBalance();
          setStatusModalProps({
            version: "success",
            txnHeader: "Stash Collection Successful",
            txnHash: hash,
            txnOutcome: (
              <>
                You have successfully collected your stashed balance of{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumber(
                    Number(
                      formatEther(
                        lpState?.stashedBalance
                          ? lpState.stashedBalance.toString()
                          : "0",
                      ),
                    ),
                  )}{" "}
                  ETH
                </span>
                .
              </>
            ),
          });
        } catch (e) {
          setStatusModalProps({
            version: "failure",
            txnHeader: "Collect Stash Failed",
            txnHash: "",
            txnOutcome: (
              <>
                Your stash collection of{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumber(
                    Number(
                      formatEther(
                        lpState?.stashedBalance
                          ? lpState.stashedBalance.toString()
                          : "0",
                      ),
                    ),
                  )}{" "}
                  ETH
                </span>{" "}
                failed.
              </>
            ),
          });
          console.error("Failed to collect stash:", e);
        }
      },
    );
  };

  const isButtonDisabled = useMemo(() => {
    if (!account || pendingTx || !lpState?.stashedBalance) return true;
    return false;
  }, [account, lpState?.stashedBalance, pendingTx]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col justify-center h-full align-center space-y-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-center">
            <div className="bg-[#1E1E1E] rounded-lg p-4">
              <CollectEthIcon
                classname="w-16 h-16 mx-auto collect-eth-icon"
                stroke=""
                fill=""
              />
            </div>
          </div>
          <p className="text-[#BFBFBF] text-center font-regular text-[14px] stash-balance-text">
            Your current stashed balance is
            <br />
            <b className="mt-0 text-[#FAFAFA] text-[14px] font-bold text-center stash-balance-amount">
              {lpState?.stashedBalance
                ? formatNumber(
                    parseFloat(formatEther(lpState.stashedBalance.toString())),
                  )
                : "0"}{" "}
              ETH
            </b>
          </p>
        </div>
      </div>
      <div className="mt-auto">
        <div className="flex justify-between text-sm border-t border-[#262626] p-6">
          <ActionButton
            onClick={handleSubmit}
            disabled={isButtonDisabled}
            text="Collect"
            dataId="collectStashButton"
          />
        </div>
      </div>
    </div>
  );
};

export default WithdrawStash;
