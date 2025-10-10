import React from "react";

interface ToggleProps {
  value: string;
  onChange: (value: string) => void;
  options: {
    on: string;
    off: string;
  };
  label?: string;
  disabled?: boolean;
  size?: "small" | "medium" | "large";
  className?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  value,
  onChange,
  options,
  label,
  disabled = false,
  size = "medium",
  className = "",
}) => {
  const isChecked = value === options.on;
  
  const handleToggle = () => {
    if (!disabled) {
      const newValue = isChecked ? options.off : options.on;
      onChange(newValue);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "small":
        return {
          container: "w-6 h-4",
          dot: "w-3 h-3",
          translate: "translate-x-2",
        };
      case "large":
        return {
          container: "w-12 h-7",
          dot: "w-6 h-6",
          translate: "translate-x-5",
        };
      default: // medium
        return {
          container: "w-10 h-6",
          dot: "w-5 h-5",
          translate: "translate-x-4",
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <div className={`flex items-center ${className}`}>
      <label className="flex items-center cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={isChecked}
            onChange={handleToggle}
            disabled={disabled}
            aria-label="Toggle"
          />
          <div
            className={`${sizeClasses.container} rounded-full border transition-colors duration-300 ease-in-out ${
              disabled
                ? "bg-gray-600 border-gray-500 cursor-not-allowed"
                : isChecked
                ? "bg-[#524F44] border-[#ADA478]"
                : "bg-[#373632] border-[#ADA478]"
            }`}
          />
          <div
            className={`${sizeClasses.dot} absolute left-0.5 top-0.5 bg-[#F5EBB8] rounded-full transition-transform duration-300 ease-in-out ${
              isChecked ? `transform ${sizeClasses.translate}` : ""
            } ${disabled ? "opacity-50" : ""}`}
          />
        </div>
        {label && (
          <span
            className={`ml-3 text-sm font-medium w-24 text-left ${
              disabled ? "text-gray-400" : "text-white"
            }`}
          >
            {label}
          </span>
        )}
      </label>
    </div>
  );
};

export default Toggle;
