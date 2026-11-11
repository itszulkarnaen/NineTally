"use client";

import { useState } from "react";
import { Asset, SelfLoan, SelfLoanPayment, SelfLoanTargetBank } from "@/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { applyAssetLoanDisbursement, applyAssetLoanRepayment } from "@/lib/utils";
import { MonthPeriodData } from "../types";

interface UseSelfLoansOptions {
  assets: Asset[];
  updateAsset: (id: string, asset: Partial<Asset>) => Promise<{ success: boolean; message?: string }>;
  currentMonthData: MonthPeriodData;
  updateBankBalance: (bcaBalance: number, jagoBalance: number) => void;
  broadcastSync: (payload: Record<string, unknown>) => void;
}

const isMissingSelfLoansTableError = (err: { code?: string; message?: string }) =>
  err.code === "42P01" ||
  err.code === "PGRST205" ||
  Boolean(
    err.message &&
      (err.message.includes("self_loans") ||
        err.message.includes("self_loan_payments") ||
        err.message.includes("schema cache") ||
        err.message.includes("does not exist"))
  );

export function useSelfLoans({
  assets,
  updateAsset,
  currentMonthData,
  updateBankBalance,
  broadcastSync,
}: UseSelfLoansOptions) {
  const [selfLoans, setSelfLoans] = useState<SelfLoan[]>([]);
  const [selfLoanPayments, setSelfLoanPayments] = useState<SelfLoanPayment[]>([]);

  const createSelfLoan = async (input: {
    asset_id: string;
    title: string;
    principal_amount: number;
    target_bank: SelfLoanTargetBank;
    loan_date: string;
    due_date?: string;
    notes?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    const cleanTitle = input.title.trim();
    const amount = Math.round(Number(input.principal_amount) || 0);

    if (!cleanTitle) {
      return { success: false, message: "Nama/keperluan Self-Loan tidak boleh kosong." };
    }
    if (amount <= 0) {
      return { success: false, message: "Nominal pinjaman harus lebih besar dari Rp 0." };
    }

    const asset = assets.find((a) => a.id === input.asset_id);
    if (!asset) {
      return { success: false, message: "Aset sumber tidak ditemukan." };
    }
    if (asset.is_external) {
      return {
        success: false,
        message: "Aset eksternal (seperti BPJS TK) tidak dapat dicairkan langsung menjadi Self-Loan.",
      };
    }
    if (amount > asset.total_value) {
      return {
        success: false,
        message: `Nominal pinjaman melebihi nilai aset '${asset.name}' yang tersedia.`,
      };
    }

    const { patch, unitsSold } = applyAssetLoanDisbursement(asset, amount);
    const nowIso = new Date().toISOString();
    const newLoan: SelfLoan = {
      id: `loan-${Date.now()}`,
      asset_id: asset.id,
      asset_name: asset.name,
      title: cleanTitle,
      principal_amount: amount,
      paid_amount: 0,
      remaining_amount: amount,
      disbursed_units: unitsSold,
      returned_units: unitsSold !== undefined ? 0 : undefined,
      target_bank: input.target_bank,
      status: "ACTIVE",
      loan_date: input.loan_date,
      due_date: input.due_date?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      created_at: nowIso,
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("self_loans").insert({
          id: newLoan.id,
          asset_id: newLoan.asset_id,
          asset_name: newLoan.asset_name,
          title: newLoan.title,
          principal_amount: newLoan.principal_amount,
          paid_amount: 0,
          remaining_amount: newLoan.remaining_amount,
          disbursed_units: newLoan.disbursed_units ?? null,
          returned_units: newLoan.returned_units ?? null,
          target_bank: newLoan.target_bank,
          status: newLoan.status,
          loan_date: newLoan.loan_date,
          due_date: newLoan.due_date || null,
          notes: newLoan.notes || null,
          created_at: nowIso,
        });

        if (error && !isMissingSelfLoansTableError(error)) {
          return {
            success: false,
            message: `Gagal menyimpan Self-Loan ke database: ${error.message}`,
          };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal menghubungi server";
        return { success: false, message: `Koneksi database bermasalah: ${msg}` };
      }
    }

    // 1. Cut asset value (and grams if unit-based)
    const assetRes = await updateAsset(asset.id, patch);
    if (!assetRes.success) {
      return assetRes;
    }

    // 2. Credit operational bank balance for the active month
    const nextBca =
      (currentMonthData.real_bca_balance || 0) + (input.target_bank === "BCA" ? amount : 0);
    const nextJago =
      (currentMonthData.real_jago_balance || 0) + (input.target_bank === "JAGO" ? amount : 0);
    updateBankBalance(nextBca, nextJago);

    setSelfLoans((prev) => [newLoan, ...prev]);
    broadcastSync({ type: "SELF_LOAN_CHANGED" });
    return { success: true };
  };

  const repaySelfLoan = async (input: {
    loan_id: string;
    amount: number;
    source_bank: SelfLoanTargetBank;
    payment_date: string;
    notes?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    const loan = selfLoans.find((l) => l.id === input.loan_id);
    if (!loan) {
      return { success: false, message: "Data Self-Loan tidak ditemukan." };
    }
    if (loan.status === "PAID" || loan.remaining_amount <= 0) {
      return { success: false, message: "Pinjaman ini sudah lunas." };
    }

    const amount = Math.round(Number(input.amount) || 0);
    if (amount <= 0) {
      return { success: false, message: "Nominal cicilan harus lebih besar dari Rp 0." };
    }
    if (amount > loan.remaining_amount) {
      return {
        success: false,
        message: "Nominal cicilan tidak boleh melebihi sisa utang pokok.",
      };
    }

    const asset = assets.find((a) => a.id === loan.asset_id);
    const repaymentResult = asset ? applyAssetLoanRepayment(asset, amount) : null;
    const unitsRestored = repaymentResult?.unitsRestored;

    const newPaid = loan.paid_amount + amount;
    const newRemaining = Math.max(0, loan.principal_amount - newPaid);
    const newStatus = newRemaining === 0 ? "PAID" : "ACTIVE";
    const newReturnedUnits =
      loan.disbursed_units !== undefined
        ? Number(((loan.returned_units || 0) + (unitsRestored || 0)).toFixed(4))
        : undefined;

    const nowIso = new Date().toISOString();
    const newPayment: SelfLoanPayment = {
      id: `slp-${Date.now()}`,
      loan_id: loan.id,
      amount,
      units_restored: unitsRestored,
      source_bank: input.source_bank,
      payment_date: input.payment_date,
      notes: input.notes?.trim() || undefined,
      created_at: nowIso,
    };

    if (isSupabaseConfigured) {
      try {
        const { error: payErr } = await supabase.from("self_loan_payments").insert({
          id: newPayment.id,
          loan_id: newPayment.loan_id,
          amount: newPayment.amount,
          units_restored: newPayment.units_restored ?? null,
          source_bank: newPayment.source_bank,
          payment_date: newPayment.payment_date,
          notes: newPayment.notes || null,
          created_at: nowIso,
        });

        if (payErr && !isMissingSelfLoansTableError(payErr)) {
          return {
            success: false,
            message: `Gagal mencatat pembayaran cicilan ke database: ${payErr.message}`,
          };
        }

        const { error: loanErr } = await supabase
          .from("self_loans")
          .update({
            paid_amount: newPaid,
            remaining_amount: newRemaining,
            returned_units: newReturnedUnits ?? null,
            status: newStatus,
          })
          .eq("id", loan.id);

        if (loanErr && !isMissingSelfLoansTableError(loanErr)) {
          return {
            success: false,
            message: `Gagal memperbarui status pinjaman di database: ${loanErr.message}`,
          };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal menghubungi server";
        return { success: false, message: `Koneksi database bermasalah: ${msg}` };
      }
    }

    // 1. Restore value/grams to source asset if it still exists
    if (asset && repaymentResult) {
      const assetRes = await updateAsset(asset.id, repaymentResult.patch);
      if (!assetRes.success) return assetRes;
    }

    // 2. Deduct operational bank balance for active month
    const nextBca =
      (currentMonthData.real_bca_balance || 0) - (input.source_bank === "BCA" ? amount : 0);
    const nextJago =
      (currentMonthData.real_jago_balance || 0) - (input.source_bank === "JAGO" ? amount : 0);
    updateBankBalance(nextBca, nextJago);

    setSelfLoanPayments((prev) => [newPayment, ...prev]);
    setSelfLoans((prev) =>
      prev.map((l) =>
        l.id === loan.id
          ? {
              ...l,
              paid_amount: newPaid,
              remaining_amount: newRemaining,
              returned_units: newReturnedUnits,
              status: newStatus,
            }
          : l
      )
    );
    broadcastSync({ type: "SELF_LOAN_CHANGED" });
    return { success: true };
  };

  const deleteSelfLoan = async (
    id: string
  ): Promise<{ success: boolean; message?: string }> => {
    const loan = selfLoans.find((l) => l.id === id);
    if (!loan) {
      return { success: false, message: "Data Self-Loan tidak ditemukan." };
    }
    if (loan.status === "ACTIVE" && loan.remaining_amount > 0) {
      return {
        success: false,
        message: `Pinjaman '${loan.title}' masih aktif. Lunasi sisa utang terlebih dahulu sebelum menghapus riwayat ini.`,
      };
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("self_loans").delete().eq("id", id);
        if (error && !isMissingSelfLoansTableError(error)) {
          return {
            success: false,
            message: `Gagal menghapus riwayat Self-Loan dari database: ${error.message}`,
          };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal menghubungi server";
        return { success: false, message: `Koneksi database bermasalah: ${msg}` };
      }
    }

    setSelfLoans((prev) => prev.filter((l) => l.id !== id));
    setSelfLoanPayments((prev) => prev.filter((p) => p.loan_id !== id));
    broadcastSync({ type: "SELF_LOAN_CHANGED" });
    return { success: true };
  };

  return {
    selfLoans,
    setSelfLoans,
    selfLoanPayments,
    setSelfLoanPayments,
    createSelfLoan,
    repaySelfLoan,
    deleteSelfLoan,
  };
}
