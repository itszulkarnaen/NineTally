"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Plus, RefreshCw, Pencil, Trash2, X } from "lucide-react";
import { CashflowCategory } from "@/types";
import { ValidationAlertState } from "../types";

interface CategoriesTabProps {
  setValidationAlert: (alert: ValidationAlertState | null) => void;
  setToast: (msg: string | null) => void;
}

const PRESET_COLORS = [
  "#2196F3", // Sage / Primary Blue
  "#C2A382", // Sand
  "#D8A47F", // Clay
  "#7E8D85", // Slate
  "#B3A394", // Taupe
  "#A4B494", // Olive
  "#9381FF", // Purple
  "#4E79A7", // Ocean Blue
  "#E07A5F", // Terracotta
  "#F2CC8F", // Honey
];

export const CategoriesTab: React.FC<CategoriesTabProps> = ({
  setValidationAlert,
  setToast,
}) => {
  const {
    categories,
    cashflowUnits,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useApp();

  // Form state for creating Master Category
  const [catName, setCatName] = useState("");
  const [catCode, setCatCode] = useState("");
  const [catColor, setCatColor] = useState("#2196F3");
  const [catDesc, setCatDesc] = useState("");
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  // Edit modal state
  const [editingCategory, setEditingCategory] = useState<CashflowCategory | null>(null);
  const [isSubmittingEditCat, setIsSubmittingEditCat] = useState(false);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const code = catCode.trim()
      ? catCode.trim().toUpperCase().replace(/\s+/g, "_")
      : catName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_");

    setIsSubmittingCat(true);
    const res = await createCategory({
      code,
      name: catName.trim(),
      color: catColor || "#2196F3",
      description: catDesc.trim() || undefined,
      sort_order: categories.length + 1,
    });
    setIsSubmittingCat(false);

    if (!res.success) {
      setValidationAlert({
        title: "Gagal Menyimpan Kategori",
        message: res.message || "Terjadi kesalahan saat menyimpan kategori ke database.",
      });
      return;
    }

    setCatName("");
    setCatCode("");
    setCatDesc("");
    setToast("Kategori berhasil disimpan ke database!");
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeleteCategory = async (id: string) => {
    const res = await deleteCategory(id);
    if (!res.success) {
      setValidationAlert({
        title: "Penghapusan Kategori Ditolak",
        message: res.message || "Kategori tidak dapat dihapus karena masih dipakai oleh item cashflow.",
      });
    } else {
      setToast("Kategori berhasil dihapus.");
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleUpdateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    setIsSubmittingEditCat(true);
    const res = await updateCategory(editingCategory.id, {
      name: editingCategory.name.trim(),
      code: editingCategory.code.trim().toUpperCase(),
      color: editingCategory.color,
      description: editingCategory.description?.trim() || undefined,
    });
    setIsSubmittingEditCat(false);

    if (!res.success) {
      setValidationAlert({
        title: "Gagal Update Kategori",
        message: res.message || "Terjadi kesalahan saat memperbarui kategori di database.",
      });
      return;
    }

    setEditingCategory(null);
    setToast("Perubahan kategori berhasil disimpan!");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Input New Category (4 cols) */}
        <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 space-y-4 shadow-xs">
          <h3 className="text-xs font-bold text-[#242921] uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-[#2196F3]" />
            Tambah Master Kategori
          </h3>

          <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
            <div>
              <label className="text-[#666E61] block mb-1 font-medium">Nama Kategori</label>
              <input
                type="text"
                required
                placeholder="e.g. Hobi & Gaming"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-1.5 text-xs text-[#242921]"
              />
            </div>

            <div>
              <label className="text-[#666E61] block mb-1 font-medium">Kode Kategori (Opsional)</label>
              <input
                type="text"
                placeholder="e.g. HOBI"
                value={catCode}
                onChange={(e) => setCatCode(e.target.value)}
                className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-1.5 text-xs text-[#242921]"
              />
            </div>

            <div>
              <label className="text-[#666E61] block mb-1 font-medium">
                Pilihan Warna (Untuk Pie Chart & Badge)
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="color"
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-[#EEEEEE] p-0.5 bg-transparent"
                />
                <span className="font-mono text-xs text-[#666E61]">{catColor}</span>
              </div>
              {/* Swatches presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_COLORS.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setCatColor(swatch)}
                    style={{ backgroundColor: swatch }}
                    className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                      catColor === swatch ? "ring-2 ring-[#242921] scale-110" : "hover:scale-105"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-[#666E61] block mb-1 font-medium">Deskripsi Singkat</label>
              <textarea
                rows={2}
                placeholder="Keterangan alokasi kategori ini..."
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-1.5 text-xs text-[#242921]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingCat}
              className={`w-full py-2 font-semibold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                isSubmittingCat
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-[#2196F3] hover:bg-[#1E88E5] text-white"
              }`}
            >
              {isSubmittingCat ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan Kategori...</span>
                </>
              ) : (
                <span>Simpan Kategori Baru</span>
              )}
            </button>
          </form>
        </div>

        {/* Master Categories Table (8 cols) */}
        <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#242921] uppercase tracking-wider">
              Daftar Master Kategori ({categories.length})
            </h3>
            <span className="text-[10px] text-[#666E61]">
              Tersinkron otomatis dengan Pie Chart Outcome & Cashflow Items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EEEEEE] text-[#666E61]">
                  <th className="py-2.5 px-3">Warna</th>
                  <th className="py-2.5 px-3">Nama Kategori</th>
                  <th className="py-2.5 px-3">Kode</th>
                  <th className="py-2.5 px-3">Deskripsi</th>
                  <th className="py-2.5 px-3 text-center">Penggunaan</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEEEEE] text-[#242921]">
                {categories.map((c) => {
                  const usageCount = cashflowUnits.filter((u) => u.category === c.code).length;

                  return (
                    <tr key={c.id} className="hover:bg-[#E3F2FD]/20 transition">
                      <td className="py-3 px-3">
                        <span
                          className="w-4 h-4 rounded-full inline-block shadow-2xs border border-white"
                          style={{ backgroundColor: c.color }}
                        />
                      </td>
                      <td className="py-3 px-3 font-bold text-[#242921]">{c.name}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#666E61]">{c.code}</td>
                      <td className="py-3 px-3 text-[#666E61] max-w-xs">{c.description || "-"}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E3F2FD] text-[#242921]">
                          {usageCount} Item
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingCategory(c)}
                            className="p-1 rounded-lg text-slate-400 hover:text-[#2196F3] hover:bg-[#2196F3]/10 transition cursor-pointer"
                            title="Edit kategori"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(c.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus kategori"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: EDIT MASTER CATEGORY */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#2196F3]" />
                <h3 className="text-sm font-bold text-[#242921]">Edit Master Kategori</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="p-1 rounded-lg text-[#666E61] hover:bg-[#EEEEEE] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCategorySubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Nama Kategori</label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                  required
                />
              </div>

              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Kode Kategori</label>
                <input
                  type="text"
                  value={editingCategory.code}
                  onChange={(e) => setEditingCategory({ ...editingCategory, code: e.target.value })}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs font-mono text-[#242921]"
                  required
                />
              </div>

              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Pilihan Warna</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="color"
                    value={editingCategory.color}
                    onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-[#EEEEEE] p-0.5 bg-transparent"
                  />
                  <span className="font-mono text-xs text-[#666E61]">{editingCategory.color}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_COLORS.map((swatch) => (
                    <button
                      key={swatch}
                      type="button"
                      onClick={() => setEditingCategory({ ...editingCategory, color: swatch })}
                      style={{ backgroundColor: swatch }}
                      className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                        editingCategory.color === swatch ? "ring-2 ring-[#242921] scale-110" : "hover:scale-105"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Deskripsi</label>
                <textarea
                  rows={2}
                  value={editingCategory.description || ""}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EEEEEE]">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 border border-[#EEEEEE] text-[#666E61] hover:bg-[#EEEEEE]/50 font-medium text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditCat}
                  className={`px-4 py-2 font-semibold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    isSubmittingEditCat
                      ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                      : "bg-[#2196F3] hover:bg-[#1E88E5] text-white"
                  }`}
                >
                  {isSubmittingEditCat ? (
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

