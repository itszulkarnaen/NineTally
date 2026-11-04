"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  X,
  Receipt,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  Check,
  Tag,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { BudgetPeriodItem, CashflowUnit, CashflowTransaction, CashflowCategory } from "@/types";
import { formatRupiah } from "@/lib/utils";

interface RealizationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: BudgetPeriodItem | null;
  unit?: CashflowUnit;
  category?: CashflowCategory;
  transactions: CashflowTransaction[];
  selectedMonth: string;
}

// Format Indonesian Date (e.g. "Rab, 4 Nov 2026")
function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr) return "-";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat("id-ID", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }).format(d);
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
    }
  } catch {
    // fallback to original string
  }
  return dateStr;
}

// Format Time from ISO string (e.g. "14:32 WIB")
function formatTransactionTime(isoStr?: string): string | null {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    if (!isNaN(d.getTime())) {
      return (
        new Intl.DateTimeFormat("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(d) + " WIB"
      );
    }
  } catch {
    // ignore
  }
  return null;
}

// Helper to generate pagination page numbers
function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 3) {
    return [1, 2, 3, "...", totalPages];
  }
  if (currentPage >= totalPages - 2) {
    return [1, "...", totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", currentPage, "...", totalPages];
}

export const RealizationDetailModal: React.FC<RealizationDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  unit,
  category,
  transactions,
  selectedMonth,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Search & Filter State inside modal
  const [txSearch, setTxSearch] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");

  // Sorting State
  const [sortField, setSortField] = useState<"date" | "amount">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // Synchronize modal state with native <dialog>
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Handle dialog native close (Escape key or light-dismiss)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };

    dialog.addEventListener("close", handleClose);
    return () => {
      dialog.removeEventListener("close", handleClose);
    };
  }, [onClose]);

  // Reset filters & pagination on modal open or item switch
  useEffect(() => {
    if (isOpen) {
      setTxSearch("");
      setFilterDate("");
      setSortField("date");
      setSortDirection("desc");
      setCurrentPage(1);
    }
  }, [isOpen, item?.id]);

  // Reset to page 1 when search, date filter, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [txSearch, filterDate, pageSize]);

  // Fallback for browsers without native closedBy support
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const handleClick = (e: MouseEvent) => {
        if (e.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isInside =
          rect.top <= e.clientY &&
          e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX &&
          e.clientX <= rect.left + rect.width;
        if (!isInside) {
          dialog.close();
        }
      };
      dialog.addEventListener("click", handleClick);
      return () => dialog.removeEventListener("click", handleClick);
    }
  }, []);

  // Filter transactions for this unit in this month
  const itemTransactions = useMemo(() => {
    if (!item) return [];
    return transactions.filter(
      (t) =>
        t.period_id === (item.period_id || selectedMonth) &&
        t.cashflow_unit_id === item.cashflow_unit_id
    );
  }, [transactions, item, selectedMonth]);

  // Unique dates for dropdown selector
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    itemTransactions.forEach((t) => {
      if (t.date) dates.add(t.date);
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [itemTransactions]);

  // Filtered transactions based on search and date
  const filteredTransactions = useMemo(() => {
    return itemTransactions.filter((tx) => {
      // Date filter
      if (filterDate && filterDate !== "ALL") {
        if (tx.date !== filterDate) return false;
      }

      // Search query filter (matches notes, amount, date)
      if (txSearch.trim()) {
        const q = txSearch.toLowerCase().trim();
        const noteMatch = tx.notes ? tx.notes.toLowerCase().includes(q) : false;
        const amountMatch =
          tx.amount.toString().includes(q) || formatRupiah(tx.amount).toLowerCase().includes(q);
        const dateMatch = tx.date ? tx.date.includes(q) : false;
        const formattedDateMatch = formatIndonesianDate(tx.date).toLowerCase().includes(q);

        if (!noteMatch && !amountMatch && !dateMatch && !formattedDateMatch) {
          return false;
        }
      }

      return true;
    });
  }, [itemTransactions, filterDate, txSearch]);

  // Sorted transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      if (sortField === "amount") {
        const delta = a.amount - b.amount;
        return sortDirection === "asc" ? delta : -delta;
      }
      // default: date & time
      const timeA = new Date(a.created_at || a.date).getTime();
      const timeB = new Date(b.created_at || b.date).getTime();
      return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
    });
  }, [filteredTransactions, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedTransactions.slice(startIndex, startIndex + pageSize);
  }, [sortedTransactions, safeCurrentPage, pageSize]);

  const handleSort = (field: "date" | "amount") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  if (!isOpen || !item) return null;

  const currentRealization = item.realization_amount ?? item.projection_amount ?? 0;
  const budget = item.budget_amount;
  const diff = currentRealization - budget;
  const progressPct = budget > 0 ? Math.min(Math.round((currentRealization / budget) * 100), 999) : 0;

  // Finance Status Calculation
  const isOverbudget = (budget > 0 && currentRealization > budget) || (budget === 0 && currentRealization > 0);
  const isSettled = (budget > 0 && currentRealization >= budget) || item.is_realized;
  const isPartiallyPaid = budget > 0 && currentRealization > 0 && currentRealization < budget;

  const totalTxAmount = itemTransactions.reduce((acc, t) => acc + t.amount, 0);
  const filteredTxAmount = filteredTransactions.reduce((acc, t) => acc + t.amount, 0);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="realization-detail-title"
      className="m-auto bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-0 w-full max-w-2xl shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-xs text-[#242921] open:flex open:flex-col overflow-hidden outline-none"
      {...({ closedby: "any" } as any)}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-[#EEEEEE] bg-[#FFFFFF]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#E3F2FD] text-[#2196F3] flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 id="realization-detail-title" className="text-sm font-bold text-[#242921]">
              Rincian Transaksi Realisasi
            </h3>
            <p className="text-[11px] text-[#666E61]">
              Periode {selectedMonth}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup popup detail"
          className="p-1.5 rounded-xl text-[#666E61] hover:text-[#242921] hover:bg-[#EEEEEE] transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Modal Body */}
      <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
        {/* Cashflow Item Summary Card */}
        <div className="bg-[#E3F2FD]/25 border border-[#EEEEEE] rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h4 className="text-base font-bold text-[#242921]">
                {unit?.name || "Cashflow Item"}
              </h4>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#E3F2FD] text-[#2196F3]">
                  {category?.name || unit?.category || unit?.unit_type || "EXPENSE"}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    item.urgency === "HIGHEST"
                      ? "text-rose-600 bg-rose-50 border border-rose-200"
                      : item.urgency === "HIGH"
                      ? "text-amber-700 bg-amber-50 border border-amber-200"
                      : "text-[#666E61] bg-slate-100 border border-slate-200"
                  }`}
                >
                  {item.urgency}
                </span>
                {isOverbudget ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-rose-700 bg-rose-50 border border-rose-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Overbudget
                  </span>
                ) : isSettled ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Settled
                  </span>
                ) : isPartiallyPaid ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-sky-700 bg-sky-50 border border-sky-200">
                    Partially Paid
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-slate-600 bg-slate-100 border border-slate-200">
                    Outstanding
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Financial Breakdown Grid */}
          <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-[#EEEEEE]/80 text-xs">
            <div className="bg-[#FFFFFF] p-2.5 rounded-xl border border-[#EEEEEE]">
              <span className="text-[10px] text-[#666E61] font-medium block">Plafon Budget</span>
              <span className="font-bold text-[#242921] mt-0.5 block text-xs">
                {formatRupiah(budget)}
              </span>
            </div>

            <div className="bg-[#FFFFFF] p-2.5 rounded-xl border border-[#EEEEEE]">
              <span className="text-[10px] text-[#666E61] font-medium block">Total Realisasi</span>
              <span className="font-bold text-[#2196F3] mt-0.5 block text-xs">
                {formatRupiah(currentRealization)}
              </span>
            </div>

            <div className="bg-[#FFFFFF] p-2.5 rounded-xl border border-[#EEEEEE]">
              <span className="text-[10px] text-[#666E61] font-medium block">Selisih</span>
              <span className="font-bold mt-0.5 block text-xs">
                {isOverbudget ? (
                  <span className="text-rose-600">
                    {formatRupiah(diff)}
                  </span>
                ) : isSettled && diff < 0 ? (
                  <span className="text-emerald-600">
                    -{formatRupiah(Math.abs(diff))}
                  </span>
                ) : (
                  <span className="text-[#666E61]">-</span>
                )}
              </span>
            </div>
          </div>

          {/* Realization Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#666E61] font-medium">Progress Pengeluaran</span>
              <span className={`font-bold ${isOverbudget ? "text-rose-600" : "text-[#2196F3]"}`}>
                {progressPct}%
              </span>
            </div>
            <div className="w-full bg-[#EEEEEE] h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isOverbudget ? "bg-rose-500" : "bg-[#2196F3]"
                }`}
                style={{ width: `${Math.min(progressPct, 100)}%` }}
              />
            </div>
          </div>

          {/* Item Allocation Note if present */}
          {item.notes && (
            <div className="p-2.5 bg-[#FFFFFF] border border-[#EEEEEE] rounded-xl flex items-start gap-2 text-xs">
              <Tag className="w-3.5 h-3.5 text-[#2196F3] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-[#666E61] uppercase tracking-wider block">
                  Catatan Pos Anggaran
                </span>
                <p className="text-xs text-[#242921] font-medium break-words mt-0.5">
                  {item.notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Transactions Table Section */}
        <div className="space-y-3">
          {/* Section Header & Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#242921]">
                Daftar Riwayat Transaksi
              </h5>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E3F2FD] text-[#2196F3]">
                {filteredTransactions.length} Transaksi
              </span>
            </div>
            {filteredTransactions.length > 0 && (
              <span className="text-xs font-bold text-[#242921]">
                Total: {formatRupiah(filteredTxAmount)}
              </span>
            )}
          </div>

          {/* Search Bar & Date Filter Controls */}
          {itemTransactions.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#F8FAFC] p-2.5 rounded-2xl border border-[#EEEEEE]">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#666E61] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari catatan, nominal..."
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  className="w-full bg-[#FFFFFF] border border-[#EEEEEE] rounded-xl pl-8 pr-7 py-1.5 text-xs text-[#242921] placeholder:text-[#666E61]/60 focus:outline-none focus:border-[#2196F3]"
                />
                {txSearch && (
                  <button
                    type="button"
                    onClick={() => setTxSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666E61] hover:text-[#242921] p-0.5 cursor-pointer"
                    title="Hapus pencarian"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Date Filter Controls */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* HTML5 Datepicker */}
                <div className="flex items-center gap-1.5 bg-[#FFFFFF] border border-[#EEEEEE] rounded-xl px-2.5 py-1 text-xs text-[#242921]">
                  <Calendar className="w-3.5 h-3.5 text-[#2196F3] shrink-0" />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="bg-transparent text-xs text-[#242921] font-medium focus:outline-none cursor-pointer"
                    title="Filter berdasarkan tanggal"
                  />
                  {filterDate && (
                    <button
                      type="button"
                      onClick={() => setFilterDate("")}
                      className="text-[#666E61] hover:text-[#242921] cursor-pointer ml-0.5"
                      title="Reset tanggal"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Quick Date Dropdown */}
                {availableDates.length > 1 && (
                  <select
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-xl px-2.5 py-1 text-xs text-[#242921] font-medium focus:outline-none focus:border-[#2196F3] cursor-pointer max-w-[140px] truncate"
                    title="Pilih tanggal yang memiliki riwayat"
                  >
                    <option value="">Semua Tanggal</option>
                    {availableDates.map((d) => (
                      <option key={d} value={d}>
                        {formatIndonesianDate(d)}
                      </option>
                    ))}
                  </select>
                )}

                {/* Reset All Filters Button */}
                {(txSearch || filterDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setTxSearch("");
                      setFilterDate("");
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer active:scale-95 shrink-0"
                    title="Reset semua filter transaksi"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Main Transaction Table Area */}
          {itemTransactions.length === 0 ? (
            /* Empty State: No Transactions for this item */
            <div className="p-6 text-center bg-[#FFFFFF] border border-dashed border-[#EEEEEE] rounded-2xl space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-[#E3F2FD] text-[#2196F3] mx-auto flex items-center justify-center">
                <Receipt className="w-5 h-5 text-[#2196F3]" />
              </div>
              <p className="text-xs font-bold text-[#242921]">
                Belum Ada Riwayat Transaksi
              </p>
              <p className="text-[11px] text-[#666E61] max-w-xs mx-auto leading-relaxed">
                Belum ada transaksi pengeluaran tercatat untuk pos ini di bulan {selectedMonth}.
              </p>
              {item.is_realized && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold mt-2">
                  <Check className="w-3.5 h-3.5" />
                  <span>Item ini ditandai selesai secara manual</span>
                </div>
              )}
            </div>
          ) : sortedTransactions.length === 0 ? (
            /* Empty State: No matching filter result */
            <div className="p-6 text-center bg-[#FFFFFF] border border-dashed border-[#EEEEEE] rounded-2xl space-y-2">
              <p className="text-xs font-bold text-[#242921]">
                Transaksi Tidak Ditemukan
              </p>
              <p className="text-[11px] text-[#666E61]">
                Tidak ada transaksi yang cocok dengan kata kunci atau filter tanggal yang dipilih.
              </p>
              <button
                type="button"
                onClick={() => {
                  setTxSearch("");
                  setFilterDate("");
                }}
                className="text-xs font-bold text-[#2196F3] underline cursor-pointer"
              >
                Reset Filter Pencarian
              </button>
            </div>
          ) : (
            /* Table with Pagination */
            <div className="space-y-3">
              <div
                tabIndex={0}
                role="region"
                aria-label="Tabel Riwayat Transaksi"
                className="overflow-x-auto border border-[#EEEEEE] rounded-2xl bg-[#FFFFFF] focus:outline-none"
              >
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EEEEEE] text-[#666E61] bg-[#F8FAFC]">
                      <th scope="col" className="py-2.5 px-3 text-center w-10 font-bold">
                        #
                      </th>
                      <th
                        scope="col"
                        onClick={() => handleSort("date")}
                        aria-sort={
                          sortField === "date"
                            ? sortDirection === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        className="py-2.5 px-3 select-none cursor-pointer group hover:bg-[#E3F2FD]/50 transition-colors whitespace-nowrap"
                        title="Klik untuk mengurutkan tanggal"
                      >
                        <div className="inline-flex items-center gap-1">
                          <span
                            className={
                              sortField === "date" ? "text-[#2196F3] font-bold" : "text-[#666E61]"
                            }
                          >
                            Tanggal & Waktu
                          </span>
                          {sortField === "date" ? (
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
                      <th
                        scope="col"
                        onClick={() => handleSort("amount")}
                        aria-sort={
                          sortField === "amount"
                            ? sortDirection === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                        className="py-2.5 px-3 text-right select-none cursor-pointer group hover:bg-[#E3F2FD]/50 transition-colors whitespace-nowrap"
                        title="Klik untuk mengurutkan nominal"
                      >
                        <div className="inline-flex items-center justify-end gap-1">
                          <span
                            className={
                              sortField === "amount" ? "text-[#2196F3] font-bold" : "text-[#666E61]"
                            }
                          >
                            Nominal
                          </span>
                          {sortField === "amount" ? (
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
                      <th scope="col" className="py-2.5 px-3 font-bold text-[#666E61]">
                        Catatan Transaksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEEEEE] text-[#242921]">
                    {paginatedTransactions.map((tx, idx) => {
                      const rowNumber = (safeCurrentPage - 1) * pageSize + idx + 1;
                      const fullDate = formatIndonesianDate(tx.date);
                      const recordedTime = formatTransactionTime(tx.created_at);

                      return (
                        <tr key={tx.id || idx} className="hover:bg-[#E3F2FD]/20 transition-colors">
                          <td className="py-2.5 px-3 text-center text-[#666E61] font-semibold text-[11px]">
                            {rowNumber}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-semibold text-xs text-[#242921]">
                              <Calendar className="w-3.5 h-3.5 text-[#2196F3]" />
                              <span>{fullDate}</span>
                            </div>
                            {recordedTime && (
                              <div className="flex items-center gap-1 text-[10px] text-[#666E61] mt-0.5 ml-5">
                                <Clock className="w-3 h-3 text-[#666E61]/70" />
                                <span>Pukul {recordedTime}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <span className="font-bold text-xs text-[#242921]">
                              {formatRupiah(tx.amount)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {tx.notes && tx.notes.trim() ? (
                              <div className="flex items-start gap-1.5 text-xs text-[#242921] font-medium leading-relaxed">
                                <FileText className="w-3.5 h-3.5 text-[#2196F3] shrink-0 mt-0.5" />
                                <span className="break-words">{tx.notes}</span>
                              </div>
                            ) : (
                              <span className="text-[#666E61]/50 italic text-[11px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 text-xs text-[#666E61]">
                {/* Left: Info items and page size */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span>
                    Menampilkan{" "}
                    <strong className="text-[#242921]">
                      {sortedTransactions.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}
                    </strong>{" "}
                    -{" "}
                    <strong className="text-[#242921]">
                      {Math.min(safeCurrentPage * pageSize, sortedTransactions.length)}
                    </strong>{" "}
                    dari <strong className="text-[#242921]">{sortedTransactions.length}</strong> transaksi
                    {sortedTransactions.length !== itemTransactions.length && (
                      <span className="ml-1 text-[11px] text-[#666E61]">
                        (difilter dari total {itemTransactions.length})
                      </span>
                    )}
                  </span>

                  <div className="flex items-center gap-1.5 ml-1">
                    <span className="text-[11px] text-[#666E61]">Baris:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="bg-[#E3F2FD]/40 border border-[#EEEEEE] rounded-lg px-2 py-0.5 text-xs text-[#242921] font-semibold focus:outline-none focus:border-[#2196F3] cursor-pointer"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                </div>

                {/* Right: Page Navigation Buttons */}
                <div className="flex items-center gap-1 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    aria-label="Halaman transaksi sebelumnya"
                    className="p-1 rounded-lg border border-[#EEEEEE] hover:bg-[#E3F2FD] text-[#242921] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    title="Halaman sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers(safeCurrentPage, totalPages).map((p, idx) =>
                      p === "..." ? (
                        <span key={`dots-${idx}`} className="px-1 text-[#666E61] select-none text-xs">
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          type="button"
                          onClick={() => setCurrentPage(p as number)}
                          className={`w-6 h-6 rounded-lg text-xs font-semibold transition cursor-pointer ${
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
                    aria-label="Halaman transaksi berikutnya"
                    className="p-1 rounded-lg border border-[#EEEEEE] hover:bg-[#E3F2FD] text-[#242921] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    title="Halaman berikutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-[#EEEEEE] bg-[#FFFFFF]">
        <div className="text-xs text-[#666E61]">
          {itemTransactions.length > 0 ? (
            <span>
              Total Keseluruhan:{" "}
              <strong className="text-[#242921]">{formatRupiah(totalTxAmount)}</strong> (
              {itemTransactions.length} transaksi)
            </span>
          ) : (
            <span>Pos belum memiliki mutasi transaksi</span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="px-4 py-2 bg-[#2196F3] hover:bg-[#1E88E5] text-white font-semibold text-xs rounded-xl transition shadow-xs cursor-pointer active:scale-95"
        >
          Tutup
        </button>
      </div>
    </dialog>
  );
};
