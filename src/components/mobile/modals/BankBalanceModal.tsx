"use client";

import React, { useState, useEffect } from "react";
import { formatRupiah } from "@/lib/utils";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { Landmark, X, Check } from "lucide-react";

interface BankBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMonth: string;
  currentBca: number;
  currentJago: number;
  onSaveBankBalance: (bca: number, jago: number) => void;
}

export const BankBalanceModal: React.FC<BankBalanceModalProps> = ({
  isOpen,
  onClose,
  selectedMonth,
  currentBca,
  currentJago,
  onSaveBankBalance,
}) => {
  const [inputBcaBalance, setInputBcaBalance] = useState<number>(currentBca);
  const [inputJagoBalance, setInputJagoBalance] = useState<number>(currentJago);

  useEffect(() => {
    if (isOpen) {
      setInputBcaBalance(currentBca);
      setInputJagoBalance(currentJago);
    }
  }, [isOpen, currentBca, currentJago]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveBankBalance(inputBcaBalance, inputJagoBalance);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-xl border border-[#EEEEEE] space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#2196F3]/15 text-[#2196F3]">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#242921]">Update Saldo Rekening Bank</h3>
              <p className="text-[10px] text-[#666E61]">Periode: {selectedMonth}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#666E61] hover:text-[#242921] transition rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-[#666E61] block mb-1">
              Saldo Riil BCA Utama
            </label>
            <CurrencyInput
              value={inputBcaBalance}
              onChange={(val) => setInputBcaBalance(val)}
              placeholder="0"
              className="w-full text-base font-bold bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2.5 text-[#242921] focus:border-[#2196F3] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#666E61] block mb-1">
              Saldo Riil Bank Jago (Opsional)
            </label>
            <CurrencyInput
              value={inputJagoBalance}
              onChange={(val) => setInputJagoBalance(val)}
              placeholder="0"
              className="w-full text-base font-bold bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2.5 text-[#242921] focus:border-[#2196F3] focus:outline-hidden"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#E3F2FD] border border-[#2196F3]/30 text-[11px] text-[#242921] space-y-1">
            <span className="font-bold text-[#2196F3] block">Total Liquid Cash Riil:</span>
            <span className="text-base font-extrabold text-[#242921]">
              {formatRupiah(inputBcaBalance + inputJagoBalance)}
            </span>
            <p className="text-[10px] text-[#666E61]">
              Nilai ini akan tersinkronisasi otomatis ke Web Console dan laporan historical bulanan.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 bg-[#2196F3] hover:bg-[#1E88E5] text-white active:scale-[0.99] cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Simpan Saldo Bank</span>
          </button>
        </form>
      </div>
    </div>
  );
};

