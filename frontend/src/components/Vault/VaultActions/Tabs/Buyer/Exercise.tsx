import React, { ReactNode, useEffect, useMemo } from "react";
import { formatEther } from "ethers";
import { ExerciseOptionsIcon } from "@/components/Icons";
import ActionButton from "@/components/Vault/Utils/ActionButton";
import { useAccount } from "@starknet-react/core";
import { formatNumber, formatNumberText } from "@/lib/utils";
import { useTransactionContext } from "@/context/TransactionProvider";
import useErc20Balance from "@/hooks/erc20/useErc20Balance";
import Hoverable from "@/components/BaseComponents/Hoverable";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useRoundState from "@/hooks/vault_v2/states/useRoundState";
import useOBState from "@/hooks/vault_v2/states/useOBState";
import useVaultActions from "@/hooks/vault_v2/actions/useVaultActions";
import { useNewContext } from "@/context/NewProvider";

interface ExerciseProps {
  showConfirmation: (
    modalHeader: string,
    action: ReactNode,
    onConfirm: () => Promise<void>,
  ) => void;
}

const Exercise: React.FC<ExerciseProps> = ({ showConfirmation }) => {
  const { conn } = useNewContext();
  const { account } = useAccount();
  const { selectedRoundAddress } = useVaultState();
  const selectedRoundState = useRoundState(selectedRoundAddress);
  const selectedRoundBuyerState = useOBState(selectedRoundAddress);
  const vaultActions = useVaultActions();
  const { pendingTx, setStatusModalProps, updateStatusModalProps } =
    useTransactionContext();
  const { balance } = useErc20Balance(
    selectedRoundState?.address as `0x${string}`,
  );

  const totalOptions = useMemo(() => {
    let total = BigInt(0);
    if (!selectedRoundBuyerState) return total;

    // In RPC mode, we include the mintable option balance from the contrct getter (will be 0 post-mint)
    if (conn !== "ws") {
      if (balance) total += BigInt(balance);
      if (selectedRoundBuyerState.mintableOptions)
        total += BigInt(selectedRoundBuyerState?.mintableOptions);
    }
    // In WS mode, `mintableOptions` keeps the value of of the mintable options pre-mint, and uses a `hasMinted` flag
    else if (
      selectedRoundBuyerState.hasMinted === false &&
      selectedRoundBuyerState.mintableOptions
    )
      total += BigInt(selectedRoundBuyerState.mintableOptions);

    return total;
  }, [
    selectedRoundBuyerState?.mintableOptions,
    selectedRoundBuyerState?.hasMinted,
    selectedRoundState?.payoutPerOption,
    balance,
  ]);

  const { payoutBalanceEth, payoutBalanceWei } = useMemo(() => {
    const payoutBalanceWei = selectedRoundState?.payoutPerOption
      ? totalOptions * BigInt(selectedRoundState?.payoutPerOption.toString())
      : "0";
    const payoutBalanceEth = formatEther(payoutBalanceWei);

    return { payoutBalanceEth, payoutBalanceWei };
  }, [selectedRoundState?.payoutPerOption, totalOptions]);

  const isButtonDisabled = (): boolean => {
    if (!account) return true;
    if (pendingTx) return true;
    if (!selectedRoundBuyerState) return true;
    if (payoutBalanceWei.toString() === "0") return true;

    return false;
  };

  const handleExerciseOptions = async (): Promise<string> => {
    return (
      (await vaultActions?.exerciseOptions({
        roundAddress: selectedRoundAddress || "0x0",
      })) || ""
    );
  };

  const handleSubmit = () => {
    showConfirmation(
      "Exercise",
      <>
        exercise{" "}
        <span className="font-semibold text-[#fafafa]">
          {formatNumberText(Number(totalOptions.toString()))} options
        </span>{" "}
        for{" "}
        <span className="font-semibold text-[#fafafa]">
          {formatNumber(Number(payoutBalanceEth))} ETH
        </span>
      </>,
      async () => {
        try {
          const hash = await handleExerciseOptions();
          setStatusModalProps({
            version: "success",
            txnHeader: "Exercise Options Successful",
            txnHash: "",
            txnOutcome: (
              <>
                You have successfully exercised{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumberText(Number(totalOptions.toString()))} options
                </span>{" "}
                for{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumber(Number(payoutBalanceEth))} ETH
                </span>{" "}
                .
              </>
            ),
          });
          updateStatusModalProps({
            txnHash: hash,
          });
        } catch (e) {
          setStatusModalProps({
            version: "failure",
            txnHeader: "Exercise Options Fail",
            txnHash: "",
            txnOutcome: (
              <>
                Exercising{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumberText(Number(totalOptions.toString()))} options
                </span>{" "}
                for{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumber(Number(payoutBalanceEth))} ETH
                </span>{" "}
                failed.
              </>
            ),
          });

          console.error("Error exercising options:", e);
        }
      },
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col flex-grow space-y-6 items-center justify-center">
        <ExerciseOptionsIcon
          classname={
            "mint-icon w-[90px] h-[90px] rounded-2xl bg-icon-gradient border-[1px] border-greyscale-800 flex flex-row justify-center items-center"
          }
        />
        <p className="font-regular text-[14px] max-w-[290px] text-[#bfbfbf] text-center">
          You own{" "}
          <span className=" font-regular text-[14px] font-semibold text-[#fafafa]">
            {totalOptions
              ? formatNumberText(Number(totalOptions.toString()))
              : 0}
          </span>{" "}
          options worth
          <br />{" "}
          <span className=" font-regular text-[14px] font-semibold text-[#fafafa]">
            {" "}
            {formatNumber(Number(payoutBalanceEth))} ETH
          </span>
        </p>
      </div>

      <div className="mt-auto">
        <div className="px-6 flex justify-between text-sm mb-6 pt-6 border-t border-[#262626]">
          <ActionButton
            onClick={handleSubmit}
            disabled={isButtonDisabled()}
            text="Exercise Now"
            dataId="exerciseButton"
          />
        </div>
      </div>
    </div>
  );
};

export default Exercise;
