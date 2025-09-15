import React, { ReactNode, useEffect, useMemo } from "react";
import ActionButton from "@/components/Vault/Utils/ActionButton";
import { useTransactionContext } from "@/context/TransactionProvider";
import { useAccount } from "@starknet-react/core";
import { formatEther } from "ethers";
import Hoverable from "@/components/BaseComponents/Hoverable";
import { formatNumber } from "@/lib/utils";
import useLPState from "@/hooks/vault_v2/states/useLPState";
import useVaultActions from "@/hooks/vault_v2/actions/useVaultActions";

interface WithdrawQueueProps {
  showConfirmation: (
    modalHeader: string,
    action: ReactNode,
    onConfirm: () => Promise<void>,
  ) => void;
}

const bpsToPercentage = (bps: string) => {
  return ((100 * parseFloat(bps)) / 10_000).toFixed(0).toString();
};

const percentageToBps = (percentage: string): number => {
  return (10_000 * parseFloat(percentage)) / 100;
};

const QueueWithdrawal: React.FC<WithdrawQueueProps> = ({
  showConfirmation,
}) => {
  const { account } = useAccount();
  const { pendingTx, setStatusModalProps } = useTransactionContext();

  const lpState = useLPState();
  const vaultActions = useVaultActions();

  const [percentage, setPercentage] = React.useState("0");

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseInt(e.target.value);
    setPercentage(value.toString());
  };

  const isButtonDisabled = useMemo(() => {
    if (!account || pendingTx) return true;
    if (percentage === bpsToPercentage(lpState?.queuedBps.toString() || "0"))
      return true;

    return false;
  }, [account, pendingTx, percentage, lpState?.queuedBps]);

  const queueWithdrawal = async (): Promise<string> => {
    return await vaultActions.queueWithdrawal({
      bps: percentageToBps(percentage),
    });
  };

  const handleSubmit = () => {
    showConfirmation(
      "Liquidity Withdraw",
      <>
        update how much of your locked position will be stashed from{" "}
        <span className="font-semibold text-[#fafafa]">
          {bpsToPercentage(
            lpState?.queuedBps ? lpState.queuedBps.toString() : "0",
          )}
          %
        </span>{" "}
        to <span className="font-semibold text-[#fafafa]">{percentage}%</span>
      </>,
      async () => {
        try {
          const hash = await queueWithdrawal();

          setStatusModalProps({
            version: "success",
            txnHeader: "Withdraw Request Successful",
            txnHash: hash,
            txnOutcome: (
              <>
                You have successfully queued{" "}
                <span className="font-semibold text-[#fafafa]">
                  {percentage}%
                </span>{" "}
                of your locked position for stashing.
              </>
            ),
          });
        } catch (e) {
          setStatusModalProps({
            version: "failure",
            txnHeader: "Withdrawal Request Failed",
            txnHash: "",
            txnOutcome: (
              <>
                Your request to queue{" "}
                <span className="font-semibold text-[#fafafa]">
                  {percentage}%
                </span>{" "}
                of your locked position for withdrawal failed.
              </>
            ),
          });
          console.error("Error sending deposit txn: ", e);
        }
      },
    );
  };

  useEffect(() => {
    setPercentage(bpsToPercentage(lpState?.queuedBps?.toString() || "0"));
  }, [account, pendingTx, lpState?.queuedBps]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow px-6">
        <label
          className="block text-sm font-medium text-[#fafafa] mb-2"
          htmlFor="percentage-slider"
        >
          Choose Percentage
        </label>
        <Hoverable dataId="queueSlider" className="flex items-center space-x-4">
          <div className="border-[1px] border-[#595959] w-full h-[44px] bg-[#0A0A0A] rounded-md flex items-center px-4">
            <input
              id="percentage-slider"
              type="range"
              min="0"
              max="100"
              value={percentage}
              onChange={handleSliderChange}
              className="w-full h-2 appearance-none bg-[#ADA478] rounded-full focus:outline-none
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:bg-[#F5EBB8]
                [&::-webkit-slider-thumb]:rounded-full
                [&::-moz-range-thumb]:appearance-none
                [&::-moz-range-thumb]:w-4
                [&::-moz-range-thumb]:h-4
                [&::-moz-range-thumb]:bg-red-500
                [&::-moz-range-thumb]:rounded-full
                [&::-webkit-slider-thumb]:hover:bg-[#F5EBB8]
                [&::-moz-range-thumb]:hover:bg-[#F5EBB8]"
            />
          </div>
          <div className="border-[1px] border-[#595959] flex justify-center items-center h-[44px] w-[60px] bg-[#0A0A0A] rounded-lg">
            <span className="text-[14px] font-medium text-[#FAFAFA] text-center">
              {percentage}%
            </span>
          </div>
        </Hoverable>
      </div>
      <div className="flex flex-col h-[full] mt-[auto]">
        <Hoverable
          dataId="lpActionLockedBalance"
          className="px-6 flex justify-between text-sm mb-6 mt-auto"
        >
          <span className="text-gray-400">Locked Balance</span>
          <span className="text-white">
            {formatNumber(
              parseFloat(
                formatEther(lpState?.lockedBalance?.toString() || "0"),
              ),
            )}{" "}
            ETH
          </span>
        </Hoverable>
        <div className="mt-[auto] flex justify-between text-sm border-t border-[#262626] p-6">
          <ActionButton
            onClick={handleSubmit}
            disabled={isButtonDisabled}
            text="Queue"
            dataId="queueButton"
          />
        </div>
      </div>
    </div>
  );
};

export default QueueWithdrawal;
