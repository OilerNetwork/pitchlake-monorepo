import React, { useState, useEffect, ReactNode, useMemo } from "react";
import InputField from "@/components/Vault/Utils/InputField";
import ActionButton from "@/components/Vault/Utils/ActionButton";
import { formatEther, parseEther } from "ethers";
import { useTransactionContext } from "@/context/TransactionProvider";
import { useAccount } from "@starknet-react/core";
import Hoverable from "@/components/BaseComponents/Hoverable";
import { formatNumber } from "@/lib/utils";
import useVaultActions from "@/hooks/vault_v2/actions/useVaultActions";
import useLPState from "@/hooks/vault_v2/states/useLPState";
import { EthereumIcon } from "@/components/Icons";

const WITHDRAW_AMOUNT_KEY = "withdrawAmount";

interface WithdrawLiquidityProps {
  showConfirmation: (
    modalHeader: string,
    action: ReactNode,
    onConfirm: () => Promise<void>,
  ) => void;
}

const WithdrawLiquidity: React.FC<WithdrawLiquidityProps> = ({
  showConfirmation,
}) => {
  const { account } = useAccount();
  const { pendingTx, setStatusModalProps } = useTransactionContext();
  const lpState = useLPState();
  const vaultActions = useVaultActions();

  const [withdrawAmount, setWithdrawAmount] = useState("");

  const amountReason: string = useMemo(() => {
    if (!account) return "Connect account";
    else if (withdrawAmount == "") return "";
    else if (Number(withdrawAmount) <= 0)
      return "Amount must be greater than 0";
    else if (
      parseEther(withdrawAmount) > BigInt(lpState?.unlockedBalance || "0")
    )
      return `Exceeds balance (${parseFloat(
        formatEther(lpState?.unlockedBalance?.toString() || "0"),
      ).toFixed(5)} ETH)`;
    else return "";
  }, [withdrawAmount, lpState?.unlockedBalance, account]);

  const isButtonDisabled = useMemo(() => {
    if (pendingTx || amountReason !== "" || withdrawAmount === "") return true;
    return false;
  }, [pendingTx, amountReason, withdrawAmount]);

  const withdrawLiquidity = async (): Promise<string> => {
    const hash = await vaultActions.withdrawLiquidity({
      amount: parseEther(withdrawAmount),
    });
    localStorage.removeItem(WITHDRAW_AMOUNT_KEY);
    return hash;
  };

  const handleSubmit = () => {
    showConfirmation(
      "Liquidity Withdraw",
      <>
        withdraw
        <br />
        <span className="font-semibold text-[#fafafa]">
          {formatNumber(Number(withdrawAmount))} ETH
        </span>{" "}
        from your unlocked balance
      </>,
      async () => {
        try {
          const hash = await withdrawLiquidity();

          setStatusModalProps({
            version: "success",
            txnHeader: "Withdraw Successful",
            txnHash: hash,
            txnOutcome: (
              <>
                You have successfully withdrawn{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumber(Number(withdrawAmount))} ETH
                </span>{" "}
                from your unlocked balance.
              </>
            ),
          });
          setWithdrawAmount("");
        } catch (e) {
          setStatusModalProps({
            version: "failure",
            txnHeader: "Withdraw Failed",
            txnHash: "",
            txnOutcome: (
              <>
                Your withdraw of{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumber(Number(withdrawAmount))} ETH
                </span>{" "}
                failed.
              </>
            ),
          });
          console.error("Error sending withdraw txn: ", e);
        }
      },
    );
  };

  // Load withdraw amount from local storage after initial render
  useEffect(() => {
    const amount = localStorage?.getItem(WITHDRAW_AMOUNT_KEY);
    if (amount) setWithdrawAmount(amount);
  }, []);

  return (
    <>
      <div
        className={`flex flex-row px-6 items-start ${lpState?.unlockedBalance == 0 || !account ? "" : "gap-2"}`}
      >
        <div
          className={`flex flex-col space-y-5 mb-[auto] ${lpState?.unlockedBalance == 0 || !account ? "w-[100%]" : ""}`}
        >
          <InputField
            type="number"
            value={withdrawAmount || ""}
            label="Enter Amount"
            dataId="inputWithdrawalAmount"
            onChange={(e) => {
              const value = e.target.value;
              const formattedValue = value.includes(".")
                ? value.slice(0, value.indexOf(".") + 19)
                : value;

              setWithdrawAmount(formattedValue);
              localStorage?.setItem(WITHDRAW_AMOUNT_KEY, formattedValue);
            }}
            placeholder="e.g. 5.0"
            icon={
              <EthereumIcon classname="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
            }
            error={amountReason}
          />
        </div>
        {lpState?.unlockedBalance == 0 || !account ? null : (
          <Hoverable dataId="maxButton" className="mt-[26px]">
            <button
              className=" border border-[1.5px] border-[#454545] w-[56px] h-[44px] rounded-lg text-[#F5EBB8] hover-zoom-small"
              onClick={() => {
                setWithdrawAmount(formatEther(lpState?.unlockedBalance || "0"));
                localStorage?.setItem(
                  WITHDRAW_AMOUNT_KEY,
                  formatEther(lpState?.unlockedBalance || "0"),
                );
              }}
            >
              MAX
            </button>
          </Hoverable>
        )}
      </div>

      <div className="flex flex-col h-[full] mt-[auto]">
        <Hoverable
          dataId="lpActionUnlockedBalance"
          className="px-6 flex justify-between text-sm mb-6 mt-auto"
        >
          <span className="text-gray-400 balance-label">Unlocked Balance</span>
          <span className="text-white balance-amount">
            {formatNumber(
              parseFloat(
                formatEther(lpState?.unlockedBalance?.toString() || "0"),
              ),
            )}{" "}
            ETH
          </span>
        </Hoverable>
        <div className="mt-auto flex justify-center text-sm border-t border-[#262626] p-6">
          <ActionButton
            onClick={handleSubmit}
            disabled={isButtonDisabled}
            text="Withdraw"
            dataId="withdrawButton"
          />
        </div>
      </div>
    </>
  );
};

export default WithdrawLiquidity;
