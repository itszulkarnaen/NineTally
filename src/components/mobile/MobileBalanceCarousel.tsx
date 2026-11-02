"use client";

import React from "react";
import { Landmark, ArrowDownLeft, Sparkles, Eye, EyeOff, Pencil } from "lucide-react";

interface MobileBalanceCarouselProps {
  bcaBalance: number;
  onOpenBankModal: () => void;
  isBalanceHidden: boolean;
  toggleHideBalance: () => void;
  maskNominal: (amount: number, hideSymbol?: boolean) => string;
  cashflowMetrics: {
    totalIncome: number;
    realizedSum: number;
    realizedIncome: number;
    netCashflow: number;
    outcomeCount: number;
    sisaAnggaran: number;
  };
  netWorthSummary: {
    totalDuitCok: number;
    liquid: number;
    illiquid: number;
  };
}

export const MobileBalanceCarousel: React.FC<MobileBalanceCarouselProps> = ({
  bcaBalance,
  onOpenBankModal,
  isBalanceHidden,
  toggleHideBalance,
  maskNominal,
  cashflowMetrics,
  netWorthSummary,
}) => {
  return (
    <div className="space-y-4">
      {/* 1. Header Carousel: 3 Professional Cards with Privacy Toggle */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1 text-xs">
          <span className="font-bold text-[#666E61] uppercase tracking-wider text-[11px]">
            Ringkasan Finansial
          </span>
          <button
            onClick={toggleHideBalance}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#666E61] hover:text-[#242921] px-2 py-0.5 rounded-lg bg-[#FFFFFF] border border-[#EEEEEE] transition shadow-2xs cursor-pointer"
          >
            {isBalanceHidden ? (
              <>
                <EyeOff className="w-3 h-3 text-[#2196F3]" />
                <span>Buka Saldo</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3 text-[#666E61]" />
                <span>Tutup Saldo</span>
              </>
            )}
          </button>
        </div>

        <div className="overflow-x-auto no-scrollbar flex gap-3 snap-x snap-mandatory -mx-4 px-4 pb-1">
          {/* Card 1: Bank Balance (BCA) */}
          <div className="w-[84vw] max-w-[320px] shrink-0 snap-center bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-[#666E61]">
                <span className="font-bold tracking-wider text-[11px] uppercase text-[#2196F3] flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5" /> Bank Balance
                </span>
                <span className="text-[10px] bg-[#2196F3]/15 text-[#2196F3] px-2 py-0.5 rounded-full font-bold border border-[#2196F3]/20">
                  BCA Utama
                </span>
              </div>
              <div className="my-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight text-[#242921]">
                    {maskNominal(bcaBalance)}
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={onOpenBankModal}
                      className="p-1.5 text-[#2196F3] hover:bg-[#E3F2FD] transition rounded-md cursor-pointer"
                      title="Update Saldo Rekening"
                      aria-label="Update Saldo Rekening"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={toggleHideBalance}
                      className="p-1 text-[#666E61] hover:text-[#242921] transition rounded-md cursor-pointer"
                      title={isBalanceHidden ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
                      aria-label="Toggle Saldo"
                    >
                      {isBalanceHidden ? <EyeOff className="w-4 h-4 text-[#2196F3]" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-[#666E61] flex items-center justify-between border-t border-[#EEEEEE] pt-2 font-medium">
              <span>Saldo Rekening Operasional</span>
              <span className="text-[10px] bg-[#E3F2FD] px-1.5 py-0.5 rounded text-[#666E61] font-semibold">
                Liquid Cash
              </span>
            </div>
          </div>

          {/* Card 2: Nominal Outcome */}
          <div className="w-[84vw] max-w-[320px] shrink-0 snap-center bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-[#666E61]">
                <span className="font-bold tracking-wider text-[11px] uppercase text-rose-700 flex items-center gap-1.5">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600" /> Nominal Outcome
                </span>
                <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                  {cashflowMetrics.outcomeCount} Pengeluaran
                </span>
              </div>
              <div className="my-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight text-[#242921]">
                    {maskNominal(cashflowMetrics.realizedSum)}
                  </h2>
                  <button
                    onClick={toggleHideBalance}
                    className="p-1 text-[#666E61] hover:text-[#242921] transition rounded-md cursor-pointer"
                    title={isBalanceHidden ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
                    aria-label="Toggle Saldo"
                  >
                    {isBalanceHidden ? <EyeOff className="w-4 h-4 text-[#2196F3]" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-[#666E61] flex items-center justify-between border-t border-[#EEEEEE] pt-2 font-medium">
              <span>Total Realisasi Pengeluaran</span>
              <span className="text-[10px] text-[#2196F3] font-bold">
                {cashflowMetrics.totalIncome > 0
                  ? `${Math.round((cashflowMetrics.realizedSum / cashflowMetrics.totalIncome) * 100)}% Budget`
                  : "0%"}
              </span>
            </div>
          </div>

          {/* Card 3: Assets */}
          <div className="w-[84vw] max-w-[320px] shrink-0 snap-center bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-[#666E61]">
                <span className="font-bold tracking-wider text-[11px] uppercase text-[#2196F3] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Assets
                </span>
                <span className="text-[10px] bg-[#E3F2FD] px-2 py-0.5 rounded-full font-semibold text-[#666E61]">
                  Net Worth
                </span>
              </div>
              <div className="my-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight text-[#242921]">
                    {maskNominal(netWorthSummary.totalDuitCok)}
                  </h2>
                  <button
                    onClick={toggleHideBalance}
                    className="p-1 text-[#666E61] hover:text-[#242921] transition rounded-md cursor-pointer"
                    title={isBalanceHidden ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
                    aria-label="Toggle Saldo"
                  >
                    {isBalanceHidden ? <EyeOff className="w-4 h-4 text-[#2196F3]" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-[#666E61] flex justify-between border-t border-[#EEEEEE] pt-2 font-medium">
              <span>Cair: {maskNominal(netWorthSummary.liquid, true)}</span>
              <span>Beku: {maskNominal(netWorthSummary.illiquid, true)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Monthly Cashflow Summary Card */}
      <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-[#666E61] font-medium block text-[11px]">Target Pemasukan</span>
            <span className="font-bold text-sm text-[#242921]">{maskNominal(cashflowMetrics.totalIncome)}</span>
          </div>
          <div className="text-right">
            <span className="text-[#666E61] font-medium block text-[11px]">Pemasukan Riil</span>
            <span
              className={`font-bold text-sm ${
                cashflowMetrics.realizedIncome > 0 ? "text-emerald-600" : "text-[#666E61]"
              }`}
            >
              {cashflowMetrics.realizedIncome > 0 ? `+${maskNominal(cashflowMetrics.realizedIncome)}` : "Rp 0"}
            </span>
          </div>
        </div>

        {/* Visual Progress Bar (Expense vs Target Budget) */}
        <div className="space-y-1.5">
          <div className="w-full bg-[#EEEEEE] h-2.5 rounded-full overflow-hidden flex">
            <div
              className="bg-[#2196F3] h-full transition-all duration-300"
              style={{
                width: `${Math.min(
                  100,
                  (cashflowMetrics.realizedSum / (cashflowMetrics.totalIncome || 1)) * 100
                )}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-medium">
            <span className="text-rose-600">Terpakai: {maskNominal(cashflowMetrics.realizedSum)}</span>
            <span className="text-[#666E61]">Sisa Pagu: {maskNominal(cashflowMetrics.sisaAnggaran)}</span>
          </div>
        </div>

        {/* Net Cashflow Riil (Inflow - Outflow) */}
        {cashflowMetrics.realizedIncome > 0 && (
          <div className="pt-2 border-t border-[#EEEEEE] flex items-center justify-between text-[11px]">
            <span className="text-[#666E61]">Net Cashflow Riil (In - Out):</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-md ${
                cashflowMetrics.netCashflow >= 0
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {cashflowMetrics.netCashflow >= 0 ? "+" : ""}
              {maskNominal(cashflowMetrics.netCashflow)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

