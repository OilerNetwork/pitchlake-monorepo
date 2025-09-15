import React, { ReactNode } from "react";
import { TxSuccessIcon } from "@/components/Icons";
import { SquareArrowOutUpRight } from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { useExplorer } from "@starknet-react/core";
import ActionButton from "@/components/Vault/Utils/ActionButton";

export interface TxnStatusModalProps {
  txnHeader: string;
  txnOutcome: ReactNode;
  txnHash?: string;
  onClose: () => void;
}

const TxnSuccess = ({
  txnHeader,
  txnOutcome,
  txnHash,
  onClose,
}: TxnStatusModalProps) => {
  const explorer = useExplorer();

  return (
    <>
      <div className="bg-[#121212] border border-[#262626] rounded-lg  w-full flex flex-col h-full success-modal">
        <div className="flex items-center mb-4 confirmation-modal-header p-6">
          <button
            onClick={onClose}
            className="flex justify-center items-center mr-4 w-[40px] h-[40px] rounded-lg border-[1px] border-[#262626] bg-[#0D0D0D] confirmation-modal-back"
          >
            <ChevronLeft className="size-[16px] text-[#F5EBB8]" />
          </button>
          <h2 className="text-[#FAFAFA] text-[14px] font-medium text-md confirmation-modal-title">
            {txnHeader}
          </h2>
        </div>
        <div className="flex-grow flex flex-row items-center justify-center success-modal-content">
          <div className="success-modal-icon p-6 flex flex-col justify-center items-center space-y-6">
            <TxSuccessIcon />
            <p className="text-center text-[#bfbfbf] font-regular text-[14px] text-sm success-modal-message max-w-[236px]">
              {txnOutcome}
            </p>
          </div>
        </div>
        <div className="bottom-0 flex flex-row justify-center text-sm">
          <p className="whitespace-nowrap flex flex-row gap-1 pb-6">
            TXN ID:
            <a
              href={explorer.transaction(txnHash || "")}
              className="text-[#F5EBB8] flex flex-row items-center gap-1"
              target="_blank"
            >
              {txnHash?.slice(0, 6)}...{txnHash?.slice(-4)}{" "}
              <SquareArrowOutUpRight size={16} />
            </a>
          </p>
        </div>
        <div className="mt-auto flex justify-center text-sm p-6 border-t border-[#262626] success-modal-button flex flex-row">
          <ActionButton
            dataId={"gotItButton"}
            onClick={onClose}
            text="Got It"
            disabled={false}
          />
        </div>
      </div>
    </>
  );
};

export default TxnSuccess;
