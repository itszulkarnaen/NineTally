"use client";

import React, { useState, useEffect, useMemo } from "react";
import { formatRupiah } from "@/lib/utils";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import {
  X,
  Receipt,
  ArrowDownLeft,
  Search,
  Sparkles,
  Check,
} from "lucide-react";
import { BudgetPeriodItem, CashflowUnit } from "@/types";

interface RecordTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetItems: BudgetPeriodItem[];
  cashflowUnits: CashflowUnit[];
  preselectedUnitId?: string;
  defaultType?: "EXPENSE" | "INCOME";
  selectedMonth: string;
  onSaveTransaction: (data: {
    period_id: string;
    cashflow_unit_id: string;
    amount: number;
    date: string;
    notes?: string;
  }) => void;
}

export const RecordTransactionModal: React.FC<RecordTransactionModalProps> = ({
  isOpen,
  onClose,
  budgetItems,
  cashflowUnits,
  preselectedUnitId,
  defaultType = "EXPENSE",
  selectedMonth,
  onSaveTransaction,
}) => {
  const [txType, setTxType] = useState<"EXPENSE" | "INCOME">(defaultType);
  const [txNominal, setTxNominal] = useState<number>(0);
  const [txUnitId, setTxUnitId] = useState<string>("");
  const [txUnitSearch, setTxUnitSearch] = useState<string>("");
  const [txNotes, setTxNotes] = useState<string>("");
  const [txDate, setTxDate] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;

    setTxType(defaultType);
    setTxNominal(0);
    setTxNotes("");
    setTxUnitSearch("");
    setTxDate(new Date().toISOString().slice(0, 10));

    if (defaultType === "EXPENSE") {
      if (preselectedUnitId) {
        setTxUnitId(preselectedUnitId);
      } else if (budgetItems.length > 0) {
        const uncompletedItem = budgetItems.find((item) => {
          const spent = item.realization_amount ?? item.projection_amount ?? 0;
          return !( (item.budget_amount > 0 && spent >= item.budget_amount) || item.is_realized );
        });
        setTxUnitId(uncompletedItem ? uncompletedItem.cashflow_unit_id : budgetItems[0].cashflow_unit_id);
      }
    } else {
      const incUnits = cashflowUnits.filter((u) => u.unit_type === "INCOME" && u.is_active);
      if (preselectedUnitId) {
        setTxUnitId(preselectedUnitId);
      } else if (incUnits.length > 0) {
        setTxUnitId(incUnits[0].id);
      }
    }
  }, [isOpen, defaultType, preselectedUnitId, budgetItems, cashflowUnits]);

  // Search filter for modal Cashflow Unit selection (Expenses)
  const filteredModalBudgetItems = useMemo(() => {
    const isSearching = Boolean(txUnitSearch.trim());
    const q = txUnitSearch.toLowerCase().trim();

    return budgetItems.filter((item) => {
      const spent = item.realization_amount ?? item.projection_amount ?? 0;
      const isHundredPercent = (item.budget_amount > 0 && spent >= item.budget_amount) || item.is_realized;

      // 1. If NOT searching: hide items that have reached 100% budget!
      if (!isSearching && isHundredPercent) {
        return false;
      }

      // 2. If NOT searching and not 100%: include it
      if (!isSearching) return true;

      // 3. If searching: search across ALL items (including 100% ones)
      const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
      return (
        unit?.name.toLowerCase().includes(q) ||
        unit?.code.toLowerCase().includes(q)
      );
    });
  }, [budgetItems, cashflowUnits, txUnitSearch]);

  const selectedBudgetItem = useMemo(() => {
    return budgetItems.find((i) => i.cashflow_unit_id === txUnitId);
  }, [budgetItems, txUnitId]);

  // Search filter for modal Income Unit selection
  const filteredModalIncomeUnits = useMemo(() => {
    const incUnits = cashflowUnits.filter((u) => u.unit_type === "INCOME" && u.is_active);
    if (!txUnitSearch.trim()) return incUnits;
    const q = txUnitSearch.toLowerCase().trim();
    return incUnits.filter(
      (u) => u.name.toLowerCase().includes(q) || u.code.toLowerCase().includes(q)
    );
  }, [cashflowUnits, txUnitSearch]);

  const selectedIncomeUnit = useMemo(() => {
    return cashflowUnits.find((u) => u.id === txUnitId && u.unit_type === "INCOME");
  }, [cashflowUnits, txUnitId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (txNominal <= 0 || !txUnitId) return;

    onSaveTransaction({
      period_id: selectedMonth,
      cashflow_unit_id: txUnitId,
      amount: txNominal,
      date: txDate,
      notes: txNotes.trim() || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-[#FFFFFF] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
          <div>
            <h3 className="text-sm font-bold text-[#242921]">
              {txType === "EXPENSE" ? "Catat Pengeluaran Baru" : "Catat Pemasukan Baru"}
            </h3>
            <p className="text-[11px] text-[#666E61]">
              {txType === "EXPENSE"
                ? "Input mutasi transaksi ke dalam pos anggaran"
                : "Input pemasukan uang ke dalam rekening"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#EEEEEE] text-[#666E61] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Switcher: Pengeluaran vs Pemasukan */}
        <div className="flex items-center p-1 bg-[#E3F2FD]/50 rounded-xl border border-[#EEEEEE]">
          <button
            type="button"
            onClick={() => {
              setTxType("EXPENSE");
              if (budgetItems.length > 0) {
                const uncompletedItem = budgetItems.find((item) => {
                  const spent = item.realization_amount ?? item.projection_amount ?? 0;
                  return !( (item.budget_amount > 0 && spent >= item.budget_amount) || item.is_realized );
                });
                setTxUnitId(uncompletedItem ? uncompletedItem.cashflow_unit_id : budgetItems[0].cashflow_unit_id);
              }
              setTxNominal(0);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              txType === "EXPENSE"
                ? "bg-white text-rose-600 shadow-xs border border-rose-100"
                : "text-[#666E61] hover:text-[#242921]"
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-rose-500" />
            <span>Pengeluaran</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTxType("INCOME");
              const incUnits = cashflowUnits.filter((u) => u.unit_type === "INCOME" && u.is_active);
              if (incUnits.length > 0) {
                setTxUnitId(incUnits[0].id);
              }
              setTxNominal(0);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              txType === "INCOME"
                ? "bg-white text-emerald-600 shadow-xs border border-emerald-100"
                : "text-[#666E61] hover:text-[#242921]"
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
            <span>Pemasukan</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field 1: Pilih Pos Pengeluaran / Sumber Pemasukan */}
          {txType === "EXPENSE" ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-[#666E61]">
                  Pilih Cashflow Item <span className="text-rose-500">*</span>
                </label>
                {selectedBudgetItem && (
                  <span className="text-[10px] font-bold text-[#2196F3] bg-[#2196F3]/10 px-2 py-0.5 rounded-md">
                    Budget: {formatRupiah(selectedBudgetItem.budget_amount)}
                  </span>
                )}
              </div>

              {/* Search Bar for CF Units */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666E61]" />
                <input
                  type="text"
                  placeholder="Cari pos pengeluaran..."
                  value={txUnitSearch}
                  onChange={(e) => setTxUnitSearch(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 text-xs bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl text-[#242921] placeholder:text-[#666E61]/60 focus:border-[#2196F3] focus:outline-hidden"
                />
                {txUnitSearch && (
                  <button
                    type="button"
                    onClick={() => setTxUnitSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666E61] hover:text-[#242921] p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Clean Scrollable List */}
              <div className="max-h-40 overflow-y-auto border border-[#EEEEEE] rounded-xl divide-y divide-[#EEEEEE] bg-[#FFFFFF] shadow-2xs">
                {filteredModalBudgetItems.length === 0 ? (
                  <div className="p-3 text-center text-xs text-[#666E61]">
                    {budgetItems.length === 0
                      ? "Belum ada item anggaran di bulan ini"
                      : txUnitSearch.trim()
                      ? "Tidak ada pos yang cocok"
                      : "Semua pos anggaran sudah 100% tercapai. Cari nama item di atas jika ingin catat pengeluaran tambahan."}
                  </div>
                ) : (
                  filteredModalBudgetItems.map((item) => {
                    const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
                    const isSelected = txUnitId === item.cashflow_unit_id;
                    const spent = item.realization_amount ?? item.projection_amount ?? 0;
                    const isCompleted =
                      (item.budget_amount > 0 && spent >= item.budget_amount) || item.is_realized;

                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setTxUnitId(item.cashflow_unit_id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left transition cursor-pointer ${
                          isSelected
                            ? "bg-[#2196F3] text-white font-bold"
                            : "hover:bg-[#E3F2FD]/40 text-[#242921]"
                        }`}
                      >
                        <span className="text-xs truncate font-medium flex items-center gap-1.5">
                          <span>{unit?.name || "Cashflow Item"}</span>
                          {isCompleted && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              100%
                            </span>
                          )}
                        </span>
                        <span
                          className={`text-xs shrink-0 ml-3 font-semibold ${
                            isSelected ? "text-white" : "text-[#2196F3]"
                          }`}
                        >
                          {formatRupiah(item.budget_amount)}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-[#666E61]">
                  Pilih Sumber Pemasukan <span className="text-rose-500">*</span>
                </label>
                {selectedIncomeUnit && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    {selectedIncomeUnit.name}
                  </span>
                )}
              </div>

              {/* Search Bar for Income Units */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666E61]" />
                <input
                  type="text"
                  placeholder="Cari sumber pemasukan..."
                  value={txUnitSearch}
                  onChange={(e) => setTxUnitSearch(e.target.value)}
                  className="w-full pl-8 pr-8 py-2 text-xs bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl text-[#242921] placeholder:text-[#666E61]/60 focus:border-[#2196F3] focus:outline-hidden"
                />
                {txUnitSearch && (
                  <button
                    type="button"
                    onClick={() => setTxUnitSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666E61] hover:text-[#242921] p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* List Income Units */}
              <div className="max-h-40 overflow-y-auto border border-[#EEEEEE] rounded-xl divide-y divide-[#EEEEEE] bg-[#FFFFFF] shadow-2xs">
                {filteredModalIncomeUnits.length === 0 ? (
                  <div className="p-3 text-center text-xs text-[#666E61]">
                    Belum ada sumber pemasukan yang cocok.
                  </div>
                ) : (
                  filteredModalIncomeUnits.map((u) => {
                    const isSelected = txUnitId === u.id;
                    return (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => setTxUnitId(u.id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left transition cursor-pointer ${
                          isSelected
                            ? "bg-emerald-600 text-white font-bold"
                            : "hover:bg-emerald-50/50 text-[#242921]"
                        }`}
                      >
                        <span className="text-xs truncate font-medium">{u.name}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            isSelected ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          Income
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Field 2: Nominal Transaksi & Actions */}
          <div>
            <label className="text-[11px] font-semibold text-[#666E61] block mb-1">
              Nominal {txType === "EXPENSE" ? "Pengeluaran" : "Pemasukan"} (Rp) <span className="text-rose-500">*</span>
            </label>
            <CurrencyInput
              value={txNominal}
              onChange={setTxNominal}
              textAlign="left"
              placeholder="0"
            />

            {/* Quick Actions */}
            <div className="flex items-center justify-between mt-2">
              {txType === "EXPENSE" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedBudgetItem) {
                      setTxNominal(selectedBudgetItem.budget_amount);
                    }
                  }}
                  disabled={!selectedBudgetItem || selectedBudgetItem.budget_amount <= 0}
                  className="px-3 py-1.5 text-xs font-bold bg-[#2196F3] text-white hover:bg-[#1E88E5] active:scale-95 transition rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Isi otomatis sama dengan nominal budget item"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Complete {selectedBudgetItem ? `(${formatRupiah(selectedBudgetItem.budget_amount)})` : ""}
                  </span>
                </button>
              ) : (
                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <ArrowDownLeft className="w-3.5 h-3.5" /> Otomatis menambah saldo bank BCA
                </span>
              )}

              {txNominal > 0 && (
                <button
                  type="button"
                  onClick={() => setTxNominal(0)}
                  className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Field 3: Catatan / Keterangan */}
          <div>
            <label className="text-[11px] font-semibold text-[#666E61] block mb-1">
              Catatan / Keterangan (Opsional)
            </label>
            <input
              type="text"
              placeholder={
                txType === "EXPENSE"
                  ? "misal: Makan siang sate, beli bensin..."
                  : "misal: Gaji bulan ini, freelance website..."
              }
              value={txNotes}
              onChange={(e) => setTxNotes(e.target.value)}
              className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921] focus:border-[#2196F3] focus:outline-hidden"
            />
          </div>

          {/* Field 4: Tanggal Transaksi */}
          <div>
            <label className="text-[11px] font-semibold text-[#666E61] block mb-1">
              Tanggal Transaksi
            </label>
            <input
              type="date"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921] focus:border-[#2196F3] focus:outline-hidden"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={txNominal <= 0 || !txUnitId}
            className={`w-full py-3 rounded-2xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer ${
              txNominal <= 0 || !txUnitId
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : txType === "INCOME"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.99]"
                : "bg-[#2196F3] hover:bg-[#1E88E5] text-white active:scale-[0.99]"
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>
              {txType === "INCOME" ? "Simpan Pemasukan" : "Simpan Pengeluaran"}{" "}
              {txNominal > 0 ? `(${formatRupiah(txNominal)})` : ""}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};

