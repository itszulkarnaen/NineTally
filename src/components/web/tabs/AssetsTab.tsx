"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { formatRupiah, isUnitBasedAsset, computeAssetValues } from "@/lib/utils";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Coins,
  Wallet,
  TrendingUp,
  Shield,
  Sparkles,
} from "lucide-react";
import { Asset, LiquidityTier } from "@/types";
import { ValidationAlertState } from "../types";

interface AssetsTabProps {
  setValidationAlert: (alert: ValidationAlertState | null) => void;
  setToast: (msg: string | null) => void;
}

interface GoldPriceResponse {
  pricePerGramIdr: number;
  xauUsd?: number;
  usdIdr?: number;
  source: string;
  updatedAt: string;
}

export const AssetsTab: React.FC<AssetsTabProps> = ({
  setValidationAlert,
  setToast,
}) => {
  const { assets, createAsset, updateAsset, deleteAsset } = useApp();

  // Live Gold Price State
  const [goldQuote, setGoldQuote] = useState<GoldPriceResponse | null>(null);
  const [isSyncingGold, setIsSyncingGold] = useState(false);

  // Filter by liquidity tier or goal
  const [tierFilter, setTierFilter] = useState<"ALL" | LiquidityTier>("ALL");

  // Create asset modal state
  const [isCreateAssetOpen, setIsCreateAssetOpen] = useState(false);
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetPlatform, setNewAssetPlatform] = useState("");
  const [newAssetTier, setNewAssetTier] = useState<LiquidityTier>("LIQUID");
  const [newAssetIsGramMode, setNewAssetIsGramMode] = useState(false);
  const [newAssetMainValue, setNewAssetMainValue] = useState<number>(0);
  const [newAssetIncomeGen, setNewAssetIncomeGen] = useState<number>(0);
  const [newAssetYield, setNewAssetYield] = useState<number>(0);
  const [newAssetGramQty, setNewAssetGramQty] = useState<string>("0");
  const [newAssetPricePerGram, setNewAssetPricePerGram] = useState<number>(0);
  const [newAssetBucket, setNewAssetBucket] = useState("");
  const [newAssetIsExternal, setNewAssetIsExternal] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit asset modal state
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editGramQtyInput, setEditGramQtyInput] = useState<string>("0");
  const [isSubmittingEditAsset, setIsSubmittingEditAsset] = useState(false);

  // Close modals on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsCreateAssetOpen(false);
        setEditingAsset(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Portfolio Summary Breakdown
  const summary = useMemo(() => {
    let totalValue = 0;
    let totalMain = 0;
    let totalReturn = 0;
    let liquid = 0;
    let semiLiquid = 0;
    let illiquid = 0;

    assets.forEach((a) => {
      totalValue += a.total_value;
      totalMain += a.main_value;
      totalReturn += a.income_generated;
      if (a.liquidity_tier === "LIQUID") liquid += a.total_value;
      else if (a.liquidity_tier === "SEMI_LIQUID") semiLiquid += a.total_value;
      else illiquid += a.total_value;
    });

    return { totalValue, totalMain, totalReturn, liquid, semiLiquid, illiquid };
  }, [assets]);

  const filteredAssets = useMemo(() => {
    if (tierFilter === "ALL") return assets;
    return assets.filter((a) => a.liquidity_tier === tierFilter);
  }, [assets, tierFilter]);

  const hasGoldAssets = useMemo(
    () => assets.some((a) => isUnitBasedAsset(a) && a.unit_name?.toLowerCase() === "gram"),
    [assets]
  );

  // Fetch live gold price from /api/gold-price
  const fetchLiveGoldPrice = async (): Promise<GoldPriceResponse | null> => {
    setIsSyncingGold(true);
    try {
      const res = await fetch("/api/gold-price");
      const data = await res.json();
      if (!res.ok || !data?.pricePerGramIdr) {
        setValidationAlert({
          title: "Gagal Mengambil Harga Emas",
          message: data?.error || "Endpoint harga emas tidak merespons. Silakan isi harga per gram secara manual.",
        });
        return null;
      }
      setGoldQuote(data);
      return data;
    } catch (err: unknown) {
      setValidationAlert({
        title: "Koneksi Gagal",
        message:
          err instanceof Error
            ? err.message
            : "Tidak dapat menghubungi server harga emas.",
      });
      return null;
    } finally {
      setIsSyncingGold(false);
    }
  };

  const handleSyncAllGoldAssets = async () => {
    const quote = await fetchLiveGoldPrice();
    if (!quote) return;

    const gramAssets = assets.filter(
      (a) => isUnitBasedAsset(a) && a.unit_name?.toLowerCase() === "gram"
    );

    if (gramAssets.length === 0) {
      setToast(`Harga emas live: ${formatRupiah(quote.pricePerGramIdr)}/gr (${quote.source})`);
      setTimeout(() => setToast(null), 4000);
      return;
    }

    for (const ast of gramAssets) {
      await updateAsset(ast.id, {
        price_per_unit: quote.pricePerGramIdr,
      });
    }

    setToast(
      `Harga emas disinkronkan: ${formatRupiah(quote.pricePerGramIdr)}/gr (${quote.source})`
    );
    setTimeout(() => setToast(null), 4000);
  };

  const openEditModal = (ast: Asset) => {
    setEditingAsset({ ...ast });
    setEditGramQtyInput(ast.unit_quantity !== undefined ? String(ast.unit_quantity) : "0");
  };

  const handleCreateAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim()) return;

    const parsedGramQty = parseFloat(newAssetGramQty.replace(",", ".")) || 0;

    setIsSubmittingCreate(true);
    const res = await createAsset({
      name: newAssetName.trim(),
      platform: newAssetPlatform.trim() || undefined,
      liquidity_tier: newAssetTier,
      main_value: newAssetMainValue,
      generating_rate: newAssetYield,
      income_generated: newAssetIsGramMode ? 0 : newAssetIncomeGen,
      unit_name: newAssetIsGramMode ? "gram" : undefined,
      unit_quantity: newAssetIsGramMode ? parsedGramQty : undefined,
      price_per_unit: newAssetIsGramMode ? newAssetPricePerGram : undefined,
      goal_bucket: newAssetBucket.trim() || undefined,
      is_external: newAssetIsExternal,
    });
    setIsSubmittingCreate(false);

    if (!res.success) {
      setValidationAlert({
        title: "Gagal Menyimpan Aset",
        message: res.message || "Terjadi kesalahan saat menyimpan aset ke database.",
      });
      return;
    }

    setNewAssetName("");
    setNewAssetPlatform("");
    setNewAssetTier("LIQUID");
    setNewAssetIsGramMode(false);
    setNewAssetMainValue(0);
    setNewAssetIncomeGen(0);
    setNewAssetYield(0);
    setNewAssetGramQty("0");
    setNewAssetPricePerGram(0);
    setNewAssetBucket("");
    setNewAssetIsExternal(false);
    setIsCreateAssetOpen(false);
    setToast("Aset berhasil disimpan!");
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpdateAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;

    const isGram = isUnitBasedAsset(editingAsset);
    const parsedQty = parseFloat(editGramQtyInput.replace(",", ".")) || 0;

    setIsSubmittingEditAsset(true);
    const res = await updateAsset(editingAsset.id, {
      name: editingAsset.name.trim(),
      platform: editingAsset.platform?.trim() || undefined,
      liquidity_tier: editingAsset.liquidity_tier,
      main_value: editingAsset.main_value,
      generating_rate: editingAsset.generating_rate,
      income_generated: editingAsset.income_generated,
      unit_name: isGram ? "gram" : undefined,
      unit_quantity: isGram ? parsedQty : undefined,
      price_per_unit: isGram ? editingAsset.price_per_unit || 0 : undefined,
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

  // Live preview in Create Modal
  const createPreview = useMemo(() => {
    const qty = parseFloat(newAssetGramQty.replace(",", ".")) || 0;
    return computeAssetValues({
      main_value: newAssetMainValue,
      income_generated: newAssetIncomeGen,
      generating_rate: newAssetYield,
      unit_name: newAssetIsGramMode ? "gram" : undefined,
      unit_quantity: qty,
      price_per_unit: newAssetPricePerGram,
    });
  }, [
    newAssetMainValue,
    newAssetIncomeGen,
    newAssetYield,
    newAssetIsGramMode,
    newAssetGramQty,
    newAssetPricePerGram,
  ]);

  // Live preview in Edit Modal
  const editPreview = useMemo(() => {
    if (!editingAsset) return null;
    const qty = parseFloat(editGramQtyInput.replace(",", ".")) || 0;
    return computeAssetValues({
      main_value: editingAsset.main_value,
      income_generated: editingAsset.income_generated,
      generating_rate: editingAsset.generating_rate,
      unit_name: editingAsset.unit_name,
      unit_quantity: qty,
      price_per_unit: editingAsset.price_per_unit,
    });
  }, [editingAsset, editGramQtyInput]);

  return (
    <div className="space-y-5">
      {/* 1. PORTFOLIO SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#666E61]">
            <span className="font-semibold">Total Portofolio Aset</span>
            <Sparkles className="w-4 h-4 text-[#2196F3]" />
          </div>
          <span className="text-xl font-bold text-[#242921] mt-2">
            {formatRupiah(summary.totalValue)}
          </span>
          <div className="text-[10px] text-[#666E61] mt-1 flex items-center justify-between">
            <span>Modal: {formatRupiah(summary.totalMain)}</span>
            <span
              className={`font-bold ${
                summary.totalReturn > 0
                  ? "text-emerald-600"
                  : summary.totalReturn < 0
                  ? "text-rose-600"
                  : "text-[#666E61]"
              }`}
            >
              {summary.totalReturn >= 0 ? "+" : ""}
              {formatRupiah(summary.totalReturn)}
            </span>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#666E61]">
            <span className="font-semibold">Liquid (Siap Pakai)</span>
            <Wallet className="w-4 h-4 text-[#2196F3]" />
          </div>
          <span className="text-lg font-bold text-[#2196F3] mt-2">
            {formatRupiah(summary.liquid)}
          </span>
          <span className="text-[10px] text-[#666E61] mt-1">
            Tabungan & kas non-operasional (e.g. Jago)
          </span>
        </div>

        <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#666E61]">
            <span className="font-semibold">Semi-Liquid (Investasi)</span>
            <TrendingUp className="w-4 h-4 text-[#1565C0]" />
          </div>
          <span className="text-lg font-bold text-[#242921] mt-2">
            {formatRupiah(summary.semiLiquid)}
          </span>
          <span className="text-[10px] text-[#666E61] mt-1">
            Emas digital Pluang, Obligasi Bibit
          </span>
        </div>

        <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#666E61]">
            <span className="font-semibold">Illiquid (Jangka Panjang)</span>
            <Shield className="w-4 h-4 text-[#666E61]" />
          </div>
          <span className="text-lg font-bold text-[#242921] mt-2">
            {formatRupiah(summary.illiquid)}
          </span>
          <span className="text-[10px] text-[#666E61] mt-1">
            BPJS TK (SDI & DNA), aset pensiun
          </span>
        </div>
      </div>

      {/* 2. ASSETS TABLE CARD */}
      <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#EEEEEE]">
          <div>
            <h3 className="text-sm font-bold text-[#242921]">Master Portofolio & Likuiditas Aset</h3>
            <p className="text-xs text-[#666E61]">
              Kelola simpanan di Jago, Emas Pluang (berbasis gramasi), Obligasi Bibit, hingga BPJS TK.
            </p>
            {goldQuote && (
              <p className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  Acuan Emas Live: {formatRupiah(goldQuote.pricePerGramIdr)}/gr ({goldQuote.source})
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {hasGoldAssets && (
              <button
                type="button"
                onClick={handleSyncAllGoldAssets}
                disabled={isSyncingGold}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
                title="Ambil harga spot emas dunia (IDR/gram) dan perbarui valuasi aset emas"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGold ? "animate-spin" : ""}`} />
                <span>{isSyncingGold ? "Syncing..." : "Sync Harga Emas"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCreateAssetOpen(true)}
              className="px-3.5 py-1.5 bg-[#2196F3] hover:bg-[#1E88E5] text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Aset Baru
            </button>
          </div>
        </div>

        {/* Tier Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["ALL", "LIQUID", "SEMI_LIQUID", "ILLIQUID"] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
                tierFilter === tier
                  ? "bg-[#2196F3] text-white shadow-2xs"
                  : "bg-[#E3F2FD]/40 text-[#666E61] hover:bg-[#E3F2FD]"
              }`}
            >
              {tier === "ALL"
                ? `Semua (${assets.length})`
                : tier === "LIQUID"
                ? "Liquid"
                : tier === "SEMI_LIQUID"
                ? "Semi-Liquid"
                : "Illiquid"}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EEEEEE] text-[#666E61]">
                <th className="py-2.5 px-3">Nama Aset & Platform</th>
                <th className="py-2.5 px-3">Tier</th>
                <th className="py-2.5 px-3">Unit / Modal Pokok</th>
                <th className="py-2.5 px-3">Return / Yield</th>
                <th className="py-2.5 px-3">Total Value</th>
                <th className="py-2.5 px-3">Goal Bucket</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEEEE] text-[#242921]">
              {filteredAssets.map((ast) => {
                const isGram = isUnitBasedAsset(ast);
                return (
                  <tr key={ast.id} className="hover:bg-[#E3F2FD]/20 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#242921]">{ast.name}</span>
                        {ast.platform && (
                          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#F8FAFC] border border-[#EEEEEE] text-[#666E61] font-semibold">
                            {ast.platform}
                          </span>
                        )}
                        {ast.is_external && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                            Eksternal
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${
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
                    <td className="py-3 px-3">
                      {isGram ? (
                        <div>
                          <div className="font-bold text-amber-700 flex items-center gap-1">
                            <span>
                              {ast.unit_quantity ?? 0} {ast.unit_name}
                            </span>
                            <span className="text-[10px] font-normal text-[#666E61]">
                              × {formatRupiah(ast.price_per_unit || 0)}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#666E61]">
                            Modal beli: {formatRupiah(ast.main_value)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-medium">{formatRupiah(ast.main_value)}</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div>
                        <span
                          className={`font-semibold ${
                            ast.income_generated > 0
                              ? "text-emerald-600"
                              : ast.income_generated < 0
                              ? "text-rose-600"
                              : "text-[#666E61]"
                          }`}
                        >
                          {ast.income_generated !== 0
                            ? `${ast.income_generated > 0 ? "+" : ""}${formatRupiah(ast.income_generated)}`
                            : "-"}
                        </span>
                        {ast.generating_rate !== 0 && (
                          <span className="text-[10px] text-[#2196F3] font-semibold block">
                            {ast.generating_rate > 0 ? "+" : ""}
                            {ast.generating_rate}%
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-[#242921] whitespace-nowrap">
                      {formatRupiah(ast.total_value)}
                    </td>
                    <td className="py-3 px-3 text-[#666E61]">{ast.goal_bucket || "-"}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(ast)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#2196F3] hover:bg-[#2196F3]/10 transition cursor-pointer"
                          title="Edit Aset"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAsset(ast.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus Aset"
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

      {/* MODAL: TAMBAH MASTER ASET */}
      {isCreateAssetOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#666E61] block mb-1 font-medium">Nama Aset</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Emas Digital, Tabungan"
                    value={newAssetName}
                    onChange={(e) => setNewAssetName(e.target.value)}
                    className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                  />
                </div>
                <div>
                  <label className="text-[#666E61] block mb-1 font-medium">Platform / Bank</label>
                  <input
                    type="text"
                    placeholder="e.g. Pluang, Bibit, Bank Jago"
                    value={newAssetPlatform}
                    onChange={(e) => setNewAssetPlatform(e.target.value)}
                    className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Tier Likuiditas</label>
                <select
                  value={newAssetTier}
                  onChange={(e) => setNewAssetTier(e.target.value as LiquidityTier)}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                >
                  <option value="LIQUID">LIQUID (Tabungan Bank Jago / Kas Non-Operasional)</option>
                  <option value="SEMI_LIQUID">SEMI_LIQUID (Emas Pluang / Obligasi Bibit)</option>
                  <option value="ILLIQUID">ILLIQUID (BPJS TK / Pensiun / Properti)</option>
                </select>
              </div>

              {/* Mode Selector: Nominal vs Gramasi */}
              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Metode Pencatatan Nilai</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAssetIsGramMode(false)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      !newAssetIsGramMode
                        ? "bg-[#2196F3] text-white border-[#2196F3]"
                        : "bg-[#F8FAFC] text-[#666E61] border-[#EEEEEE]"
                    }`}
                  >
                    Nominal Rupiah (Rp)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAssetIsGramMode(true)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1 ${
                      newAssetIsGramMode
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-[#F8FAFC] text-[#666E61] border-[#EEEEEE]"
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Gramasi Emas (gr)</span>
                  </button>
                </div>
              </div>

              {newAssetIsGramMode ? (
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[#666E61] block mb-1 font-medium">Gramasi (gram)</label>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="e.g. 3.5"
                        value={newAssetGramQty}
                        onChange={(e) => setNewAssetGramQty(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold text-[#242921]"
                      />
                    </div>
                    <div>
                      <label className="text-[#666E61] block mb-1 font-medium">Modal Beli (Rp)</label>
                      <CurrencyInput
                        value={newAssetMainValue}
                        onChange={setNewAssetMainValue}
                        className="w-full bg-[#FFFFFF] border border-amber-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#242921]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[#666E61] font-medium">Harga per Gram (Rp)</label>
                      <button
                        type="button"
                        onClick={async () => {
                          const q = await fetchLiveGoldPrice();
                          if (q) setNewAssetPricePerGram(q.pricePerGramIdr);
                        }}
                        disabled={isSyncingGold}
                        className="text-[10px] font-bold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncingGold ? "animate-spin" : ""}`} />
                        <span>Ambil Harga Live</span>
                      </button>
                    </div>
                    <CurrencyInput
                      value={newAssetPricePerGram}
                      onChange={setNewAssetPricePerGram}
                      className="w-full bg-[#FFFFFF] border border-amber-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#242921]"
                    />
                  </div>

                  <div className="pt-2 border-t border-amber-200 flex items-center justify-between text-[11px]">
                    <span className="text-amber-900 font-medium">Estimasi Nilai Pasar:</span>
                    <span className="font-bold text-amber-900">
                      {formatRupiah(createPreview.total_value)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#666E61] block mb-1 font-medium">Modal Pokok (Rp)</label>
                    <CurrencyInput
                      value={newAssetMainValue}
                      onChange={setNewAssetMainValue}
                      className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs font-semibold text-[#242921]"
                    />
                  </div>
                  <div>
                    <label className="text-[#666E61] block mb-1 font-medium">Imbal Hasil / Return (Rp)</label>
                    <CurrencyInput
                      value={newAssetIncomeGen}
                      onChange={setNewAssetIncomeGen}
                      className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {!newAssetIsGramMode && (
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
                )}
                <div className={newAssetIsGramMode ? "col-span-2" : ""}>
                  <label className="text-[#666E61] block mb-1 font-medium">Goal Bucket</label>
                  <input
                    type="text"
                    placeholder="e.g. Dana Darurat, Hari Tua"
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
                  Aset Eksternal (e.g. BPJS TK / di luar cashflow bulanan)
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
                  disabled={isSubmittingCreate}
                  className="px-4 py-2 bg-[#2196F3] hover:bg-[#1E88E5] text-white font-semibold text-xs rounded-xl transition shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingCreate ? "Menyimpan..." : "Simpan Aset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MASTER ASET */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 w-full max-w-md shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="text-[#666E61] block mb-1 font-medium">Platform / Bank</label>
                  <input
                    type="text"
                    placeholder="Pluang / Bibit / Jago"
                    value={editingAsset.platform || ""}
                    onChange={(e) => setEditingAsset({ ...editingAsset, platform: e.target.value })}
                    className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Tier Likuiditas</label>
                <select
                  value={editingAsset.liquidity_tier}
                  onChange={(e) =>
                    setEditingAsset({ ...editingAsset, liquidity_tier: e.target.value as LiquidityTier })
                  }
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                >
                  <option value="LIQUID">LIQUID (Tabungan / Kas)</option>
                  <option value="SEMI_LIQUID">SEMI_LIQUID (Emas / Reksadana / Obligasi)</option>
                  <option value="ILLIQUID">ILLIQUID (BPJS TK / Pensiun / Properti)</option>
                </select>
              </div>

              {/* Toggle unit-based mode in Edit */}
              <div>
                <label className="text-[#666E61] block mb-1 font-medium">Metode Pencatatan Nilai</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingAsset({
                        ...editingAsset,
                        unit_name: undefined,
                        unit_quantity: undefined,
                        price_per_unit: undefined,
                      })
                    }
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      !isUnitBasedAsset(editingAsset)
                        ? "bg-[#2196F3] text-white border-[#2196F3]"
                        : "bg-[#F8FAFC] text-[#666E61] border-[#EEEEEE]"
                    }`}
                  >
                    Nominal Rupiah (Rp)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingAsset({
                        ...editingAsset,
                        unit_name: "gram",
                        unit_quantity: editingAsset.unit_quantity ?? 0,
                        price_per_unit: editingAsset.price_per_unit ?? goldQuote?.pricePerGramIdr ?? 0,
                      })
                    }
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center justify-center gap-1 ${
                      isUnitBasedAsset(editingAsset)
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-[#F8FAFC] text-[#666E61] border-[#EEEEEE]"
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>Gramasi Emas (gr)</span>
                  </button>
                </div>
              </div>

              {isUnitBasedAsset(editingAsset) ? (
                <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[#666E61] block mb-1 font-medium">Gramasi (gram)</label>
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        value={editGramQtyInput}
                        onChange={(e) => setEditGramQtyInput(e.target.value)}
                        className="w-full bg-[#FFFFFF] border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold text-[#242921]"
                      />
                    </div>
                    <div>
                      <label className="text-[#666E61] block mb-1 font-medium">Modal Beli (Rp)</label>
                      <CurrencyInput
                        value={editingAsset.main_value}
                        onChange={(val) => setEditingAsset({ ...editingAsset, main_value: val })}
                        className="w-full bg-[#FFFFFF] border border-amber-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#242921]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[#666E61] font-medium">Harga per Gram (Rp)</label>
                      <button
                        type="button"
                        onClick={async () => {
                          const q = await fetchLiveGoldPrice();
                          if (q) {
                            setEditingAsset((prev) =>
                              prev ? { ...prev, price_per_unit: q.pricePerGramIdr } : prev
                            );
                          }
                        }}
                        disabled={isSyncingGold}
                        className="text-[10px] font-bold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncingGold ? "animate-spin" : ""}`} />
                        <span>Ambil Harga Live</span>
                      </button>
                    </div>
                    <CurrencyInput
                      value={editingAsset.price_per_unit || 0}
                      onChange={(val) => setEditingAsset({ ...editingAsset, price_per_unit: val })}
                      className="w-full bg-[#FFFFFF] border border-amber-200 rounded-xl px-3 py-2 text-xs font-semibold text-[#242921]"
                    />
                  </div>

                  {editPreview && (
                    <div className="pt-2 border-t border-amber-200 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-900 font-medium">Nilai Pasar Terkini:</span>
                        <span className="font-bold text-amber-900">
                          {formatRupiah(editPreview.total_value)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#666E61]">Selisih vs Modal:</span>
                        <span
                          className={`font-bold ${
                            editPreview.income_generated >= 0 ? "text-emerald-700" : "text-rose-600"
                          }`}
                        >
                          {editPreview.income_generated >= 0 ? "+" : ""}
                          {formatRupiah(editPreview.income_generated)} ({editPreview.generating_rate}%)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-[#666E61] block mb-1 font-medium">Modal Pokok (Main Value)</label>
                    <CurrencyInput
                      value={editingAsset.main_value}
                      onChange={(val) => setEditingAsset({ ...editingAsset, main_value: val })}
                      className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs font-semibold text-[#242921]"
                    />
                  </div>

                  <div>
                    <label className="text-[#666E61] block mb-1 font-medium">
                      Income Generated (Akumulasi Return)
                    </label>
                    <CurrencyInput
                      value={editingAsset.income_generated}
                      onChange={(val) => setEditingAsset({ ...editingAsset, income_generated: val })}
                      className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                    />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                {!isUnitBasedAsset(editingAsset) && (
                  <div>
                    <label className="text-[#666E61] block mb-1 font-medium">Yield / Return (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingAsset.generating_rate}
                      onChange={(e) =>
                        setEditingAsset({
                          ...editingAsset,
                          generating_rate: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                    />
                  </div>
                )}
                <div className={isUnitBasedAsset(editingAsset) ? "col-span-2" : ""}>
                  <label className="text-[#666E61] block mb-1 font-medium">Goal Bucket</label>
                  <input
                    type="text"
                    value={editingAsset.goal_bucket || ""}
                    onChange={(e) => setEditingAsset({ ...editingAsset, goal_bucket: e.target.value })}
                    className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
                  />
                </div>
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
                  Aset Eksternal (BPJS TK / di luar cashflow bulanan)
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
    </div>
  );
};
