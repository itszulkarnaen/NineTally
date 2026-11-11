"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { X, RefreshCw, ArrowRightLeft, ShieldCheck } from "lucide-react";
import { Asset, SelfLoan, SelfLoanTargetBank } from "@/types";
import { CurrencyInput } from "./CurrencyInput";
import { formatRupiah, isUnitBasedAsset } from "@/lib/utils";

function useDialogController(
  dialogRef: React.RefObject<HTMLDialogElement | null>,
  isOpen: boolean,
  isBusy: boolean,
  onClose: () => void
) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.returnValue = "";
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [dialogRef, isOpen]);

  // Fallback light-dismiss for browsers without <dialog closedby> support (e.g. Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    let pressedOutside = false;
    const handlePointerDown = (e: PointerEvent) => {
      pressedOutside = !isBusy && isOutside(e);
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (pressedOutside && !isBusy && isOutside(e)) {
        onClose();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dialogRef, isBusy, onClose]);
}

interface CreateSelfLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  selectedMonth: string;
  onCreate: (input: {
    asset_id: string;
    title: string;
    principal_amount: number;
    target_bank: SelfLoanTargetBank;
    loan_date: string;
    due_date?: string;
    notes?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  onError: (title: string, message: string) => void;
  onSuccess: (message: string) => void;
}

const CreateSelfLoanForm: React.FC<
  Omit<CreateSelfLoanModalProps, "isOpen" | "assets"> & {
    borrowableAssets: Asset[];
    isSubmitting: boolean;
    setIsSubmitting: (v: boolean) => void;
  }
> = ({
  borrowableAssets,
  selectedMonth,
  onClose,
  onCreate,
  onError,
  onSuccess,
  isSubmitting,
  setIsSubmitting,
}) => {
  const [assetId, setAssetId] = useState(() => borrowableAssets[0]?.id || "");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState(0);
  const [targetBank, setTargetBank] = useState<SelfLoanTargetBank>("BCA");
  const [loanDate, setLoanDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const effectiveAssetId = borrowableAssets.some((a) => a.id === assetId)
    ? assetId
    : borrowableAssets[0]?.id || "";

  const selectedAsset = useMemo(
    () => borrowableAssets.find((a) => a.id === effectiveAssetId) || null,
    [borrowableAssets, effectiveAssetId]
  );

  const estimatedGrams = useMemo(() => {
    if (!selectedAsset || !isUnitBasedAsset(selectedAsset) || amount <= 0) return null;
    const price =
      selectedAsset.price_per_unit && selectedAsset.price_per_unit > 0
        ? selectedAsset.price_per_unit
        : selectedAsset.unit_quantity && selectedAsset.unit_quantity > 0
        ? selectedAsset.total_value / selectedAsset.unit_quantity
        : 0;
    if (price <= 0) return null;
    return Number((amount / price).toFixed(4));
  }, [selectedAsset, amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) {
      onError("Aset Tidak Tersedia", "Pilih aset non-eksternal yang masih memiliki saldo.");
      return;
    }

    setIsSubmitting(true);
    const res = await onCreate({
      asset_id: selectedAsset.id,
      title,
      principal_amount: amount,
      target_bank: targetBank,
      loan_date: loanDate,
      due_date: dueDate || undefined,
      notes: notes || undefined,
    });
    setIsSubmitting(false);

    if (!res.success) {
      onError("Gagal Membuat Self-Loan", res.message || "Periksa kembali input pinjaman.");
      return;
    }

    onClose();
    onSuccess(`Self-Loan ${formatRupiah(amount)} berhasil dicairkan ke ${targetBank}!`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      <div>
        <label className="text-[#666E61] block mb-1 font-medium">
          Sumber Aset yang Dicairkan <span className="text-rose-500">*</span>
        </label>
        <select
          value={effectiveAssetId}
          onChange={(e) => {
            setAssetId(e.target.value);
            setAmount(0);
          }}
          className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs font-semibold text-[#242921]"
          required
        >
          {borrowableAssets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.platform ? ` (${a.platform})` : ""} — Tersedia {formatRupiah(a.total_value)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[#666E61] block mb-1 font-medium">
          Keperluan / Judul Pinjaman <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          autoFocus
          placeholder="e.g. Servis Motor, Talangan Darurat, DP Barang"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
          required
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[#666E61] font-medium">
            Nominal Dicairkan (Rp) <span className="text-rose-500">*</span>
          </label>
          {selectedAsset && (
            <span className="text-[10px] font-bold text-[#2196F3]">
              Maks: {formatRupiah(selectedAsset.total_value)}
            </span>
          )}
        </div>
        <CurrencyInput
          value={amount}
          onChange={setAmount}
          className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs font-bold text-[#242921]"
        />
        {selectedAsset && (
          <div className="flex items-center gap-1.5 mt-1.5">
            {[0.25, 0.5, 1].map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAmount(Math.round(selectedAsset.total_value * ratio))}
                className="px-2 py-1 rounded-lg bg-[#E3F2FD]/60 hover:bg-[#2196F3] hover:text-white text-[10px] font-bold text-[#1565C0] transition cursor-pointer"
              >
                {ratio * 100}%
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[#666E61] block mb-1 font-medium">Cairkan ke Bank</label>
          <select
            value={targetBank}
            onChange={(e) => setTargetBank(e.target.value as SelfLoanTargetBank)}
            className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs font-semibold text-[#242921]"
          >
            <option value="BCA">BCA Utama</option>
            <option value="JAGO">Bank Jago (Ops)</option>
          </select>
        </div>
        <div>
          <label className="text-[#666E61] block mb-1 font-medium">Tanggal Pinjam</label>
          <input
            type="date"
            value={loanDate}
            onChange={(e) => setLoanDate(e.target.value)}
            className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[#666E61] block mb-1 font-medium">Target Lunas (Opsional)</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
          />
        </div>
        <div>
          <label className="text-[#666E61] block mb-1 font-medium">Catatan (Opsional)</label>
          <input
            type="text"
            placeholder="Rencana cicil 3x..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
          />
        </div>
      </div>

      {selectedAsset && amount > 0 && (
        <div className="p-3 rounded-2xl bg-[#E3F2FD]/45 border border-[#90CAF9]/50 space-y-1 text-[11px]">
          <div className="flex items-center gap-1.5 font-bold text-[#1565C0]">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Simulasi Efek Otomatis</span>
          </div>
          <p className="text-[#242921]">
            • Aset <strong>{selectedAsset.name}</strong> berkurang{" "}
            <strong>-{formatRupiah(amount)}</strong> (sisa{" "}
            <strong>{formatRupiah(Math.max(0, selectedAsset.total_value - amount))}</strong>)
          </p>
          {estimatedGrams !== null && (
            <p className="text-amber-800">
              • Estimasi emas terjual: <strong>-{estimatedGrams} gram</strong>
            </p>
          )}
          <p className="text-emerald-700">
            • Saldo Bank <strong>{targetBank}</strong> ({selectedMonth}) bertambah{" "}
            <strong>+{formatRupiah(amount)}</strong>
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EEEEEE]">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 border border-[#EEEEEE] text-[#666E61] hover:bg-[#EEEEEE]/50 font-medium text-xs rounded-xl transition cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting || amount <= 0}
          className="px-4 py-2 bg-[#2196F3] hover:bg-[#1E88E5] text-white font-semibold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          <span>{isSubmitting ? "Memproses..." : "Cairkan & Catat Loan"}</span>
        </button>
      </div>
    </form>
  );
};

export const CreateSelfLoanModal: React.FC<CreateSelfLoanModalProps> = ({
  isOpen,
  onClose,
  assets,
  selectedMonth,
  onCreate,
  onError,
  onSuccess,
}) => {
  const borrowableAssets = useMemo(
    () => assets.filter((a) => !a.is_external && a.total_value > 0),
    [assets]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  useDialogController(dialogRef, isOpen, isSubmitting, onClose);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: isSubmitting ? "none" : "any" } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby={titleId}
      onCancel={(e) => {
        if (isSubmitting) e.preventDefault();
      }}
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = "";
        if (isOpen && !isSubmitting) onClose();
      }}
      className="m-auto p-0 bg-transparent border-0 max-w-md w-[calc(100%-2rem)] backdrop:bg-black/45 backdrop:backdrop-blur-xs"
    >
      <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left">
        <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
          <div>
            <h3 id={titleId} className="text-sm font-bold text-[#242921]">
              Buat Self-Loan (Cairkan Aset)
            </h3>
            <p className="text-[11px] text-[#666E61] mt-0.5">
              Pinjam dari aset sendiri (0% bunga) — langsung cair ke Bank Balance.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Tutup"
            className="p-1.5 rounded-lg text-[#666E61] hover:bg-[#EEEEEE] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {borrowableAssets.length === 0 ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
            <p className="font-bold">Belum Ada Aset Non-Eksternal yang Bisa Dicairkan</p>
            <p className="text-[11px] leading-relaxed">
              Tambahkan atau isi saldo pada aset non-eksternal (misalnya Tabungan Jago, Emas Pluang,
              atau Obligasi Bibit) di tab Assets terlebih dahulu.
            </p>
          </div>
        ) : (
          isOpen && (
            <CreateSelfLoanForm
              borrowableAssets={borrowableAssets}
              selectedMonth={selectedMonth}
              onClose={onClose}
              onCreate={onCreate}
              onError={onError}
              onSuccess={onSuccess}
              isSubmitting={isSubmitting}
              setIsSubmitting={setIsSubmitting}
            />
          )
        )}
      </div>
    </dialog>
  );
};

interface RepaySelfLoanModalProps {
  loan: SelfLoan | null;
  assets: Asset[];
  selectedMonth: string;
  onClose: () => void;
  onRepay: (input: {
    loan_id: string;
    amount: number;
    source_bank: SelfLoanTargetBank;
    payment_date: string;
    notes?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  onError: (title: string, message: string) => void;
  onSuccess: (message: string) => void;
}

const RepaySelfLoanForm: React.FC<{
  loan: SelfLoan;
  assets: Asset[];
  selectedMonth: string;
  onClose: () => void;
  onRepay: RepaySelfLoanModalProps["onRepay"];
  onError: RepaySelfLoanModalProps["onError"];
  onSuccess: RepaySelfLoanModalProps["onSuccess"];
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
}> = ({
  loan,
  assets,
  selectedMonth,
  onClose,
  onRepay,
  onError,
  onSuccess,
  isSubmitting,
  setIsSubmitting,
}) => {
  const [amount, setAmount] = useState(loan.remaining_amount);
  const [sourceBank, setSourceBank] = useState<SelfLoanTargetBank>(loan.target_bank);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const sourceAsset = useMemo(
    () => assets.find((a) => a.id === loan.asset_id) || null,
    [loan.asset_id, assets]
  );

  const restoredGrams = useMemo(() => {
    if (!sourceAsset || !isUnitBasedAsset(sourceAsset) || amount <= 0) return null;
    const price = sourceAsset.price_per_unit || 0;
    if (price <= 0) return null;
    return Number((amount / price).toFixed(4));
  }, [sourceAsset, amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await onRepay({
      loan_id: loan.id,
      amount,
      source_bank: sourceBank,
      payment_date: paymentDate,
      notes: notes || undefined,
    });
    setIsSubmitting(false);

    if (!res.success) {
      onError("Gagal Membayar Cicilan", res.message || "Periksa nominal pembayaran.");
      return;
    }

    const isFull = amount >= loan.remaining_amount;
    onClose();
    onSuccess(
      isFull
        ? `Self-Loan '${loan.title}' resmi LUNAS dan kembali ke ${loan.asset_name}!`
        : `Cicilan ${formatRupiah(amount)} berhasil dikembalikan ke ${loan.asset_name}!`
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-xs">
      <div className="p-3 rounded-2xl bg-[#F8FAFC] border border-[#EEEEEE] flex items-center justify-between">
        <span className="text-[#666E61] font-medium">Sisa Utang Pokok:</span>
        <span className="text-sm font-black text-rose-600">
          {formatRupiah(loan.remaining_amount)}
        </span>
      </div>

      <div>
        <label className="text-[#666E61] block mb-1 font-medium">
          Nominal Bayar / Cicil (Rp) <span className="text-rose-500">*</span>
        </label>
        <CurrencyInput
          value={amount}
          onChange={setAmount}
          className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs font-bold text-[#242921]"
        />
        <div className="flex items-center gap-1.5 mt-1.5">
          {[
            { label: "25%", val: Math.round(loan.remaining_amount * 0.25) },
            { label: "50%", val: Math.round(loan.remaining_amount * 0.5) },
            { label: "Lunasi Sisa", val: loan.remaining_amount },
          ].map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setAmount(opt.val)}
              className="px-2.5 py-1 rounded-lg bg-[#E3F2FD]/60 hover:bg-[#2196F3] hover:text-white text-[10px] font-bold text-[#1565C0] transition cursor-pointer"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[#666E61] block mb-1 font-medium">Ambil dari Bank</label>
          <select
            value={sourceBank}
            onChange={(e) => setSourceBank(e.target.value as SelfLoanTargetBank)}
            className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs font-semibold text-[#242921]"
          >
            <option value="BCA">BCA Utama</option>
            <option value="JAGO">Bank Jago (Ops)</option>
          </select>
        </div>
        <div>
          <label className="text-[#666E61] block mb-1 font-medium">Tanggal Bayar</label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
            required
          />
        </div>
      </div>

      <div>
        <label className="text-[#666E61] block mb-1 font-medium">Catatan (Opsional)</label>
        <input
          type="text"
          placeholder="e.g. Cicilan #1 dari gaji..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
        />
      </div>

      {amount > 0 && (
        <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1 text-[11px]">
          <div className="flex items-center gap-1.5 font-bold text-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Simulasi Pengembalian</span>
          </div>
          <p className="text-[#242921]">
            • Sisa utang menjadi{" "}
            <strong>{formatRupiah(Math.max(0, loan.remaining_amount - amount))}</strong>
          </p>
          <p className="text-rose-700">
            • Saldo Bank <strong>{sourceBank}</strong> ({selectedMonth}) berkurang{" "}
            <strong>-{formatRupiah(amount)}</strong>
          </p>
          {sourceAsset ? (
            <p className="text-emerald-700">
              • Aset <strong>{sourceAsset.name}</strong> bertambah{" "}
              <strong>+{formatRupiah(amount)}</strong>
              {restoredGrams !== null && ` (≈ +${restoredGrams} gram)`}
            </p>
          ) : (
            <p className="text-amber-800">
              • Aset sumber sudah dihapus; pembayaran hanya melunasi catatan pinjaman &amp; memotong
              Bank Balance.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EEEEEE]">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 border border-[#EEEEEE] text-[#666E61] hover:bg-[#EEEEEE]/50 font-medium text-xs rounded-xl transition cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting || amount <= 0 || amount > loan.remaining_amount}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
          <span>{isSubmitting ? "Menyimpan..." : "Bayar & Kembalikan"}</span>
        </button>
      </div>
    </form>
  );
};

export const RepaySelfLoanModal: React.FC<RepaySelfLoanModalProps> = ({
  loan,
  assets,
  selectedMonth,
  onClose,
  onRepay,
  onError,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  useDialogController(dialogRef, Boolean(loan), isSubmitting, onClose);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: isSubmitting ? "none" : "any" } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby={titleId}
      onCancel={(e) => {
        if (isSubmitting) e.preventDefault();
      }}
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = "";
        if (loan && !isSubmitting) onClose();
      }}
      className="m-auto p-0 bg-transparent border-0 max-w-md w-[calc(100%-2rem)] backdrop:bg-black/45 backdrop:backdrop-blur-xs"
    >
      {loan && (
        <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left">
          <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
            <div>
              <h3 id={titleId} className="text-sm font-bold text-[#242921]">
                Cicil / Lunasi Self-Loan
              </h3>
              <p className="text-[11px] text-[#666E61] mt-0.5">
                {loan.title} → Kembali ke <strong>{loan.asset_name}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Tutup"
              className="p-1.5 rounded-lg text-[#666E61] hover:bg-[#EEEEEE] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <RepaySelfLoanForm
            key={loan.id}
            loan={loan}
            assets={assets}
            selectedMonth={selectedMonth}
            onClose={onClose}
            onRepay={onRepay}
            onError={onError}
            onSuccess={onSuccess}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
          />
        </div>
      )}
    </dialog>
  );
};
