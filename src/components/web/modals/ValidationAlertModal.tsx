"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { CashflowUnit } from "@/types";
import { ValidationAlertState } from "../types";

interface ValidationAlertModalProps {
  validationAlert: ValidationAlertState | null;
  onClose: () => void;
  cashflowUnits: CashflowUnit[];
  onArchiveUnit?: (unit: CashflowUnit) => void;
}

export const ValidationAlertModal: React.FC<ValidationAlertModalProps> = ({
  validationAlert,
  onClose,
  cashflowUnits,
  onArchiveUnit,
}) => {
  if (!validationAlert) return null;

  const suggestUnit = validationAlert.suggestArchiveUnitId
    ? cashflowUnits.find((u) => u.id === validationAlert.suggestArchiveUnitId)
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#242921]">{validationAlert.title}</h3>
            <p className="text-xs text-[#666E61] leading-relaxed">
              {validationAlert.message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EEEEEE]">
          {suggestUnit && suggestUnit.is_active !== false && onArchiveUnit && (
            <button
              type="button"
              onClick={() => {
                onArchiveUnit(suggestUnit);
                onClose();
              }}
              className="px-4 py-2 bg-[#2196F3] hover:bg-[#1E88E5] text-white font-semibold text-xs rounded-xl transition shadow-xs"
            >
              Arsipkan (Nonaktifkan) Saja
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#EEEEEE] text-[#242921] hover:bg-[#EEEEEE]/60 font-medium text-xs rounded-xl transition"
          >
            Paham & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

