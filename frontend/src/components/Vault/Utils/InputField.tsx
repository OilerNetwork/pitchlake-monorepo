import React from "react";
import { useAccount } from "@starknet-react/core";
import { useUiContext } from "@/context/UiProvider";
import Hoverable from "@/components/BaseComponents/Hoverable";

interface InputFieldProps {
  type?: string;
  label: string;
  label2?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  error?: string;
  className?: string;
  disabled?: boolean;
  dataId: string;
}

const InputField: React.FC<InputFieldProps> = ({
  type = "text",
  label,
  label2,
  value,
  onChange,
  placeholder,
  icon,
  error,
  className,
  disabled,
  dataId,
}) => {
  const { account } = useAccount();
  const { openWalletLogin } = useUiContext();

  const handleInputClick = () => {
    if (!account) {
      openWalletLogin();
    }
  };

  return (
    <div className={`input-field-container ${className || ""}`}>
      <label
        className="flex flex-row justify-between text-sm font-medium text-[#fafafa] text-[14px] mb-2"
        htmlFor={label}
      >
        {label}
        <p className="font-regular text-[var(--buttongrey)]">{label2}</p>
      </label>
      <Hoverable dataId={dataId} className="relative w-full">
        <input
          id={label}
          onWheel={(e) => e.currentTarget.blur()}
          type={type}
          placeholder={placeholder}
          min={0}
          value={value}
          onChange={onChange}
          disabled={disabled}
          onClick={handleInputClick}
          className={`input-field outline-none w-full bg-[#0A0A0A] border rounded-md p-2 pr-8 appearance-none flex flex-row justify-between
            [&::-webkit-outer-spin-button]:appearance-none
            [&::-webkit-inner-spin-button]:appearance-none
            ${error ? "border-[#CC455E] text-[#CC455E]" : "border-gray-700 focus:blue-400 text-white"}
            px-6`}
        />
        <div className="flex items-center pointer-events-none">{icon}</div>
      </Hoverable>
      {error && (
        <p className="mt-1 text-sm text-red-500 error-message">{error}</p>
      )}
    </div>
  );
};

export default InputField;
