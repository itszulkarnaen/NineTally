"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { formatRupiah } from "@/lib/utils";
import {
  Search,
  X,
  ChevronDown,
  Plus,
  Loader2,
  Receipt,
  ArrowDownLeft,
  Trash2,
  Pencil,
} from "lucide-react";
import { BudgetPeriodItem, CashflowUnit, CashflowTransaction, UrgencyLevel } from "@/types";
import { TransactionView } from "../types";

interface TransactionsTabProps {
  budgetItems: BudgetPeriodItem[];
  cashflowUnits: CashflowUnit[];
  monthTransactions: CashflowTransaction[];
  selectedMonth: string;
  onOpenTxModal: (preselectedUnitId?: string) => void;
  onEditTransaction: (tx: CashflowTransaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  budgetItems,
  cashflowUnits,
  monthTransactions,
  selectedMonth,
  onOpenTxModal,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [transactionView, setTransactionView] = useState<TransactionView>("items");
  const [selectedPosFilter, setSelectedPosFilter] = useState<string>("ALL");

  // Search & Infinite Scroll pagination for Cashflow Items
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleItemLimit, setVisibleItemLimit] = useState(10);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Accordion expansion state for Cashflow Unit items (default collapsed = 1 baris)
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});
  const toggleItemExpand = (id: string) => {
    setExpandedItemIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Sort budget items by Priority (HIGHEST > HIGH > NORMAL), then sort_order, then name
  const sortedBudgetItems = useMemo(() => {
    const urgencyRank: Record<string, number> = {
      HIGHEST: 1,
      HIGH: 2,
      NORMAL: 3,
    };

    return [...budgetItems].sort((a, b) => {
      const rankA = a.urgency ? (urgencyRank[a.urgency] ?? 99) : 99;
      const rankB = b.urgency ? (urgencyRank[b.urgency] ?? 99) : 99;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      }
      const unitA = cashflowUnits.find((u) => u.id === a.cashflow_unit_id)?.name || "";
      const unitB = cashflowUnits.find((u) => u.id === b.cashflow_unit_id)?.name || "";
      return unitA.localeCompare(unitB);
    });
  }, [budgetItems, cashflowUnits]);

  // Filter and search Cashflow Items
  const filteredBudgetItems = useMemo(() => {
    if (!searchQuery.trim()) return sortedBudgetItems;
    const q = searchQuery.toLowerCase().trim();
    return sortedBudgetItems.filter((item) => {
      const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
      return (
        unit?.name.toLowerCase().includes(q) ||
        unit?.code.toLowerCase().includes(q) ||
        unit?.category?.toLowerCase().includes(q)
      );
    });
  }, [sortedBudgetItems, cashflowUnits, searchQuery]);

  // Paginated visible Cashflow Items
  const displayedBudgetItems = useMemo(() => {
    return filteredBudgetItems.slice(0, visibleItemLimit);
  }, [filteredBudgetItems, visibleItemLimit]);

  // Reset pagination limit & accordion when search query or month changes
  useEffect(() => {
    setVisibleItemLimit(10);
  }, [searchQuery]);

  useEffect(() => {
    setVisibleItemLimit(10);
    setExpandedItemIds({});
  }, [selectedMonth]);

  // Infinite Scroll IntersectionObserver trigger
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleItemLimit((prev) => {
            if (prev < filteredBudgetItems.length) {
              return prev + 10;
            }
            return prev;
          });
        }
      },
      { threshold: 0.1, rootMargin: "150px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [filteredBudgetItems.length]);

  // Filtered transactions if user filters by cashflow item
  const filteredTransactions = useMemo(() => {
    if (selectedPosFilter === "ALL") return monthTransactions;
    return monthTransactions.filter((t) => t.cashflow_unit_id === selectedPosFilter);
  }, [monthTransactions, selectedPosFilter]);

  const getUrgencyPill = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case "HIGHEST":
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">HIGHEST</span>;
      case "HIGH":
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">HIGH</span>;
      case "NORMAL":
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2196F3]/15 text-[#2196F3] border border-[#2196F3]/30">NORMAL</span>;
    }
  };

  return (
    <div className="space-y-3">
      {/* View Mode Switcher: Cashflow Items vs Riwayat Log */}
      <div className="flex items-center justify-between p-1 bg-[#FFFFFF] border border-[#EEEEEE] rounded-xl text-xs">
        <button
          onClick={() => setTransactionView("items")}
          className={`flex-1 py-1.5 rounded-lg font-bold transition text-center cursor-pointer ${
            transactionView === "items"
              ? "bg-[#E3F2FD] text-[#242921] shadow-2xs"
              : "text-[#666E61] hover:text-[#242921]"
          }`}
        >
          Cashflow Unit ({budgetItems.length})
        </button>
        <button
          onClick={() => setTransactionView("history")}
          className={`flex-1 py-1.5 rounded-lg font-bold transition text-center cursor-pointer ${
            transactionView === "history"
              ? "bg-[#E3F2FD] text-[#242921] shadow-2xs"
              : "text-[#666E61] hover:text-[#242921]"
          }`}
        >
          Riwayat Transaksi ({monthTransactions.length})
        </button>
      </div>

      {/* VIEW A: CASHFLOW ITEMS CARDS WITH SEARCH & INFINITE SCROLL */}
      {transactionView === "items" && (
        <div className="space-y-2.5">
          {/* Search Bar for Cashflow Items */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#666E61] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari cashflow item... (e.g. Makan, Kos, Bensin)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl pl-10 pr-9 py-2.5 text-xs text-[#242921] placeholder:text-[#666E61]/60 shadow-xs focus:outline-none focus:border-[#2196F3]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#242921] p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {budgetItems.length === 0 ? (
            <div className="p-8 text-center bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl space-y-2">
              <p className="text-xs font-bold text-[#242921]">Belum Ada Cashflow Item</p>
              <p className="text-[11px] text-[#666E61]">
                Bulan ini belum diisi. Setup anggaran di Web Console terlebih dahulu.
              </p>
            </div>
          ) : filteredBudgetItems.length === 0 ? (
            <div className="p-8 text-center bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl space-y-2">
              <p className="text-xs font-bold text-[#242921]">Cashflow Item Tidak Ditemukan</p>
              <p className="text-[11px] text-[#666E61]">
                Tidak ada hasil yang cocok dengan kata kunci &ldquo;{searchQuery}&rdquo;.
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs font-bold text-[#2196F3] underline cursor-pointer"
              >
                Reset Pencarian
              </button>
            </div>
          ) : (
            <>
              {displayedBudgetItems.map((item) => {
                const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
                const itemTx = monthTransactions.filter((t) => t.cashflow_unit_id === item.cashflow_unit_id);
                const spent = item.realization_amount ?? item.projection_amount ?? 0;
                const budget = item.budget_amount;
                const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                const isOver = spent > budget;
                const isExpanded = Boolean(expandedItemIds[item.id]);

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border bg-[#FFFFFF] shadow-2xs transition overflow-hidden ${
                      isOver ? "border-rose-200" : "border-[#EEEEEE]"
                    }`}
                  >
                    {/* 1 BARIS DEFAULT SUMMARY (NAMA, PROGRES BAR, ICON EXPAND) */}
                    <button
                      type="button"
                      onClick={() => toggleItemExpand(item.id)}
                      className="w-full flex items-center justify-between gap-3 p-3.5 text-left select-none active:bg-[#E3F2FD]/30 transition cursor-pointer"
                    >
                      {/* 1. Nama */}
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs text-[#242921] truncate flex items-center gap-1.5">
                          <span>{unit?.name || "Cashflow Unit"}</span>
                          {item.is_realized && !isOver && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              ✓ Selesai
                            </span>
                          )}
                        </span>
                      </div>

                      {/* 2. Progres Bar */}
                      <div className="flex items-center gap-2 shrink-0 w-28 sm:w-36">
                        <div className="flex-1 bg-[#EEEEEE] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOver
                                ? "bg-rose-500"
                                : item.is_realized
                                ? "bg-emerald-500"
                                : "bg-[#2196F3]"
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <span
                          className={`text-[10px] font-bold w-7 text-right shrink-0 ${
                            isOver
                              ? "text-rose-600"
                              : item.is_realized
                              ? "text-emerald-600"
                              : "text-[#666E61]"
                          }`}
                        >
                          {pct}%
                        </span>
                      </div>

                      {/* 3. Icon Expand */}
                      <div className="text-[#666E61] shrink-0">
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isExpanded ? "rotate-180 text-[#2196F3]" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {/* EXPANDED VIEW */}
                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-[#EEEEEE]/80 animate-in fade-in-50 duration-150">
                        {/* Category, Urgency & Status Badge */}
                        <div className="flex items-start justify-between gap-2 pt-1">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-[#666E61]">
                                {unit?.category || unit?.unit_type}
                              </span>
                              {getUrgencyPill(item.urgency)}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="text-right shrink-0">
                            {isOver ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                                Overbudget
                              </span>
                            ) : spent >= budget && budget > 0 ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2196F3]/15 text-[#2196F3] border border-[#2196F3]/30">
                                100% Tercapai
                              </span>
                            ) : item.is_realized ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                Selesai (Hemat {formatRupiah(budget - spent)})
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E3F2FD] text-[#666E61]">
                                {pct}% Terpakai
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress Detail: Realisasi vs Plafon */}
                        <div className="flex items-center justify-between text-[11px] bg-[#E3F2FD]/30 p-2 rounded-xl border border-[#EEEEEE]">
                          <span className="text-[#666E61]">
                            Realisasi: <strong className={isOver ? "text-rose-600" : "text-[#242921]"}>{formatRupiah(spent)}</strong>
                          </span>
                          <span className="text-[#666E61]">
                            Plafon: <strong>{formatRupiah(budget)}</strong>
                          </span>
                        </div>

                        {/* Footer: Count & Quick Catat Button */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#EEEEEE] text-[11px]">
                          <span className="text-[#666E61]">
                            {itemTx.length > 0 ? (
                              <span><strong>{itemTx.length}</strong> transaksi tercatat</span>
                            ) : (
                              <span className="italic">Belum ada transaksi</span>
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={() => onOpenTxModal(item.cashflow_unit_id)}
                            className="px-3 py-1 rounded-xl bg-[#2196F3]/15 hover:bg-[#2196F3]/25 text-[#2196F3] font-bold text-[11px] transition flex items-center gap-1 border border-[#2196F3]/30 active:scale-95 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Catat</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Infinite Scroll Sentinel / Load More */}
              {visibleItemLimit < filteredBudgetItems.length ? (
                <div className="space-y-2 pt-1 pb-2">
                  <div ref={sentinelRef} className="py-2 flex items-center justify-center gap-2 text-xs text-[#666E61]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2196F3]" />
                    <span>Scroll untuk memuat 10 item lagi...</span>
                  </div>
                  <button
                    onClick={() => setVisibleItemLimit((prev) => prev + 10)}
                    className="w-full py-2 bg-[#FFFFFF] hover:bg-[#EEEEEE] border border-[#EEEEEE] rounded-2xl text-xs font-semibold text-[#666E61] transition shadow-2xs cursor-pointer"
                  >
                    Muat 10 Cashflow Item Lagi ({displayedBudgetItems.length}/{filteredBudgetItems.length})
                  </button>
                </div>
              ) : (
                filteredBudgetItems.length > 10 && (
                  <div className="text-center text-[10px] text-[#666E61] py-2">
                    Menampilkan seluruh {filteredBudgetItems.length} cashflow items
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}

      {/* VIEW B: RIWAYAT TRANSAKSI FEED */}
      {transactionView === "history" && (
        <div className="space-y-2.5">
          {/* Cashflow Item Filter Dropdown */}
          <div className="flex items-center justify-between gap-2 bg-[#FFFFFF] p-2.5 rounded-2xl border border-[#EEEEEE] text-xs">
            <span className="text-[#666E61] font-semibold shrink-0">Filter Item:</span>
            <select
              value={selectedPosFilter}
              onChange={(e) => setSelectedPosFilter(e.target.value)}
              className="flex-1 bg-[#E3F2FD]/40 border border-[#EEEEEE] rounded-xl px-2.5 py-1 text-xs text-[#242921] font-medium"
            >
              <option value="ALL">Semua Transaksi ({monthTransactions.length})</option>
              <optgroup label="Pengeluaran (Expense)">
                {budgetItems.map((item) => {
                  const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
                  const count = monthTransactions.filter((t) => t.cashflow_unit_id === item.cashflow_unit_id).length;
                  return (
                    <option key={item.id} value={item.cashflow_unit_id}>
                      {unit?.name} ({count})
                    </option>
                  );
                })}
              </optgroup>
              <optgroup label="Pemasukan (Income)">
                {cashflowUnits
                  .filter((u) => u.unit_type === "INCOME")
                  .map((u) => {
                    const count = monthTransactions.filter((t) => t.cashflow_unit_id === u.id).length;
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name} ({count})
                      </option>
                    );
                  })}
              </optgroup>
            </select>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl space-y-2">
              <p className="text-xs font-bold text-[#242921]">Belum Ada Transaksi</p>
              <p className="text-[11px] text-[#666E61]">
                {selectedPosFilter === "ALL"
                  ? "Klik tombol di atas untuk mencatat transaksi perdana."
                  : "Belum ada transaksi pada pos yang dipilih."}
              </p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const unit = cashflowUnits.find((u) => u.id === tx.cashflow_unit_id);
              const isIncome = unit?.unit_type === "INCOME";

              return (
                <div
                  key={tx.id}
                  className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isIncome
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-[#2196F3]/15 text-[#2196F3]"
                      }`}
                    >
                      {isIncome ? <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> : <Receipt className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-[#242921] truncate">{unit?.name || "Transaksi"}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            isIncome
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-[#E3F2FD] text-[#666E61]"
                          }`}
                        >
                          {isIncome ? "INCOME" : unit?.category || unit?.unit_type}
                        </span>
                      </div>
                      {tx.notes && (
                        <p className="text-[11px] text-[#666E61] mt-0.5 truncate">{tx.notes}</p>
                      )}
                      <span className="text-[10px] text-slate-400 block mt-0.5">{tx.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-bold text-xs ${isIncome ? "text-emerald-600" : "text-[#242921]"}`}>
                      {isIncome ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditTransaction(tx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#2196F3] hover:bg-[#E3F2FD] transition cursor-pointer"
                        title="Edit transaksi ini"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Hapus transaksi ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

