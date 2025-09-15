import React from "react";
import { ArrowLeftIcon } from "lucide-react";

interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ title, children, onClose }) => {
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center modal-overlay" onClick={handleOverlayClick}>
      <div className="bg-[#121212] p-6 rounded-lg max-w-sm w-full modal-container">
        <div className="flex items-center mb-4 modal-header">
          <ArrowLeftIcon className="h-5 w-5 mr-2 modal-close" onClick={onClose} data-testid="modal-close" />
          <h2 className="text-lg font-semibold modal-title">{title}</h2>
        </div>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;