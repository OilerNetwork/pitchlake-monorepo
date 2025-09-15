import React from "react";
import { TxFailureIcon } from "@/components/Icons";
import { ChevronLeft } from "lucide-react";
import ActionButton from "@/components/Vault/Utils/ActionButton";
import { TxnStatusModalProps } from "./TxnSuccess";

const TxnFailure = ({
  txnHeader,
  txnOutcome,
  onClose,
}: TxnStatusModalProps) => (
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
          <TxFailureIcon />
          <p className="text-center text-[#bfbfbf] font-regular text-[14px] text-sm success-modal-message max-w-[236px]">
            {txnOutcome}
          </p>
        </div>
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
export default TxnFailure;
