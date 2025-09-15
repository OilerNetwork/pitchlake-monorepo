import React, { useState } from "react";

interface ToggleSwitchProps {
  isChecked: boolean;
  onChange: () => void;
  label: string;
}

const renderBNFUnlockedBalance = () => (
  <div className="flex justify-between text-sm mb-4">
    <span className="text-gray-400">BNF&apos;s Unlocked Balance</span>
    <span>12.8 ETH</span>
  </div>
);

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  isChecked,
  onChange,
  label,
}) => {
  const [address, setAddress] = useState("");

  const renderInputField = () => (
    <div className="mb-4">
      <div className="relative">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter Address"
          className="w-full bg-[#1E1E1E] border border-gray-700 rounded-md p-2 pr-8 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>
  );

  return (
    <div>
      <label className="flex items-center cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={isChecked}
            onChange={onChange}
          />
          <div
            className={`block w-8 h-5 rounded-full border border-[#ADA478] ${
              isChecked ? "bg-[#524F44]" : "bg-[#373632]"
            }`}
          ></div>
          <div
            className={`dot absolute left-1 top-1 bg-[#F5EBB8] w-3 h-3 rounded-full transition-transform duration-300 ease-in-out ${
              isChecked ? "transform translate-x-3" : ""
            }`}
          ></div>
        </div>
        <span className="ml-3 text-sm font-medium text-white">{label}</span>
      </label>
      {isChecked && (
        <div className="mt-4">
          {renderInputField()}
          {renderBNFUnlockedBalance()}
        </div>
      )}
    </div>
  );
};

export default ToggleSwitch;
