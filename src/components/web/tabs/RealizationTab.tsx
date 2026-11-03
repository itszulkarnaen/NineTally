"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { formatRupiah } from "@/lib/utils";
import { Search, X, Check, AlertTriangle } from "lucide-react";

export const RealizationTab: React.FC = () => {
  const {
    currentMonthData,
    cashflowUnits,
    selectedMonth,
    toggleItemRealized,
  } = useApp();

  const [realizationSearch, setRealizationSearch] = useState("");
  const isLocked = currentMonthData.status === "LOCKED";
  const budgetItems = currentMonthData.items;

  const totalRealization = budgetItems.reduce(
    (acc, curr) => acc + (curr.realization_amount ?? curr.projection_amount ?? 0),
    0
  );
  const totalBudget = budgetItems.reduce((acc, curr) => acc + curr.budget_amount, 0);
  const netDifference = totalRealization - totalBudget;
  const realizedCount = budgetItems.filter((i) => i.is_realized).length;
  const progressPct = budgetItems.length > 0 ? Math.round((realizedCount / budgetItems.length) * 100) : 0;
  const sisaKasAnggaran = (currentMonthData.salary_budget + currentMonthData.additional_budget) - totalRealization;

  // Finance Status Helper (Professional Terminology)
  const getFinanceStatus = (item: typeof budgetItems[0]) => {
    const spent = item.realization_amount ?? item.projection_amount ?? 0;
    const budget = item.budget_amount;

    // 1. Overbudget (Realisasi melebihi budget)
    if ((budget > 0 && spent > budget) || (budget === 0 && spent > 0)) {
      return {
        label: "Overbudget",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
        icon: AlertTriangle,
      };
    }

    // 2. Settled (Lunas / Terbayar 100% sesuai budget atau ditandai manual/selesai)
    if ((budget > 0 && spent >= budget) || item.is_realized) {
      const isUnderbudget = budget > 0 && spent < budget;
      return {
        label: isUnderbudget ? "Settled (Hemat)" : "Settled",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: Check,
      };
    }

    // 3. Partially Paid (Realisasi berjalan tapi belum mencapai 100% budget & belum selesai)
    if (budget > 0 && spent > 0 && spent < budget) {
      return {
        label: "Partially Paid",
        badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
        icon: null,
      };
    }

    // 4. Outstanding (Belum ada realisasi / 0)
    return {
      label: "Outstanding",
      badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
      icon: null,
    };
  };

  // Urgency ranking: HIGHEST -> HIGH -> NORMAL
  const urgencyRank: Record<string, number> = {
    HIGHEST: 1,
    HIGH: 2,
    NORMAL: 3,
  };

  // 1. Sort by urgency descending
  const sortedItems = [...budgetItems].sort((a, b) => {
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

  // 2. Filter by search query
  const filteredItems = sortedItems.filter((item) => {
    if (!realizationSearch.trim()) return true;
    const q = realizationSearch.toLowerCase().trim();
    const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
    const status = getFinanceStatus(item);
    return (
      unit?.name.toLowerCase().includes(q) ||
      unit?.code.toLowerCase().includes(q) ||
      unit?.category?.toLowerCase().includes(q) ||
      item.urgency.toLowerCase().includes(q) ||
      status.label.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Realization Summary Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1: Budget Baseline */}
        <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] text-[#666E61] font-semibold block">Total Alokasi Budget</span>
          <span className="text-lg font-bold text-[#242921] mt-2">{formatRupiah(totalBudget)}</span>
          <span className="text-[10px] text-[#666E61] mt-1 block">Baseline awal bulan</span>
        </div>

        {/* Metric 2: Realization Running */}
        <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] text-[#666E61] font-semibold block">Total Realisasi</span>
          <span className="text-lg font-bold text-[#2196F3] mt-2">{formatRupiah(totalRealization)}</span>
          <div className="mt-1 flex items-center gap-1.5 text-[10px]">
            <span className="font-semibold text-[#666E61]">Variansi:</span>
            <span
              className={`font-bold ${
                netDifference > 0 ? "text-rose-600" : netDifference < 0 ? "text-[#2196F3]" : "text-[#666E61]"
              }`}
            >
              {netDifference > 0
                ? `+${formatRupiah(netDifference)} (Over)`
                : netDifference < 0
                ? `${formatRupiah(netDifference)} (Hemat)`
                : "Sesuai"}
            </span>
          </div>
        </div>

        {/* Metric 3: Sisa Kas Tersedia */}
        <div
          className={`rounded-3xl p-5 border shadow-xs flex flex-col justify-between ${
            sisaKasAnggaran < 0 ? "bg-rose-50 border-rose-200" : "bg-[#FFFFFF] border-[#EEEEEE]"
          }`}
        >
          <span className="text-[11px] text-[#666E61] font-semibold block">Sisa Kas Tersedia</span>
          <span className={`text-lg font-bold mt-2 ${sisaKasAnggaran < 0 ? "text-rose-600" : "text-[#242921]"}`}>
            {formatRupiah(sisaKasAnggaran)}
          </span>
          <span className="text-[10px] text-[#666E61] mt-1 block">
            Dari Total Pemasukan ({formatRupiah(currentMonthData.salary_budget + currentMonthData.additional_budget)})
          </span>
        </div>

        {/* Metric 4: Progress Checklist Paid */}
        <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#666E61] font-semibold block">Status Pembayaran</span>
            <span className="text-xs font-bold text-[#2196F3]">{progressPct}%</span>
          </div>
          <div className="w-full bg-[#EEEEEE] h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[#2196F3] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[10px] text-[#666E61] mt-1 block">
            <strong>{realizedCount}</strong> dari {budgetItems.length} item terlaksana
          </span>
        </div>
      </div>

      {/* Realization Table Workspace */}
      <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EEEEEE]">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#242921]">
              Daftar Realisasi Cashflow Items ({budgetItems.length} Item)
            </h3>
            <p className="text-xs text-[#666E61] mt-0.5">
              Status realisasi pengeluaran berbasis transaksi. Klik status untuk mengubah status item.
            </p>
          </div>

          {/* Search Bar on Table */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#666E61] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari item, kategori, status..."
                value={realizationSearch}
                onChange={(e) => setRealizationSearch(e.target.value)}
                className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl pl-8 pr-7 py-1.5 text-xs text-[#242921] placeholder:text-[#666E61]/60 focus:outline-none focus:border-[#2196F3]"
              />
              {realizationSearch && (
                <button
                  onClick={() => setRealizationSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666E61] hover:text-[#242921] p-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {budgetItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#666E61]">
            Belum ada cashflow item yang dibuat di bulan {selectedMonth}. Susun item di menu <strong>Budget</strong> terlebih dahulu.
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-xs font-bold text-[#242921]">Item Tidak Ditemukan</p>
            <p className="text-xs text-[#666E61]">
              Tidak ada item yang cocok dengan kata kunci &ldquo;{realizationSearch}&rdquo;.
            </p>
            <button
              onClick={() => setRealizationSearch("")}
              className="text-xs font-bold text-[#2196F3] underline cursor-pointer"
            >
              Reset Pencarian
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EEEEEE] text-[#666E61]">
                  <th className="py-2 px-3">Nama Cashflow Item</th>
                  <th className="py-2 px-3">Kategori</th>
                  <th className="py-2 px-3">Urgency</th>
                  <th className="py-2 px-3">Budget Plan</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-right">Selisih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEEE] text-[#242921]">
                {filteredItems.map((item) => {
                  const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
                  const currentRealization = item.realization_amount ?? item.projection_amount ?? 0;
                  const diff = currentRealization - item.budget_amount;
                  const statusInfo = getFinanceStatus(item);

                  return (
                    <tr key={item.id} className="hover:bg-[#E3F2FD]/20 transition">
                      <td className="py-2 px-3">
                        <span className="font-semibold text-xs text-[#242921] whitespace-nowrap">
                          {unit?.name || "Cashflow Item"}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#E3F2FD] text-[#666E61] font-semibold whitespace-nowrap">
                          {unit?.category || unit?.unit_type}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                            item.urgency === "HIGHEST"
                              ? "text-rose-600 bg-rose-50"
                              : item.urgency === "HIGH"
                              ? "text-amber-700 bg-amber-50"
                              : "text-[#666E61] bg-slate-100"
                          }`}
                        >
                          {item.urgency}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium text-[#242921] whitespace-nowrap">
                        {formatRupiah(item.budget_amount)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => toggleItemRealized(item.id)}
                          disabled={isLocked}
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border transition flex items-center justify-center gap-1 mx-auto whitespace-nowrap active:scale-95 cursor-pointer ${statusInfo.badgeClass}`}
                          title="Klik untuk ubah status realisasi"
                        >
                          {statusInfo.icon && <statusInfo.icon className="w-3 h-3 shrink-0" />}
                          <span>{statusInfo.label}</span>
                        </button>
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        {diff > 0 ? (
                          <span className="text-rose-600 font-bold text-xs">
                            +{formatRupiah(diff)}
                          </span>
                        ) : diff < 0 && (currentRealization > 0 || item.is_realized) ? (
                          <span className="text-emerald-600 font-semibold text-xs" title="Hemat / Sisa Budget">
                            -{formatRupiah(Math.abs(diff))}
                          </span>
                        ) : (
                          <span className="text-[#666E61] text-xs font-medium">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

