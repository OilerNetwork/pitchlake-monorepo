import React, { useEffect } from "react";

interface StateTransitionConfirmationModalProps {
  action: string;
  onConfirm: () => void;
  onClose: () => void;
}

const Confirmations: any = {
  "Start Auction": "Are you sure you want to start this round's auction?",
  "End Auction": "Are you sure you want to end this round's auction?",
  "Request Fossil":
    "Are you sure you want to request pricing data from Fossil?",
  "Settle Round": "Are you sure you want to settle this round?",
};

const btnMsgs: any = {
  "Start Auction": "Start",
  "End Auction": "End",
  "Request Fossil": "Request Fossil",
  "Settle Round": "Settle",
};

const StateTransitionConfirmationModal = ({
  action,
  onConfirm,
  onClose,
}: StateTransitionConfirmationModalProps) => {
  useEffect(() => {
    // Disable scrolling when the modal is mounted
    document.body.style.overflow = "hidden";

    // Re-enable scrolling when the modal is unmounted
    return () => {
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <div
      className="state-transition-modal-backdrop overflow-hidden fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-black/50"
      onClick={onClose} // Close the modal when the background is clicked
    >
      <div
        className="state-transition-modal-content shadow-lg max-w-md w-full bg-[#121212] border border-[#262626] rounded-lg flex flex-col w-[314px]"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="flex flex-col items-center p-6">
          <div className="bg-[#F5EBB8] rounded-lg w-12 h-12 flex items-center justify-center mx-auto">
            <span className="text-black text-2xl font-bold">!</span>
          </div>
          <h2 className="text-center text-white text-[16px] my-[0.5rem]">
            {action} Confirmation
          </h2>
          <p className="text-gray-400 text-center text-[14px]">
            {Confirmations[action]}
          </p>
        </div>

        {/* Separator line */}
        <div className="w-full border-t border-[#262626]" />

        <div className="flex justify-center space-x-4 p-6 text-[14px]">
          <button
            className="w-[125px] px-4 py-2 bg-[#121212] border border-[2px] border-[#595959] rounded-lg text-[#fafafa]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="w-[125px] px-4 py-2 bg-[#F5EBB8] rounded-lg text-[#121212]"
          >
            {btnMsgs[action] || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StateTransitionConfirmationModal;
