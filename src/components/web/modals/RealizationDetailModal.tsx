"use client";

import React, { useEffect, useRef } from "react";
import {
  X,
  Receipt,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  Check,
  Tag,
  ArrowDownLeft,
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

// Format Indonesian Date (e.g. "Rabu, 4 November 2026")
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
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(d);
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
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

  if (!isOpen || !item) return null;

  const currentRealization = item.realization_amount ?? item.projection_amount ?? 0;
  const budget = item.budget_amount;
  const diff = currentRealization - budget;
  const progressPct = budget > 0 ? Math.min(Math.round((currentRealization / budget) * 100), 999) : 0;

  // Finance Status Calculation
  const isOverbudget = (budget > 0 && currentRealization > budget) || (budget === 0 && currentRealization > 0);
  const isSettled = (budget > 0 && currentRealization >= budget) || item.is_realized;
  const isPartiallyPaid = budget > 0 && currentRealization > 0 && currentRealization < budget;

  // Filter transactions for this unit in this month
  const itemTransactions = [...transactions]
    .filter(
      (t) =>
        t.period_id === (item.period_id || selectedMonth) &&
        t.cashflow_unit_id === item.cashflow_unit_id
    )
    .sort((a, b) => {
      const timeB = new Date(b.created_at || b.date).getTime();
      const timeA = new Date(a.created_at || a.date).getTime();
      return timeB - timeA;
    });

  const totalTxAmount = itemTransactions.reduce((acc, t) => acc + t.amount, 0);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="realization-detail-title"
      className="m-auto bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-0 w-full max-w-lg shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-xs text-[#242921] open:flex open:flex-col overflow-hidden outline-none"
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
              <span
                className={`font-bold mt-0.5 block text-xs ${
                  diff > 0
                    ? "text-rose-600"
                    : diff < 0 && (currentRealization > 0 || item.is_realized)
                    ? "text-emerald-600"
                    : "text-[#666E61]"
                }`}
              >
                {diff > 0
                  ? `+${formatRupiah(diff)}`
                  : diff < 0 && (currentRealization > 0 || item.is_realized)
                  ? `-${formatRupiah(Math.abs(diff))}`
                  : "Sesuai"}
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

        {/* Transactions List Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[#242921]">
                Daftar Riwayat Transaksi
              </h5>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E3F2FD] text-[#2196F3]">
                {itemTransactions.length} Transaksi
              </span>
            </div>
            {itemTransactions.length > 0 && (
              <span className="text-xs font-bold text-[#242921]">
                Total: {formatRupiah(totalTxAmount)}
              </span>
            )}
          </div>

          {itemTransactions.length === 0 ? (
            /* Empty State: No Transactions Recorded */
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
          ) : (
            /* Transaction Cards */
            <div className="space-y-2.5">
              {itemTransactions.map((tx, idx) => {
                const fullDate = formatIndonesianDate(tx.date);
                const recordedTime = formatTransactionTime(tx.created_at);

                return (
                  <div
                    key={tx.id || idx}
                    className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-3.5 shadow-2xs hover:border-[#2196F3]/40 transition space-y-2.5"
                  >
                    {/* Top row: Apa (Nominal) & Kapan (Tanggal) */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                          <ArrowDownLeft className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-[#242921]">
                              {formatRupiah(tx.amount)}
                            </span>
                            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[#EEEEEE] text-[#666E61]">
                              #{idx + 1}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#666E61] block">
                            Pengeluaran riil
                          </span>
                        </div>
                      </div>

                      {/* Kapan: Tanggal & Waktu */}
                      <div className="text-right shrink-0">
                        <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-[#242921]">
                          <Calendar className="w-3.5 h-3.5 text-[#2196F3]" />
                          <span>{fullDate}</span>
                        </div>
                        {recordedTime && (
                          <div className="flex items-center justify-end gap-1 text-[10px] text-[#666E61] mt-0.5">
                            <Clock className="w-3 h-3 text-[#666E61]/70" />
                            <span>Pukul {recordedTime}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes Transaction Section ("notes transaction nya apa") */}
                    <div className="pt-2 border-t border-[#EEEEEE]/80">
                      {tx.notes && tx.notes.trim() ? (
                        <div className="p-2.5 bg-[#F8FAFC] border border-[#EEEEEE] rounded-xl flex items-start gap-2">
                          <FileText className="w-4 h-4 text-[#2196F3] shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-[#666E61] uppercase tracking-wider block">
                              Catatan Transaksi:
                            </span>
                            <p className="text-xs text-[#242921] font-medium leading-relaxed whitespace-pre-wrap break-words mt-0.5">
                              {tx.notes}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 bg-[#F8FAFC]/50 border border-dashed border-[#EEEEEE] rounded-xl flex items-center gap-1.5 text-[11px] text-[#666E61]/70 italic">
                          <FileText className="w-3.5 h-3.5 text-[#666E61]/40 shrink-0" />
                          <span>Tidak ada catatan untuk transaksi ini.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-[#EEEEEE] bg-[#FFFFFF]">
        <div className="text-xs text-[#666E61]">
          {itemTransactions.length > 0 ? (
            <span>
              <strong>{itemTransactions.length}</strong> transaksi dicatat • Total:{" "}
              <strong className="text-[#242921]">{formatRupiah(totalTxAmount)}</strong>
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

