"use client";

import React, { useState, useEffect } from "react";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  showPrefix?: boolean;
  textAlign?: "left" | "right";
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  disabled = false,
  className = "",
  placeholder = "0",
  showPrefix = true,
  textAlign = "right",
}) => {
  // Format number to Indonesian dot thousand separator: 10000000 -> "10.000.000"
  const formatDisplay = (num: number): string => {
    if (isNaN(num) || num === 0) return "";
    return new Intl.NumberFormat("id-ID").format(num);
  };

  const [displayValue, setDisplayValue] = useState<string>(formatDisplay(value));

  // Sync when prop value changes externally
  useEffect(() => {
    setDisplayValue(formatDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawText = e.target.value;
    // Strip non-digits
    const digitsOnly = rawText.replace(/\D/g, "");

    if (!digitsOnly) {
      setDisplayValue("");
      onChange(0);
      return;
    }

    const numericValue = parseInt(digitsOnly, 10);
    setDisplayValue(new Intl.NumberFormat("id-ID").format(numericValue));
    onChange(numericValue);
  };

  return (
    <div className={`relative flex items-center ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
      {showPrefix && (
        <span className="absolute left-2.5 text-[11px] font-bold text-[#666E61] select-none pointer-events-none">
          Rp
        </span>
      )}
      <input
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full bg-[#EAE2D6]/30 border border-[#EEEEEE] focus:border-[#8B9A6E] focus:outline-none rounded-xl py-1.5 text-xs font-bold text-[#242921] transition ${
          showPrefix ? "pl-8 pr-3" : "px-3"
        } ${textAlign === "right" ? "text-right" : "text-left"} ${className}`}
      />
    </div>
  );
};

