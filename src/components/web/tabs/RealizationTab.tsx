"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useApp, getNextMonthKey, getPreviousMonthKey } from "@/context/AppContext";
import { formatRupiah } from "@/lib/utils";
import {
  Search,
  X,
  Check,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  RotateCcw,
} from "lucide-react";
import { BudgetPeriodItem } from "@/types";
import { RealizationDetailModal } from "../modals/RealizationDetailModal";

type SortField = "name" | "category" | "urgency" | "budget" | "status" | "diff";
type SortDirection = "asc" | "desc";

function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if (currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

export const RealizationTab: React.FC = () => {
  const {
    currentMonthData,
    cashflowUnits,
    categories,
    selectedMonth,
    toggleItemRealized,
    transactions,
    payrollSettings,
    getPreviousMonthUnitNominal,
  } = useApp();

  // Search & Filter State
  const [realizationSearch, setRealizationSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterUrgency, setFilterUrgency] = useState<string>("ALL");

  // Sorting State
  const [sortField, setSortField] = useState<SortField>("urgency");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal State
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<BudgetPeriodItem | null>(null);

  const isLocked = currentMonthData.status === "LOCKED";
  const budgetItems = currentMonthData.items;

  const prevMonthKey = getPreviousMonthKey(selectedMonth);
  const nextMonthKey = getNextMonthKey(selectedMonth);

  const targetIncomeUnit =
    cashflowUnits.find((u) => u.id === payrollSettings.target_unit_id) ||
    cashflowUnits.find((u) => u.unit_type === "INCOME");
  const incomeUnitId = targetIncomeUnit ? targetIncomeUnit.id : payrollSettings.target_unit_id;

  // Separate Outflow (EXPENSE & ASSET) from INCOME so INCOME is never counted as spending
  const outflowItems = budgetItems.filter((item) => {
    const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
    return unit?.unit_type !== "INCOME";
  });

  const incomeItems = budgetItems.filter((item) => {
    const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
    return unit?.unit_type === "INCOME";
  });

  const prevMonthSalaryNominal = targetIncomeUnit
    ? getPreviousMonthUnitNominal(targetIncomeUnit.id)
    : null;
  const baseSalaryForCurrentMonth = payrollSettings.next_month_allocation
    ? prevMonthSalaryNominal ?? (currentMonthData.salary_budget || payrollSettings.monthly_salary)
    : 0;
  const additionalIncomeFromUnits = incomeItems.reduce((acc, item) => {
    const isRolloverSalary =
      payrollSettings.next_month_allocation && item.cashflow_unit_id === incomeUnitId;
    return isRolloverSalary ? acc : acc + item.budget_amount;
  }, 0);
  const totalModalIncome = baseSalaryForCurrentMonth + additionalIncomeFromUnits;

  // Summary Metrics (Outflow / Pengeluaran & Alokasi Aset Only)
  const totalRealization = outflowItems.reduce(
    (acc, curr) => acc + (curr.realization_amount ?? curr.projection_amount ?? 0),
    0
  );
  const totalBudget = outflowItems.reduce((acc, curr) => acc + curr.budget_amount, 0);
  const netDifference = totalRealization - totalBudget;
  const realizedCount = budgetItems.filter((i) => i.is_realized).length;
  const progressPct = budgetItems.length > 0 ? Math.round((realizedCount / budgetItems.length) * 100) : 0;
  const sisaKasAnggaran = totalModalIncome - totalRealization;

  // Finance Status Helper (Professional Terminology)
  const getFinanceStatus = (item: typeof budgetItems[0]) => {
    const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
    const isIncome = unit?.unit_type === "INCOME";
    const spent = item.realization_amount ?? item.projection_amount ?? 0;
    const budget = item.budget_amount;

    if (isIncome) {
      if ((budget > 0 && spent >= budget) || item.is_realized) {
        return {
          label: "Settled",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: Check,
        };
      }
      if (spent > 0) {
        return {
          label: "Partially Paid",
          badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
          icon: null,
        };
      }
      return {
        label: "Outstanding",
        badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
        icon: null,
      };
    }

    // 1. Overbudget (Realisasi pengeluaran melebihi budget)
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

  // Available categories for filter dropdown
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    budgetItems.forEach((item) => {
      const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
      if (unit?.category) set.add(unit.category);
    });
    categories.forEach((c) => {
      if (c.code) set.add(c.code);
    });
    return Array.from(set).sort();
  }, [budgetItems, cashflowUnits, categories]);

  const getCategoryLabel = (code: string) => {
    const found = categories.find((c) => c.code === code);
    return found ? `${found.name} (${found.code})` : code;
  };

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [realizationSearch, filterCategory, filterStatus, filterUrgency, pageSize]);

  // 1. Filter items by category, status, urgency, and search query
  const filteredItems = useMemo(() => {
    return budgetItems.filter((item) => {
      const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
      const status = getFinanceStatus(item);

      // Kategori Filter
      if (filterCategory !== "ALL") {
        const itemCat = unit?.category || unit?.unit_type;
        if (itemCat !== filterCategory) return false;
      }

      // Status Filter
      if (filterStatus !== "ALL") {
        if (!status.label.startsWith(filterStatus)) {
          return false;
        }
      }

      // Urgency Filter
      if (filterUrgency !== "ALL") {
        if (item.urgency !== filterUrgency) return false;
      }

      // Search Query
      if (realizationSearch.trim()) {
        const q = realizationSearch.toLowerCase().trim();
        const matches =
          (unit?.name && unit.name.toLowerCase().includes(q)) ||
          (unit?.code && unit.code.toLowerCase().includes(q)) ||
          (unit?.category && unit.category.toLowerCase().includes(q)) ||
          item.urgency.toLowerCase().includes(q) ||
          status.label.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [budgetItems, cashflowUnits, filterCategory, filterStatus, filterUrgency, realizationSearch]);

  // 2. Sort filtered items
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const unitA = cashflowUnits.find((u) => u.id === a.cashflow_unit_id);
      const unitB = cashflowUnits.find((u) => u.id === b.cashflow_unit_id);

      if (sortField === "name") {
        const nameA = unitA?.name || "";
        const nameB = unitB?.name || "";
        const cmp = nameA.localeCompare(nameB);
        return sortDirection === "asc" ? cmp : -cmp;
      }

      if (sortField === "category") {
        const catA = unitA?.category || unitA?.unit_type || "";
        const catB = unitB?.category || unitB?.unit_type || "";
        const cmp = catA.localeCompare(catB);
        return sortDirection === "asc" ? cmp : -cmp;
      }

      if (sortField === "urgency") {
        const rankA = a.urgency ? (urgencyRank[a.urgency] ?? 99) : 99;
        const rankB = b.urgency ? (urgencyRank[b.urgency] ?? 99) : 99;
        if (rankA !== rankB) {
          return sortDirection === "asc" ? rankA - rankB : rankB - rankA;
        }
        if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        }
        const nameA = unitA?.name || "";
        const nameB = unitB?.name || "";
        return nameA.localeCompare(nameB);
      }

      if (sortField === "budget") {
        const diff = a.budget_amount - b.budget_amount;
        return sortDirection === "asc" ? diff : -diff;
      }

      if (sortField === "status") {
        const statusA = getFinanceStatus(a).label;
        const statusB = getFinanceStatus(b).label;
        const cmp = statusA.localeCompare(statusB);
        return sortDirection === "asc" ? cmp : -cmp;
      }

      if (sortField === "diff") {
        const spentA = a.realization_amount ?? a.projection_amount ?? 0;
        const spentB = b.realization_amount ?? b.projection_amount ?? 0;
        const diffA = spentA - a.budget_amount;
        const diffB = spentB - b.budget_amount;
        const delta = diffA - diffB;
        return sortDirection === "asc" ? delta : -delta;
      }

      return 0;
    });
  }, [filteredItems, cashflowUnits, sortField, sortDirection]);

  // 3. Paginate sorted items
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedItems.slice(startIndex, startIndex + pageSize);
  }, [sortedItems, safeCurrentPage, pageSize]);

  // Sort toggle handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const hasActiveFilters =
    filterCategory !== "ALL" ||
    filterStatus !== "ALL" ||
    filterUrgency !== "ALL" ||
    realizationSearch.trim() !== "";

  const handleResetFilters = () => {
    setFilterCategory("ALL");
    setFilterStatus("ALL");
    setFilterUrgency("ALL");
    setRealizationSearch("");
    setCurrentPage(1);
  };

  // Helper for sortable column header
  const renderSortHeader = (label: string, field: SortField, align: "left" | "center" | "right" = "left") => {
    const isActive = sortField === field;
    return (
      <th
        scope="col"
        onClick={() => handleSort(field)}
        aria-sort={isActive ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
        className={`py-2.5 px-3 select-none cursor-pointer group hover:bg-[#E3F2FD]/50 transition-colors ${
          align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
        }`}
        title={`Klik untuk mengurutkan berdasarkan ${label}`}
      >
        <div
          className={`inline-flex items-center gap-1 ${
            align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"
          }`}
        >
          <span className={isActive ? "text-[#2196F3] font-bold" : "text-[#666E61]"}>
            {label}
          </span>
          {isActive ? (
            sortDirection === "asc" ? (
              <ArrowUp className="w-3.5 h-3.5 text-[#2196F3] shrink-0" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-[#2196F3] shrink-0" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 text-[#666E61]/40 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </th>
    );
  };

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
            Dari Modal Anggaran ({formatRupiah(totalModalIncome)}
            {payrollSettings.next_month_allocation ? ` • Gaji ${prevMonthKey}` : ""})
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
        {/* Table Controls: Title, Search & Filters */}
        <div className="space-y-3 pb-3 border-b border-[#EEEEEE]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#242921]">
                Daftar Realisasi Cashflow Items ({sortedItems.length} dari {budgetItems.length} Item)
              </h3>
              <p className="text-xs text-[#666E61] mt-0.5">
                Status realisasi pengeluaran berbasis transaksi. Klik baris data untuk melihat rincian transaksi (nominal, waktu, dan catatan).
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#666E61] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama, kode item..."
                value={realizationSearch}
                onChange={(e) => setRealizationSearch(e.target.value)}
                className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl pl-8 pr-7 py-1.5 text-xs text-[#242921] placeholder:text-[#666E61]/60 focus:outline-none focus:border-[#2196F3]"
              />
              {realizationSearch && (
                <button
                  type="button"
                  onClick={() => setRealizationSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666E61] hover:text-[#242921] p-0.5 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar: Kategori, Status, Urgency, Reset */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-[#666E61] shrink-0">
              <Filter className="w-3.5 h-3.5 text-[#2196F3]" />
              <span className="font-semibold text-[11px]">Filter:</span>
            </div>

            {/* Filter Kategori */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-[#E3F2FD]/40 border border-[#EEEEEE] rounded-xl px-2.5 py-1 text-xs text-[#242921] font-medium focus:outline-none focus:border-[#2196F3] cursor-pointer"
            >
              <option value="ALL">Semua Kategori</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat)}
                </option>
              ))}
            </select>

            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#E3F2FD]/40 border border-[#EEEEEE] rounded-xl px-2.5 py-1 text-xs text-[#242921] font-medium focus:outline-none focus:border-[#2196F3] cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="Overbudget">Overbudget</option>
              <option value="Settled">Settled (Lunas / Hemat)</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Outstanding">Outstanding</option>
            </select>

            {/* Filter Urgency */}
            <select
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              className="bg-[#E3F2FD]/40 border border-[#EEEEEE] rounded-xl px-2.5 py-1 text-xs text-[#242921] font-medium focus:outline-none focus:border-[#2196F3] cursor-pointer"
            >
              <option value="ALL">Semua Urgency</option>
              <option value="HIGHEST">HIGHEST (Urgent)</option>
              <option value="HIGH">HIGH</option>
              <option value="NORMAL">NORMAL</option>
            </select>

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer active:scale-95 ml-auto sm:ml-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>

        {budgetItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#666E61]">
            Belum ada cashflow item yang dibuat di bulan {selectedMonth}. Susun item di menu <strong>Budget</strong> terlebih dahulu.
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-xs font-bold text-[#242921]">Item Tidak Ditemukan</p>
            <p className="text-xs text-[#666E61]">
              Tidak ada item yang cocok dengan filter atau kata kunci pencarian.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-[#2196F3] underline cursor-pointer"
            >
              Reset Semua Filter
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              tabIndex={0}
              role="region"
              aria-label="Tabel Realisasi Cashflow"
              className="overflow-x-auto focus:outline-none"
            >
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EEEEEE] text-[#666E61]">
                    {renderSortHeader("Nama Cashflow Item", "name", "left")}
                    {renderSortHeader("Kategori", "category", "left")}
                    {renderSortHeader("Urgency", "urgency", "left")}
                    {renderSortHeader("Budget Plan", "budget", "left")}
                    {renderSortHeader("Status", "status", "center")}
                    {renderSortHeader("Selisih", "diff", "right")}
                    <th scope="col" className="py-2.5 px-3 text-center w-24">
                      Rincian
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEEE] text-[#242921]">
                  {paginatedItems.map((item) => {
                    const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
                    const isIncome = unit?.unit_type === "INCOME";
                    const isRolloverSalary =
                      isIncome &&
                      payrollSettings.next_month_allocation &&
                      item.cashflow_unit_id === incomeUnitId;
                    const currentRealization = item.realization_amount ?? item.projection_amount ?? 0;
                    const diff = currentRealization - item.budget_amount;
                    const statusInfo = getFinanceStatus(item);

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItemForDetail(item)}
                        className={`transition cursor-pointer group select-none ${
                          isIncome ? "bg-emerald-50/20 hover:bg-emerald-50/50" : "hover:bg-[#E3F2FD]/30"
                        }`}
                        title="Klik baris untuk melihat rincian riwayat transaksi"
                      >
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-xs text-[#242921] group-hover:text-[#2196F3] transition-colors whitespace-nowrap">
                            {unit?.name || "Cashflow Item"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold whitespace-nowrap ${
                              isIncome
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-[#E3F2FD] text-[#666E61]"
                            }`}
                          >
                            {unit?.category || unit?.unit_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
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
                        <td className="py-2.5 px-3 font-medium text-[#242921] whitespace-nowrap">
                          {formatRupiah(item.budget_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItemRealized(item.id);
                            }}
                            disabled={isLocked}
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border transition flex items-center justify-center gap-1 mx-auto whitespace-nowrap active:scale-95 cursor-pointer ${statusInfo.badgeClass}`}
                            title="Klik untuk ubah status realisasi"
                          >
                            {statusInfo.icon && <statusInfo.icon className="w-3 h-3 shrink-0" />}
                            <span>{statusInfo.label}</span>
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
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
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemForDetail(item);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-[#2196F3] bg-[#E3F2FD] hover:bg-[#2196F3] hover:text-white transition cursor-pointer active:scale-95 shadow-2xs"
                          >
                            <span>Detail</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#EEEEEE] text-xs text-[#666E61]">
              {/* Left: Info items and page size selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <span>
                  Menampilkan{" "}
                  <strong className="text-[#242921]">
                    {sortedItems.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}
                  </strong>{" "}
                  -{" "}
                  <strong className="text-[#242921]">
                    {Math.min(safeCurrentPage * pageSize, sortedItems.length)}
                  </strong>{" "}
                  dari <strong className="text-[#242921]">{sortedItems.length}</strong> item
                  {sortedItems.length !== budgetItems.length && (
                    <span className="ml-1 text-[11px] text-[#666E61]">
                      (difilter dari total {budgetItems.length})
                    </span>
                  )}
                </span>

                <div className="flex items-center gap-1.5 ml-1">
                  <span className="text-[11px] text-[#666E61]">Tampilkan:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-[#E3F2FD]/40 border border-[#EEEEEE] rounded-lg px-2 py-0.5 text-xs text-[#242921] font-semibold focus:outline-none focus:border-[#2196F3] cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Right: Page Navigation Buttons */}
              <div className="flex items-center gap-1 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  aria-label="Halaman sebelumnya"
                  className="p-1.5 rounded-xl border border-[#EEEEEE] hover:bg-[#E3F2FD] text-[#242921] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Halaman sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Number Buttons */}
                <div className="flex items-center gap-1">
                  {getPageNumbers(safeCurrentPage, totalPages).map((p, idx) =>
                    p === "..." ? (
                      <span key={`dots-${idx}`} className="px-1.5 py-0.5 text-[#666E61] select-none">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${p}`}
                        type="button"
                        onClick={() => setCurrentPage(p as number)}
                        className={`w-7 h-7 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          safeCurrentPage === p
                            ? "bg-[#2196F3] text-white shadow-2xs"
                            : "border border-[#EEEEEE] text-[#242921] hover:bg-[#E3F2FD]"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  aria-label="Halaman berikutnya"
                  className="p-1.5 rounded-xl border border-[#EEEEEE] hover:bg-[#E3F2FD] text-[#242921] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Halaman berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Realization Detail Modal */}
      {selectedItemForDetail && (
        <RealizationDetailModal
          isOpen={Boolean(selectedItemForDetail)}
          onClose={() => setSelectedItemForDetail(null)}
          item={selectedItemForDetail}
          unit={cashflowUnits.find((u) => u.id === selectedItemForDetail.cashflow_unit_id)}
          category={categories.find(
            (c) =>
              c.code ===
              cashflowUnits.find((u) => u.id === selectedItemForDetail.cashflow_unit_id)?.category
          )}
          transactions={transactions}
          selectedMonth={selectedMonth}
        />
      )}
    </div>
  );
};
