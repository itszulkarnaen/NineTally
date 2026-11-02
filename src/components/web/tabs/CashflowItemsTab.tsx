"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Plus, RefreshCw, Pencil, Trash2, X } from "lucide-react";
import { CashflowUnit, UnitType, ExpenseCategory, UrgencyLevel } from "@/types";
import { ValidationAlertState } from "../types";

interface CashflowItemsTabProps {
  setValidationAlert: (alert: ValidationAlertState | null) => void;
  setToast: (msg: string | null) => void;
}

export const CashflowItemsTab: React.FC<CashflowItemsTabProps> = ({
  setValidationAlert,
  setToast,
}) => {
  const {
    cashflowUnits,
    categories,
    assets,
    createCashflowUnit,
    updateCashflowUnit,
    deleteCashflowUnit,
  } = useApp();

  // Form state for creating Master Cashflow Unit
  const [unitCode, setUnitCode] = useState("");
  const [unitName, setUnitName] = useState("");
  const [unitType, setUnitType] = useState<UnitType>("EXPENSE");
  const [unitCategory, setUnitCategory] = useState<ExpenseCategory>("MONTHLY_NEEDS");
  const [unitUrgency, setUnitUrgency] = useState<UrgencyLevel>("NORMAL");
  const [isSubmittingUnit, setIsSubmittingUnit] = useState(false);

  // Edit modal state
  const [editingUnit, setEditingUnit] = useState<CashflowUnit | null>(null);
  const [isSubmittingEditUnit, setIsSubmittingEditUnit] = useState(false);

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim()) return;

    setIsSubmittingUnit(true);
    const res = await createCashflowUnit({
      code: unitCode.trim() || `CF-${Date.now().toString().slice(-6)}`,
      name: unitName.trim(),
      unit_type: unitType,
      category: unitType === "EXPENSE" ? unitCategory : undefined,
      default_urgency: unitUrgency,
    });
    setIsSubmittingUnit(false);

    if (!res.success) {
      setValidationAlert({
        title: "Gagal Menyimpan Cashflow Item",
        message: res.message || "Terjadi kesalahan saat menyimpan data ke database Supabase.",
      });
      return;
    }

    setUnitName("");
    setUnitCode("");
    setToast("Cashflow item berhasil disimpan ke database!");
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteUnit = async (id: string) => {
    const res = await deleteCashflowUnit(id);
    if (!res.success) {
      setValidationAlert({
        title: "Penghapusan Cashflow Item Ditolak",
        message: res.message || "Item tidak dapat dihapus karena sudah dipakai dalam anggaran atau transaksi.",
        suggestArchiveUnitId: id,
      });
    } else {
      setToast("Cashflow item berhasil dihapus.");
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleToggleUnitArchive = async (unit: CashflowUnit) => {
    const res = await updateCashflowUnit(unit.id, { is_active: !unit.is_active });
    if (!res.success) {
      setValidationAlert({
        title: "Gagal Mengubah Status Item",
        message: res.message || "Terjadi kesalahan saat memperbarui status ke database.",
      });
    }
  };

  const handleUpdateUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;

    setIsSubmittingEditUnit(true);
    const res = await updateCashflowUnit(editingUnit.id, {
      name: editingUnit.name.trim(),
      code: editingUnit.code.trim(),
      unit_type: editingUnit.unit_type,
      category: editingUnit.unit_type === "EXPENSE" ? editingUnit.category : undefined,
      default_urgency: editingUnit.default_urgency,
      linked_asset_id: editingUnit.unit_type === "ASSET" ? editingUnit.linked_asset_id : undefined,
      is_active: editingUnit.is_active,
    });
    setIsSubmittingEditUnit(false);

    if (!res.success) {
      setValidationAlert({
        title: "Gagal Update Cashflow Item",
        message: res.message || "Terjadi kesalahan saat memperbarui data di database.",
      });
      return;
    }

    setEditingUnit(null);
    setToast("Perubahan Cashflow item berhasil disimpan!");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Input New Unit (4 cols) */}
        <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-[#242921] uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-[#2196F3]" />
            Tambah Master Cashflow Item
          </h3>

          <form onSubmit={handleCreateUnit} className="space-y-3 text-xs">
            <div>
              <label className="text-[#666E61] block mb-1 font-medium">Kode Unit</label>
              <input
                type="text"
                placeholder="e.g. CF-ZAKAT"
                value={unitCode}
                onChange={(e) => setUnitCode(e.target.value)}
                className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-1.5 text-xs text-[#242921]"
              />
            </div>

            <div>
              <label className="text-[#666E61] block mb-1 font-medium">Nama Cashflow Item</label>
              <input
                type="text"
                required
                placeholder="e.g. Listrik Kantor"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-1.5 text-xs text-[#242921]"
              />
            </div>

            <div>
              <label className="text-[#666E61] block mb-1 font-medium">Tipe Item</label>
              <select
                value={unitType}
                onChange={(e) => setUnitType(e.target.value as UnitType)}
                className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-1.5 text-xs text-[#242921]"
              >
                <option value="EXPENSE">EXPENSE (Pengeluaran Rutin)</option>
                <option value="ASSET">ASSET (Alokasi Tabungan/Investasi)</option>
                <option value="INCOME">INCOME (Pemasukan)</option>
              </select>
            </div>

            {unitType === "EXPENSE" && (
              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Kategori</label>
                <select
                  value={unitCategory}
                  onChange={(e) => setUnitCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-1.5 text-xs text-[#242921]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-[#666E61] block mb-1 font-medium">Default Urgency</label>
              <select
                value={unitUrgency}
                onChange={(e) => setUnitUrgency(e.target.value as UrgencyLevel)}
                className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-1.5 text-xs text-[#242921]"
              >
                <option value="HIGHEST">HIGHEST (Urgent)</option>
                <option value="HIGH">HIGH</option>
                <option value="NORMAL">NORMAL</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmittingUnit}
              className={`w-full py-2 font-semibold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                isSubmittingUnit
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-[#2196F3] hover:bg-[#1E88E5] text-white"
              }`}
            >
              {isSubmittingUnit ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan ke Database...</span>
                </>
              ) : (
                <span>Simpan ke Master</span>
              )}
            </button>
          </form>
        </div>

        {/* Master Units Table (8 cols) */}
        <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-[#242921] uppercase tracking-wider">
              Katalog Master Cashflow Items ({cashflowUnits.length})
            </h3>
            <span className="text-[10px] text-[#666E61]">
              Klik badge status untuk toggle aktif/arsip
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EEEEEE] text-[#666E61]">
                  <th className="py-2.5 px-3">Kode</th>
                  <th className="py-2.5 px-3">Nama Item</th>
                  <th className="py-2.5 px-3">Tipe</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3">Urgency</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEEE] text-[#242921]">
                {cashflowUnits.map((u) => (
                  <tr key={u.id} className="hover:bg-[#E3F2FD]/20 transition">
                    <td className="py-2.5 px-3 font-mono text-[#666E61]">{u.code}</td>
                    <td className="py-2.5 px-3 font-semibold">{u.name}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#E3F2FD] text-[#666E61]">
                        {u.unit_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#666E61]">{u.category || "-"}</td>
                    <td className="py-2.5 px-3 font-medium">{u.default_urgency}</td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleUnitArchive(u)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                          u.is_active !== false
                            ? "bg-[#2196F3]/15 text-[#2196F3] hover:bg-[#2196F3]/25"
                            : "bg-[#EEEEEE] text-[#666E61] hover:bg-[#E3F2FD]"
                        }`}
                        title="Klik untuk ubah status aktif / arsip"
                      >
                        {u.is_active !== false ? "Aktif" : "Archived"}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingUnit(u)}
                          className="p-1 rounded-lg text-slate-400 hover:text-[#2196F3] hover:bg-[#2196F3]/10 transition cursor-pointer"
                          title="Edit Unit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUnit(u.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus Unit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: EDIT CASHFLOW UNIT */}
      {editingUnit && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#2196F3]" />
                <h3 className="text-sm font-bold text-[#242921]">Edit Cashflow Item</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUnit(null)}
                className="p-1 rounded-lg text-[#666E61] hover:bg-[#EEEEEE] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUnitSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Kode Unit</label>
                <input
                  type="text"
                  value={editingUnit.code}
                  onChange={(e) => setEditingUnit({ ...editingUnit, code: e.target.value })}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs font-mono text-[#242921]"
                  required
                />
              </div>

              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Nama Cashflow Item</label>
                <input
                  type="text"
                  value={editingUnit.name}
                  onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                  required
                />
              </div>

              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Tipe Item</label>
                <select
                  value={editingUnit.unit_type}
                  onChange={(e) => setEditingUnit({ ...editingUnit, unit_type: e.target.value as UnitType })}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                >
                  <option value="EXPENSE">EXPENSE (Pengeluaran Rutin)</option>
                  <option value="ASSET">ASSET (Alokasi Tabungan/Investasi)</option>
                  <option value="INCOME">INCOME (Pemasukan)</option>
                </select>
              </div>

              {editingUnit.unit_type === "EXPENSE" && (
                <div>
                  <label className="text-[#666E61] block mb-1 font-medium">Kategori</label>
                  <select
                    value={editingUnit.category || ""}
                    onChange={(e) => setEditingUnit({ ...editingUnit, category: e.target.value })}
                    className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                  >
                    <option value="">Pilih Kategori...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editingUnit.unit_type === "ASSET" && (
                <div>
                  <label className="text-[#666E61] block mb-1 font-medium">Tautkan ke Aset Portofolio (Opsional)</label>
                  <select
                    value={editingUnit.linked_asset_id || ""}
                    onChange={(e) => setEditingUnit({ ...editingUnit, linked_asset_id: e.target.value || undefined })}
                    className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                  >
                    <option value="">Tidak ditautkan</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.liquidity_tier})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Default Urgency</label>
                <select
                  value={editingUnit.default_urgency}
                  onChange={(e) => setEditingUnit({ ...editingUnit, default_urgency: e.target.value as UrgencyLevel })}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                >
                  <option value="HIGHEST">HIGHEST (Urgent)</option>
                  <option value="HIGH">HIGH</option>
                  <option value="NORMAL">NORMAL</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="unit-active-status"
                  checked={editingUnit.is_active !== false}
                  onChange={(e) => setEditingUnit({ ...editingUnit, is_active: e.target.checked })}
                  className="rounded border-[#EEEEEE] text-[#2196F3] focus:ring-[#2196F3] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="unit-active-status" className="text-xs text-[#242921] font-medium cursor-pointer">
                  Item Aktif (centang untuk tetap muncul di daftar alokasi anggaran)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EEEEEE]">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="px-4 py-2 border border-[#EEEEEE] text-[#666E61] hover:bg-[#EEEEEE]/50 font-medium text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditUnit}
                  className={`px-4 py-2 font-semibold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    isSubmittingEditUnit
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-[#2196F3] hover:bg-[#1E88E5] text-white"
                  }`}
                >
                  {isSubmittingEditUnit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan ke DB...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

