//import React, { ReactNode } from "react";
//import { Check } from "lucide-react";
//
//interface SuccessModalProps {
//  activeTab: string;
//  action: ReactNode;
//  onClose: () => void;
//}
//
//const SuccessModal: React.FC<SuccessModalProps> = ({
//  activeTab,
//  action,
//  onClose,
//}) => (
//  <div className="bg-[#121212] border border-[#262626] rounded-lg p-4 w-full flex flex-col h-full success-modal">
//    <div className="flex items-center mb-4 success-modal-header">
//      <button onClick={onClose} className="mr-2 success-modal-back">
//        <svg
//          width="24"
//          height="24"
//          viewBox="0 0 24 24"
//          fill="none"
//          xmlns="http://www.w3.org/2000/svg"
//        >
//          <path
//            d="M19 12H5"
//            stroke="white"
//            strokeWidth="2"
//            strokeLinecap="round"
//            strokeLinejoin="round"
//          />
//          <path
//            d="M12 19L5 12L12 5"
//            stroke="white"
//            strokeWidth="2"
//            strokeLinecap="round"
//            strokeLinejoin="round"
//          />
//        </svg>
//      </button>
//      <h2 className="text-white text-md font-semibold success-modal-title">
//        {activeTab}
//      </h2>
//    </div>
//    <div className="flex-grow flex flex-col items-center justify-center success-modal-content">
//      <div className="rounded-lg p-6 mb-6">
//        <div className="bg-[#F5EBB8] rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3 success-modal-icon">
//          <Check className="text-black w-6 h-6" />
//        </div>
//        <p className="text-center text-white success-modal-message">
//          You have successfully {action}.
//        </p>
//      </div>
//    </div>
//    <div className="px-6 flex justify-between text-sm mb-6 pt-6 border-t border-[#262626]">
//      <button
//        onClick={onClose}
//        className="w-full bg-[#F5EBB8] text-black py-3 rounded-md font-semibold success-modal-button"
//      >
//        Got it
//      </button>
//    </div>
//  </div>
//);
//
//export default SuccessModal;
