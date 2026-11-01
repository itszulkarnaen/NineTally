"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

interface MonthPickerProps {
  value: string; // Format: "YYYY-MM", e.g. "2026-11"
  onChange: (newMonth: string) => void;
  className?: string;
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

export const MonthPicker: React.FC<MonthPickerProps> = ({ value, onChange, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse YYYY-MM
  const [yearStr, monthStr] = value.split("-");
  const selectedYear = parseInt(yearStr, 10) || 2026;
  const selectedMonthIndex = (parseInt(monthStr, 10) || 11) - 1; // 0-indexed

  // Internal year state for browsing in popover
  const [browseYear, setBrowseYear] = useState<number>(selectedYear);

  // Current real month (November 2026 in our mock context)
  const currentRealYear = 2026;
  const currentRealMonthIndex = 10; // November

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Quick Prev / Next month stepper
  const handleStepMonth = (direction: -1 | 1) => {
    let newMonthIdx = selectedMonthIndex + direction;
    let newYear = selectedYear;

    if (newMonthIdx < 0) {
      newMonthIdx = 11;
      newYear -= 1;
    } else if (newMonthIdx > 11) {
      newMonthIdx = 0;
      newYear += 1;
    }

    const formattedMonth = String(newMonthIdx + 1).padStart(2, "0");
    onChange(`${newYear}-${formattedMonth}`);
  };

  // Select month from grid
  const handleSelectMonth = (monthIdx: number) => {
    const formattedMonth = String(monthIdx + 1).padStart(2, "0");
    onChange(`${browseYear}-${formattedMonth}`);
    setIsOpen(false);
  };

  // Jump to Current Real Month
  const handleJumpToCurrent = () => {
    onChange("2026-11");
    setBrowseYear(2026);
    setIsOpen(false);
  };

  const isCurrentMonth = selectedYear === currentRealYear && selectedMonthIndex === currentRealMonthIndex;

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={containerRef}>
      {/* Container with Stepper & Trigger */}
      <div className="flex items-center bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-1 shadow-xs">
        {/* Prev Month Arrow */}
        <button
          onClick={() => handleStepMonth(-1)}
          title="Bulan Sebelumnya"
          className="p-1.5 rounded-xl hover:bg-[#EAE2D6]/40 text-[#666E61] hover:text-[#242921] transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Month Label Popover Trigger */}
        <button
          onClick={() => {
            setBrowseYear(selectedYear);
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-2 px-3 py-1 rounded-xl hover:bg-[#EAE2D6]/30 transition group"
        >
          <Calendar className="w-3.5 h-3.5 text-[#8B9A6E]" />
          <span className="text-xs font-bold text-[#242921]">
            {MONTH_NAMES[selectedMonthIndex]} {selectedYear}
          </span>
          {isCurrentMonth && (
            <span className="text-[10px] bg-[#8B9A6E]/15 text-[#8B9A6E] font-bold px-1.5 py-0.2 rounded-full">
              Bulan Berjalan
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-[#666E61] transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Next Month Arrow */}
        <button
          onClick={() => handleStepMonth(1)}
          title="Bulan Berikutnya"
          className="p-1.5 rounded-xl hover:bg-[#EAE2D6]/40 text-[#666E61] hover:text-[#242921] transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Popover Calendar Grid Modal */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 z-50 w-72 bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-4 shadow-lg animate-in fade-in zoom-in-95 duration-150">
          {/* Header Year Navigator */}
          <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
            <button
              onClick={() => setBrowseYear((prev) => prev - 1)}
              className="p-1.5 rounded-lg hover:bg-[#EAE2D6]/50 text-[#666E61] hover:text-[#242921] transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm text-[#242921]">{browseYear}</span>
            <button
              onClick={() => setBrowseYear((prev) => prev + 1)}
              className="p-1.5 rounded-lg hover:bg-[#EAE2D6]/50 text-[#666E61] hover:text-[#242921] transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 12-Month Grid */}
          <div className="grid grid-cols-3 gap-1.5 my-3">
            {SHORT_MONTHS.map((name, idx) => {
              const isSelected = selectedYear === browseYear && selectedMonthIndex === idx;
              const isToday = currentRealYear === browseYear && currentRealMonthIndex === idx;

              return (
                <button
                  key={name}
                  onClick={() => handleSelectMonth(idx)}
                  className={`py-2 px-1 text-xs font-semibold rounded-xl transition relative flex flex-col items-center justify-center ${
                    isSelected
                      ? "bg-[#8B9A6E] text-white shadow-xs"
                      : "text-[#242921] hover:bg-[#EAE2D6]/40"
                  }`}
                >
                  <span>{name}</span>
                  {isToday && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B9A6E] mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Action Footer */}
          <div className="border-t border-[#EEEEEE] pt-2.5 flex items-center justify-between">
            <button
              onClick={handleJumpToCurrent}
              className="text-[11px] font-bold text-[#8B9A6E] hover:underline"
            >
              Ke Bulan Berjalan
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[11px] text-[#666E61] hover:text-[#242921]"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

