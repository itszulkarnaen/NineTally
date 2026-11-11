"use client";

import React, { useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { formatRupiah } from "@/lib/utils";
import {
  HandCoins,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { SelfLoan } from "@/types";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";
import { CreateSelfLoanModal, RepaySelfLoanModal } from "@/components/common/SelfLoanModals";

interface SelfLoanMobileTabProps {
  onShowToast: (message: string) => void;
}

export const SelfLoanMobileTab: React.FC<SelfLoanMobileTabProps> = ({ onShowToast }) => {
  const {
    assets,
    selfLoans,
    selfLoanPayments,
    selectedMonth,
    createSelfLoan,
    repaySelfLoan,
    deleteSelfLoan,
  } = useApp();

  const [filter, setFilter] = useState<"ACTIVE" | "PAID" | "ALL">("ACTIVE");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [repayLoan, setRepayLoan] = useState<SelfLoan | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SelfLoan | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const summary = useMemo(() => {
    let activeRemaining = 0;
    let activeCount = 0;
    let paidCount = 0;
    selfLoans.forEach((l) => {
      if (l.status === "ACTIVE" && l.remaining_amount > 0) {
        activeRemaining += l.remaining_amount;
        activeCount += 1;
      } else {
        paidCount += 1;
      }
    });
    return { activeRemaining, activeCount, paidCount };
  }, [selfLoans]);

  const filteredLoans = useMemo(() => {
    if (filter === "ALL") return selfLoans;
    return selfLoans.filter((l) => l.status === filter);
  }, [selfLoans, filter]);

  const showError = (_title: string, message: string) => {
    setErrorBanner(message);
    setTimeout(() => setErrorBanner(null), 5000);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const res = await deleteSelfLoan(pendingDelete.id);
    setPendingDelete(null);
    if (!res.success) {
      showError("Gagal Menghapus", res.message || "Pinjaman aktif belum bisa dihapus.");
    } else {
      onShowToast("Riwayat Self-Loan dihapus!");
    }
  };

  return (
    <div className="space-y-3">
      {/* Header Summary Card */}
      <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-medium text-[#666E61] block">
              Total Utang ke Diri Sendiri
            </span>
            <h3 className="text-lg font-black text-rose-600">
              {formatRupiah(summary.activeRemaining)}
            </h3>
            <span className="text-[10px] text-[#666E61]">
              {summary.activeCount} pinjaman aktif • 0% bunga
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-3 py-2 bg-[#2196F3] hover:bg-[#1E88E5] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Pinjam Aset</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-[#E3F2FD]/40 rounded-xl border border-[#EEEEEE]">
          {[
            { id: "ACTIVE" as const, label: `Aktif (${summary.activeCount})` },
            { id: "PAID" as const, label: `Lunas (${summary.paidCount})` },
            { id: "ALL" as const, label: "Semua" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`py-1.5 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                filter === tab.id ? "bg-[#2196F3] text-white shadow-2xs" : "text-[#666E61]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {errorBanner && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span className="font-medium">{errorBanner}</span>
        </div>
      )}

      {/* Loan Cards */}
      {filteredLoans.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-dashed border-[#EEEEEE] rounded-2xl p-6 text-center space-y-1.5">
          <HandCoins className="w-7 h-7 text-[#2196F3] mx-auto" />
          <p className="text-xs font-bold text-[#242921]">
            {filter === "ACTIVE" ? "Tidak ada Self-Loan aktif" : "Belum ada data Self-Loan"}
          </p>
          <p className="text-[11px] text-[#666E61]">
            Tap <strong>Pinjam Aset</strong> untuk mencairkan aset sendiri ke Saldo Bank.
          </p>
        </div>
      ) : (
        filteredLoans.map((loan) => {
          const isPaid = loan.status === "PAID" || loan.remaining_amount <= 0;
          const pct =
            loan.principal_amount > 0
              ? Math.min(100, Math.round((loan.paid_amount / loan.principal_amount) * 100))
              : 0;
          const payments = selfLoanPayments.filter((p) => p.loan_id === loan.id);
          const isExpanded = Boolean(expandedIds[loan.id]);

          return (
            <div
              key={loan.id}
              className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-4 shadow-xs space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-bold text-xs text-[#242921]">{loan.title}</h4>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold inline-flex items-center gap-0.5 ${
                        isPaid
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {isPaid ? (
                        <CheckCircle2 className="w-2.5 h-2.5" />
                      ) : (
                        <Clock className="w-2.5 h-2.5" />
                      )}
                      <span>{isPaid ? "LUNAS" : "AKTIF"}</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-[#666E61] mt-0.5">
                    {loan.asset_name} → {loan.target_bank} • {loan.loan_date}
                  </p>
                </div>

                {isPaid && (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(loan)}
                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Hapus riwayat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-[#666E61] block">Sisa Utang</span>
                  <span className={`font-black ${isPaid ? "text-emerald-700" : "text-rose-600"}`}>
                    {formatRupiah(loan.remaining_amount)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#666E61] block">Pokok</span>
                  <span className="font-bold text-[#242921]">
                    {formatRupiah(loan.principal_amount)}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="h-1.5 w-full bg-[#EEEEEE] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isPaid ? "bg-emerald-500" : "bg-[#2196F3]"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#666E61]">
                  <span>Terbayar {pct}%</span>
                  {loan.disbursed_units !== undefined && loan.disbursed_units > 0 && (
                    <span className="text-amber-800">
                      -{loan.disbursed_units}gr / +{loan.returned_units ?? 0}gr
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#EEEEEE]">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedIds((prev) => ({ ...prev, [loan.id]: !prev[loan.id] }))
                  }
                  className="text-[11px] font-semibold text-[#666E61] inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Riwayat ({payments.length})</span>
                  {isExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>

                {!isPaid && (
                  <button
                    type="button"
                    onClick={() => setRepayLoan(loan)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl cursor-pointer"
                  >
                    Cicil / Lunasi
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="space-y-1 pt-1">
                  {payments.length === 0 ? (
                    <p className="text-[10px] text-[#666E61] italic">Belum ada cicilan.</p>
                  ) : (
                    payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-[11px] bg-[#F8FAFC] border border-[#EEEEEE] rounded-xl px-2.5 py-1.5"
                      >
                        <span className="text-[#666E61]">
                          {p.payment_date} ({p.source_bank})
                        </span>
                        <span className="font-bold text-emerald-700">
                          +{formatRupiah(p.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Modals */}
      <CreateSelfLoanModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        assets={assets}
        selectedMonth={selectedMonth}
        onCreate={createSelfLoan}
        onError={showError}
        onSuccess={onShowToast}
      />

      <RepaySelfLoanModal
        loan={repayLoan}
        assets={assets}
        selectedMonth={selectedMonth}
        onClose={() => setRepayLoan(null)}
        onRepay={repaySelfLoan}
        onError={showError}
        onSuccess={onShowToast}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(pendingDelete)}
        title="Hapus Riwayat Self-Loan?"
        message={
          pendingDelete
            ? `Yakin mau menghapus riwayat '${pendingDelete.title}'?`
            : ""
        }
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};
