import React, { ReactNode, useMemo } from "react";
import ActionButton from "@/components/Vault/Utils/ActionButton";
import { useAccount } from "@starknet-react/core";
import { RepeatEthIcon } from "@/components/Icons";
import { formatNumber } from "@/lib/utils";
import { formatEther } from "ethers";
import { useTransactionContext } from "@/context/TransactionProvider";
import Hoverable from "@/components/BaseComponents/Hoverable";
import useVaultState from "@/hooks/vault_v2/states/useVaultState";
import useOBState from "@/hooks/vault_v2/states/useOBState";
import useVaultActions from "@/hooks/vault_v2/actions/useVaultActions";
import { useNewContext } from "@/context/NewProvider";

interface RefundProps {
  showConfirmation: (
    modalHeader: string,
    action: ReactNode,
    onConfirm: () => Promise<void>,
  ) => void;
}

const Refund: React.FC<RefundProps> = ({ showConfirmation }) => {
  const { account, address } = useAccount();
  const { selectedRoundAddress } = useVaultState();
  const { pendingTx, setStatusModalProps, updateStatusModalProps } =
    useTransactionContext();
  const obState = useOBState(selectedRoundAddress);
  const vaultActions = useVaultActions();
  const { conn } = useNewContext();

  const { refundBalanceWei, refundBalanceEth } = useMemo(() => {
    const refundBalanceWei = obState?.refundableOptions
      ? conn === "ws"
        ? !obState?.hasMinted
          ? obState?.refundableOptions
          : "0"
        : obState?.refundableOptions
      : "0";

    const refundBalanceEth = formatEther(BigInt(refundBalanceWei));

    return { refundBalanceWei, refundBalanceEth };
  }, [conn, obState?.hasMinted, obState?.refundableOptions]);

  const isButtonDisabled = useMemo(() => {
    if (!account) return true;
    if (pendingTx) return true;
    if (refundBalanceWei.toString() === "0") return true;

    return false;
  }, [account, pendingTx, refundBalanceWei]);

  const handleRefundBid = async (): Promise<string> => {
    return (
      (await vaultActions?.refundUnusedBids({
        roundAddress: selectedRoundAddress || "0x0",
        optionBuyer: address || "0x0",
      })) || ""
    );
  };
  const handleSubmit = () => {
    showConfirmation(
      "Refund",
      <>
        refund bids worth{" "}
        <span className="font-semibold text-[#fafafa]">
          {formatNumber(Number(refundBalanceEth))} ETH
        </span>
      </>,
      async () => {
        try {
          const hash = await handleRefundBid();
          setStatusModalProps({
            version: "success",
            txnHeader: "Refund Successful",
            txnHash: "",
            txnOutcome: (
              <>
                You have successfully refunded your unused bids worth{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumber(Number(refundBalanceEth))} ETH
                </span>
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
            txnHeader: "Refund Successful",
            txnHash: "",
            txnOutcome: (
              <>
                Your refund for{" "}
                <span className="font-semibold text-[#fafafa]">
                  {formatNumber(Number(refundBalanceEth))} ETH
                </span>{" "}
                failed.
              </>
            ),
          });
          console.error("Error refunding bids:", e);
        }
      },
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col flex-grow space-y-6 items-center justify-center">
        <RepeatEthIcon classname="refund-icon rounded-2xl bg-icon-gradient border-[1px] border-greyscale-800 flex flex-row justify-center items-center" />
        <p className="text-center text-[#bfbfbf] font-regular text-[14px] ">
          Your refundable balance is <br />
          <span className="font-semibold text-[#fafafa] font-regular text-[14px] ">
            {formatNumber(Number(refundBalanceEth))} ETH
          </span>
        </p>
      </div>
      <div className="mt-auto">
        <div className="px-6 flex justify-between text-sm mb-6 pt-6 border-t border-[#262626]">
          <ActionButton
            onClick={handleSubmit}
            disabled={isButtonDisabled}
            text="Refund Now"
            dataId="refundButton"
          />
        </div>
      </div>
    </div>
  );
};

export default Refund;
