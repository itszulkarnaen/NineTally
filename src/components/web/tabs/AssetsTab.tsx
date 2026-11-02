"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { formatRupiah } from "@/lib/utils";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { Plus, Pencil, Trash2, X, RefreshCw } from "lucide-react";
import { Asset, LiquidityTier } from "@/types";
import { ValidationAlertState } from "../types";

interface AssetsTabProps {
  setValidationAlert: (alert: ValidationAlertState | null) => void;
  setToast: (msg: string | null) => void;
}

export const AssetsTab: React.FC<AssetsTabProps> = ({
  setValidationAlert,
  setToast,
}) => {
  const { assets, createAsset, updateAsset, deleteAsset } = useApp();

  // Create asset modal state
  const [isCreateAssetOpen, setIsCreateAssetOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetTier, setNewAssetTier] = useState<LiquidityTier>("LIQUID");
  const [newAssetMainValue, setNewAssetMainValue] = useState<number>(0);
  const [newAssetYield, setNewAssetYield] = useState<number>(0);
  const [newAssetBucket, setNewAssetBucket] = useState("");
  const [newAssetIsExternal, setNewAssetIsExternal] = useState(false);

  // Edit asset modal state
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isSubmittingEditAsset, setIsSubmittingEditAsset] = useState(false);

  const handleCreateAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim()) return;

    const res = await createAsset({
      name: newAssetName.trim(),
      liquidity_tier: newAssetTier,
      main_value: newAssetMainValue,
      generating_rate: newAssetYield,
      income_generated: 0,
      goal_bucket: newAssetBucket.trim() || undefined,
      is_external: newAssetIsExternal,
    });

    if (!res.success) {
      setValidationAlert({
        title: "Gagal Menyimpan Aset",
        message: res.message || "Terjadi kesalahan saat menyimpan aset ke database.",
      });
      return;
    }

    setNewAssetName("");
    setNewAssetTier("LIQUID");
    setNewAssetMainValue(0);
    setNewAssetYield(0);
    setNewAssetBucket("");
    setNewAssetIsExternal(false);
    setIsCreateAssetOpen(false);
    setToast("Aset berhasil disimpan ke database!");
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;

    setIsSubmittingEditAsset(true);
    const res = await updateAsset(editingAsset.id, {
      name: editingAsset.name.trim(),
      liquidity_tier: editingAsset.liquidity_tier,
      main_value: editingAsset.main_value,
      generating_rate: editingAsset.generating_rate,
      income_generated: editingAsset.income_generated,
      goal_bucket: editingAsset.goal_bucket?.trim() || undefined,
      is_external: editingAsset.is_external,
    });
    setIsSubmittingEditAsset(false);

    if (!res.success) {
      setValidationAlert({
        title: "Gagal Update Aset",
        message: res.message || "Terjadi kesalahan saat memperbarui aset di database.",
      });
      return;
    }

    setEditingAsset(null);
    setToast("Perubahan aset berhasil disimpan!");
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteAsset = async (id: string) => {
    const res = await deleteAsset(id);
    if (!res.success) {
      setValidationAlert({
        title: "Penghapusan Aset Ditolak",
        message: res.message || "Aset tidak dapat dihapus karena masih terhubung dengan Cashflow Item.",
      });
    } else {
      setToast("Aset berhasil dihapus.");
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <>
      <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
          <div>
            <h3 className="text-sm font-bold text-[#242921]">Master Portofolio & Likuiditas Aset</h3>
            <p className="text-xs text-[#666E61]">
              3 Tier Likuiditas: <strong>Liquid (Kas)</strong>, <strong>Semi-Liquid (Investasi)</strong>, dan <strong>Illiquid (Pensiun/BPJS)</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateAssetOpen(true)}
            className="px-3.5 py-1.5 bg-[#2196F3] hover:bg-[#1E88E5] text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Aset Baru
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EEEEEE] text-[#666E61]">
                <th className="py-2.5 px-3">Nama Aset</th>
                <th className="py-2.5 px-3">Tier Likuiditas</th>
                <th className="py-2.5 px-3">Modal Pokok</th>
                <th className="py-2.5 px-3">Yield / Return</th>
                <th className="py-2.5 px-3">Total Value</th>
                <th className="py-2.5 px-3">Goal Bucket</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEEEE] text-[#242921]">
              {assets.map((ast) => (
                <tr key={ast.id} className="hover:bg-[#E3F2FD]/20 transition">
                  <td className="py-3 px-3 font-bold">{ast.name}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        ast.liquidity_tier === "LIQUID"
                          ? "bg-[#2196F3]/15 text-[#2196F3]"
                          : ast.liquidity_tier === "SEMI_LIQUID"
                          ? "bg-[#90CAF9]/40 text-[#1565C0]"
                          : "bg-[#E3F2FD] text-[#666E61]"
                      }`}
                    >
                      {ast.liquidity_tier}
                    </span>
                  </td>
                  <td className="py-3 px-3">{formatRupiah(ast.main_value)}</td>
                  <td className="py-3 px-3 text-[#2196F3] font-semibold">
                    {ast.generating_rate > 0 ? `+${ast.generating_rate}%` : "-"}
                  </td>
                  <td className="py-3 px-3 font-bold text-[#242921]">{formatRupiah(ast.total_value)}</td>
                  <td className="py-3 px-3 text-[#666E61]">{ast.goal_bucket || "-"}</td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingAsset(ast)}
                        className="p-1 rounded-lg text-slate-400 hover:text-[#2196F3] hover:bg-[#2196F3]/10 transition cursor-pointer"
                        title="Edit Aset"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(ast.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Hapus Aset"
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

      {/* MODAL: TAMBAH MASTER ASET */}
      {isCreateAssetOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#2196F3]" />
                <h3 className="text-sm font-bold text-[#242921]">Tambah Aset Portofolio</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateAssetOpen(false)}
                className="p-1 rounded-lg text-[#666E61] hover:bg-[#EEEEEE] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAssetSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Nama Aset</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Reksadana Pasar Uang Bibit, Deposito Jago"
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                />
              </div>

              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Tier Likuiditas</label>
                <select
                  value={newAssetTier}
                  onChange={(e) => setNewAssetTier(e.target.value as LiquidityTier)}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                >
                  <option value="LIQUID">LIQUID (Kas / Rekening Giro / Siap Pakai)</option>
                  <option value="SEMI_LIQUID">SEMI_LIQUID (Reksadana / Saham / Emas)</option>
                  <option value="ILLIQUID">ILLIQUID (Pensiun / Properti / BPJS Ketenagakerjaan)</option>
                </select>
              </div>

              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Modal Pokok (Main Value)</label>
                <CurrencyInput
                  value={newAssetMainValue}
                  onChange={setNewAssetMainValue}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs font-semibold text-[#242921]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#666E61] block mb-1 font-medium">Yield / Return (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 5.5"
                    value={newAssetYield}
                    onChange={(e) => setNewAssetYield(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                  />
                </div>
                <div>
                  <label className="text-[#666E61] block mb-1 font-medium">Goal Bucket</label>
                  <input
                    type="text"
                    placeholder="e.g. Dana Darurat"
                    value={newAssetBucket}
                    onChange={(e) => setNewAssetBucket(e.target.value)}
                    className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="new-asset-external"
                  checked={newAssetIsExternal}
                  onChange={(e) => setNewAssetIsExternal(e.target.checked)}
                  className="rounded border-[#EEEEEE] text-[#2196F3] focus:ring-[#2196F3] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="new-asset-external" className="text-xs text-[#242921] font-medium cursor-pointer">
                  Aset Eksternal (Di luar mutasi rekening operasional harian)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EEEEEE]">
                <button
                  type="button"
                  onClick={() => setIsCreateAssetOpen(false)}
                  className="px-4 py-2 border border-[#EEEEEE] text-[#666E61] hover:bg-[#EEEEEE]/50 font-medium text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#2196F3] hover:bg-[#1E88E5] text-white font-semibold text-xs rounded-xl transition shadow-xs cursor-pointer"
                >
                  Simpan Aset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MASTER ASET */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#2196F3]" />
                <h3 className="text-sm font-bold text-[#242921]">Edit Aset Portofolio</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingAsset(null)}
                className="p-1 rounded-lg text-[#666E61] hover:bg-[#EEEEEE] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateAssetSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Nama Aset</label>
                <input
                  type="text"
                  required
                  value={editingAsset.name}
                  onChange={(e) => setEditingAsset({ ...editingAsset, name: e.target.value })}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                />
              </div>

              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Tier Likuiditas</label>
                <select
                  value={editingAsset.liquidity_tier}
                  onChange={(e) => setEditingAsset({ ...editingAsset, liquidity_tier: e.target.value as LiquidityTier })}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                >
                  <option value="LIQUID">LIQUID (Kas / Rekening Giro)</option>
                  <option value="SEMI_LIQUID">SEMI_LIQUID (Reksadana / Saham)</option>
                  <option value="ILLIQUID">ILLIQUID (Pensiun / Properti)</option>
                </select>
              </div>

              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Modal Pokok (Main Value)</label>
                <CurrencyInput
                  value={editingAsset.main_value}
                  onChange={(val) => setEditingAsset({ ...editingAsset, main_value: val })}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs font-semibold text-[#242921]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#666E61] block mb-1 font-medium">Yield / Return (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingAsset.generating_rate}
                    onChange={(e) => setEditingAsset({ ...editingAsset, generating_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                  />
                </div>
                <div>
                  <label className="text-[#666E61] block mb-1 font-medium">Goal Bucket</label>
                  <input
                    type="text"
                    value={editingAsset.goal_bucket || ""}
                    onChange={(e) => setEditingAsset({ ...editingAsset, goal_bucket: e.target.value })}
                    className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Income Generated (Akumulasi Return)</label>
                <CurrencyInput
                  value={editingAsset.income_generated}
                  onChange={(val) => setEditingAsset({ ...editingAsset, income_generated: val })}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-asset-external"
                  checked={editingAsset.is_external || false}
                  onChange={(e) => setEditingAsset({ ...editingAsset, is_external: e.target.checked })}
                  className="rounded border-[#EEEEEE] text-[#2196F3] focus:ring-[#2196F3] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="edit-asset-external" className="text-xs text-[#242921] font-medium cursor-pointer">
                  Aset Eksternal
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EEEEEE]">
                <button
                  type="button"
                  onClick={() => setEditingAsset(null)}
                  className="px-4 py-2 border border-[#EEEEEE] text-[#666E61] hover:bg-[#EEEEEE]/50 font-medium text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditAsset}
                  className={`px-4 py-2 font-semibold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    isSubmittingEditAsset
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-[#2196F3] hover:bg-[#1E88E5] text-white"
                  }`}
                >
                  {isSubmittingEditAsset ? (
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

