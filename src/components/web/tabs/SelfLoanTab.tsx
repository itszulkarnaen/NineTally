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
  ArrowDownLeft,
  Landmark,
  Wallet,
} from "lucide-react";
import { SelfLoan } from "@/types";
import { ValidationAlertState } from "../types";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";
import { CreateSelfLoanModal, RepaySelfLoanModal } from "@/components/common/SelfLoanModals";

interface SelfLoanTabProps {
  setValidationAlert: (alert: ValidationAlertState | null) => void;
  setToast: (msg: string | null) => void;
}

export const SelfLoanTab: React.FC<SelfLoanTabProps> = ({
  setValidationAlert,
  setToast,
}) => {
  const {
    assets,
    selfLoans,
    selfLoanPayments,
    selectedMonth,
    createSelfLoan,
    repaySelfLoan,
    deleteSelfLoan,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "PAID">("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [repayTargetLoan, setRepayTargetLoan] = useState<SelfLoan | null>(null);
  const [pendingDeleteLoan, setPendingDeleteLoan] = useState<SelfLoan | null>(null);
  const [expandedLoanIds, setExpandedLoanIds] = useState<Record<string, boolean>>({});

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const summary = useMemo(() => {
    let activeRemaining = 0;
    let totalPrincipal = 0;
    let totalPaid = 0;
    let activeCount = 0;
    let paidCount = 0;

    selfLoans.forEach((l) => {
      totalPrincipal += l.principal_amount;
      totalPaid += l.paid_amount;
      if (l.status === "ACTIVE" && l.remaining_amount > 0) {
        activeRemaining += l.remaining_amount;
        activeCount += 1;
      } else {
        paidCount += 1;
      }
    });

    const overallProgress =
      totalPrincipal > 0 ? Math.min(100, Math.round((totalPaid / totalPrincipal) * 100)) : 0;

    return { activeRemaining, totalPrincipal, totalPaid, activeCount, paidCount, overallProgress };
  }, [selfLoans]);

  const filteredLoans = useMemo(() => {
    if (statusFilter === "ALL") return selfLoans;
    return selfLoans.filter((l) => l.status === statusFilter);
  }, [selfLoans, statusFilter]);

  const toggleHistory = (loanId: string) => {
    setExpandedLoanIds((prev) => ({ ...prev, [loanId]: !prev[loanId] }));
  };

  const confirmDelete = async () => {
    if (!pendingDeleteLoan) return;
    const res = await deleteSelfLoan(pendingDeleteLoan.id);
    setPendingDeleteLoan(null);
    if (!res.success) {
      setValidationAlert({
        title: "Hapus Self-Loan Ditolak",
        message: res.message || "Pinjaman aktif belum bisa dihapus sebelum lunas.",
      });
    } else {
      showToast("Riwayat Self-Loan berhasil dihapus.");
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#666E61]">
            <span className="font-semibold">Sisa Utang ke Diri Sendiri</span>
            <HandCoins className="w-4 h-4 text-rose-500" />
          </div>
          <span className="text-xl font-bold text-rose-600 mt-2">
            {formatRupiah(summary.activeRemaining)}
          </span>
          <span className="text-[11px] text-[#666E61] mt-1">
            {summary.activeCount} pinjaman aktif • 0% bunga
          </span>
        </div>

        <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#666E61]">
            <span className="font-semibold">Total Pokok Dicairkan</span>
            <Wallet className="w-4 h-4 text-[#2196F3]" />
          </div>
          <span className="text-xl font-bold text-[#242921] mt-2">
            {formatRupiah(summary.totalPrincipal)}
          </span>
          <span className="text-[11px] text-[#666E61] mt-1">Akumulasi dana yang dipinjam</span>
        </div>

        <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#666E61]">
            <span className="font-semibold">Sudah Dikembalikan</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xl font-bold text-emerald-700 mt-2">
            {formatRupiah(summary.totalPaid)}
          </span>
          <span className="text-[11px] text-[#666E61] mt-1">
            Progress pelunasan: {summary.overallProgress}%
          </span>
        </div>

        <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#666E61]">
            <span className="font-semibold">Status Riwayat Loan</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xl font-bold text-[#242921] mt-2">
            {summary.paidCount} Lunas
          </span>
          <span className="text-[11px] text-[#666E61] mt-1">
            Dari total {selfLoans.length} pinjaman
          </span>
        </div>
      </div>

      {/* 2. ACTION BAR */}
      <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-[#E3F2FD]/40 p-1 rounded-2xl border border-[#EEEEEE]">
          {[
            { id: "ALL" as const, label: "Semua" },
            { id: "ACTIVE" as const, label: `Aktif (${summary.activeCount})` },
            { id: "PAID" as const, label: `Lunas (${summary.paidCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-[#2196F3] text-white shadow-xs"
                  : "text-[#666E61] hover:text-[#242921]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-[#2196F3] hover:bg-[#1E88E5] text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Self-Loan (Cairkan Aset)</span>
        </button>
      </div>

      {/* 3. LOANS LIST */}
      {filteredLoans.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-dashed border-[#EEEEEE] rounded-3xl p-10 text-center space-y-2 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#E3F2FD] text-[#2196F3] mx-auto flex items-center justify-center">
            <HandCoins className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#242921]">Belum Ada Self-Loan</h4>
          <p className="text-xs text-[#666E61] max-w-md mx-auto leading-relaxed">
            Saat butuh dana mendadak, cairkan aset non-eksternalmu di sini agar tercatat sebagai
            utang ke diri sendiri dan bisa dicicil balik hingga lunas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredLoans.map((loan) => {
            const pct =
              loan.principal_amount > 0
                ? Math.min(100, Math.round((loan.paid_amount / loan.principal_amount) * 100))
                : 0;
            const isPaid = loan.status === "PAID" || loan.remaining_amount <= 0;
            const loanPayments = selfLoanPayments.filter((p) => p.loan_id === loan.id);
            const isExpanded = Boolean(expandedLoanIds[loan.id]);

            return (
              <div
                key={loan.id}
                className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-[#242921]">{loan.title}</h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {isPaid ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          <span>{isPaid ? "LUNAS" : "AKTIF"}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#666E61]">
                        <span className="bg-[#E3F2FD]/60 text-[#1565C0] px-2 py-0.5 rounded-md font-semibold">
                          Sumber: {loan.asset_name}
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Landmark className="w-3 h-3 text-[#2196F3]" />
                          Cair ke {loan.target_bank}
                        </span>
                        <span>• {loan.loan_date}</span>
                        {loan.due_date && (
                          <span className="text-amber-700 font-medium">
                            • Target: {loan.due_date}
                          </span>
                        )}
                      </div>
                    </div>

                    {isPaid && (
                      <button
                        type="button"
                        onClick={() => setPendingDeleteLoan(loan)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                        title="Hapus riwayat pinjaman lunas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Numbers & Progress */}
                  <div className="bg-[#F8FAFC] border border-[#EEEEEE] rounded-2xl p-3.5 space-y-2.5">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-[#666E61] block">Pokok Pinjaman</span>
                        <span className="font-bold text-[#242921]">
                          {formatRupiah(loan.principal_amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#666E61] block">Sudah Dibayar</span>
                        <span className="font-bold text-emerald-700">
                          {formatRupiah(loan.paid_amount)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#666E61] block">Sisa Utang</span>
                        <span
                          className={`font-black ${
                            isPaid ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          {formatRupiah(loan.remaining_amount)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="h-2 w-full bg-[#EEEEEE] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            isPaid ? "bg-emerald-500" : "bg-[#2196F3]"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#666E61] font-medium">
                        <span>Progress Pengembalian: {pct}%</span>
                        {loan.disbursed_units !== undefined && loan.disbursed_units > 0 && (
                          <span className="text-amber-800">
                            Emas: -{loan.disbursed_units} gr | Kembali: +
                            {loan.returned_units ?? 0} gr
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {loan.notes && (
                    <p className="text-[11px] text-[#666E61] italic">Catatan: {loan.notes}</p>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-2 border-t border-[#EEEEEE] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleHistory(loan.id)}
                      className="text-xs font-semibold text-[#666E61] hover:text-[#242921] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Riwayat Cicilan ({loanPayments.length})</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => setRepayTargetLoan(loan)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-xs cursor-pointer"
                      >
                        Bayar / Cicil
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="space-y-1.5 pt-1">
                      {loanPayments.length === 0 ? (
                        <p className="text-[11px] text-[#666E61] italic">
                          Belum ada pembayaran cicilan tercatat.
                        </p>
                      ) : (
                        loanPayments.map((pay) => (
                          <div
                            key={pay.id}
                            className="flex items-center justify-between text-[11px] bg-[#F8FAFC] border border-[#EEEEEE] rounded-xl px-3 py-2"
                          >
                            <div>
                              <span className="font-semibold text-[#242921]">
                                {pay.payment_date}
                              </span>
                              <span className="text-[#666E61] ml-1.5">
                                • via {pay.source_bank}
                              </span>
                              {pay.notes && (
                                <span className="text-[#666E61] block text-[10px]">
                                  {pay.notes}
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-emerald-700 block">
                                +{formatRupiah(pay.amount)}
                              </span>
                              {pay.units_restored !== undefined && pay.units_restored > 0 && (
                                <span className="text-[10px] text-amber-800">
                                  +{pay.units_restored} gr
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateSelfLoanModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        assets={assets}
        selectedMonth={selectedMonth}
        onCreate={createSelfLoan}
        onError={(title, message) => setValidationAlert({ title, message })}
        onSuccess={showToast}
      />

      <RepaySelfLoanModal
        loan={repayTargetLoan}
        assets={assets}
        selectedMonth={selectedMonth}
        onClose={() => setRepayTargetLoan(null)}
        onRepay={repaySelfLoan}
        onError={(title, message) => setValidationAlert({ title, message })}
        onSuccess={showToast}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(pendingDeleteLoan)}
        title="Hapus Riwayat Self-Loan?"
        message={
          pendingDeleteLoan
            ? `Yakin mau menghapus riwayat pinjaman lunas '${pendingDeleteLoan.title}'? (Nilai aset dan saldo bank tidak akan diubah).`
            : ""
        }
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteLoan(null)}
      />
    </div>
  );
};
