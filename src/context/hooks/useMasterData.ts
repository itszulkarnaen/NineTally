"use client";

import { useState } from "react";
import { Asset, CashflowCategory, CashflowUnit, WishlistItem, CashflowTransaction } from "@/types";
import { initialAssets, initialCashflowUnits, initialCategories, initialWishlists } from "@/lib/mockData";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { MonthPeriodData } from "../types";

interface UseMasterDataOptions {
  broadcastSync: (payload: any) => void;
  getPeriodsMap: () => Record<string, MonthPeriodData>;
  getTransactions: () => CashflowTransaction[];
}

export function useMasterData({ broadcastSync, getPeriodsMap, getTransactions }: UseMasterDataOptions) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [cashflowUnits, setCashflowUnits] = useState<CashflowUnit[]>(initialCashflowUnits);
  const [categories, setCategories] = useState<CashflowCategory[]>(initialCategories);
  const [wishlists, setWishlists] = useState<WishlistItem[]>(initialWishlists);

  // Master Data: Create Cashflow Unit
  const createCashflowUnit = async (
    unit: Omit<CashflowUnit, "id" | "is_active">
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanCode = unit.code ? unit.code.trim().toUpperCase() : `CF-${Date.now().toString().slice(-6)}`;
    const cleanName = unit.name ? unit.name.trim() : "";

    if (!cleanName) {
      return { success: false, message: "Nama Cashflow Item tidak boleh kosong." };
    }

    if (cashflowUnits.some((u) => u.code.toUpperCase() === cleanCode)) {
      return {
        success: false,
        message: `Kode '${cleanCode}' sudah digunakan oleh Cashflow Item lain. Gunakan kode unik.`,
      };
    }

    const sanitizedCategory = unit.unit_type === "EXPENSE" && unit.category ? unit.category : null;
    const sanitizedAssetId = unit.unit_type === "ASSET" && unit.linked_asset_id ? unit.linked_asset_id : null;

    const newUnit: CashflowUnit = {
      ...unit,
      id: `cf-${Date.now()}`,
      code: cleanCode,
      name: cleanName,
      category: sanitizedCategory || undefined,
      linked_asset_id: sanitizedAssetId || undefined,
      is_active: true,
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("cashflow_units").insert({
          id: newUnit.id,
          code: newUnit.code,
          name: newUnit.name,
          unit_type: newUnit.unit_type,
          category: sanitizedCategory,
          default_urgency: newUnit.default_urgency,
          linked_asset_id: sanitizedAssetId,
          is_active: newUnit.is_active,
        });

        if (error) {
          console.error("Supabase insert unit error:", error);
          let userMsg = `Gagal menyimpan ke database Supabase: ${error.message}`;
          if (error.code === "23505") {
            userMsg = `Kode item '${newUnit.code}' sudah terdaftar di database. Silakan gunakan kode lain.`;
          } else if (error.code === "23503") {
            userMsg = `Kategori '${sanitizedCategory}' tidak valid di database.`;
          }
          return { success: false, message: userMsg };
        }
      } catch (err: any) {
        console.error("Supabase insert unit exception:", err);
        return {
          success: false,
          message: `Koneksi database terputus atau offline: ${err.message || "Gagal menghubungi server"}`,
        };
      }
    }

    setCashflowUnits((prev) => [...prev, newUnit]);
    broadcastSync({ type: "MASTER_DATA_CHANGED" });
    return { success: true };
  };

  // Master Data: Update Cashflow Unit
  const updateCashflowUnit = async (
    id: string,
    unitUpdate: Partial<CashflowUnit>
  ): Promise<{ success: boolean; message?: string }> => {
    const existing = cashflowUnits.find((u) => u.id === id);
    if (!existing) {
      return { success: false, message: "Cashflow Item tidak ditemukan." };
    }

    const cleanCode = unitUpdate.code ? unitUpdate.code.trim().toUpperCase() : existing.code;
    const cleanName = unitUpdate.name !== undefined ? unitUpdate.name.trim() : existing.name;

    if (!cleanName) {
      return { success: false, message: "Nama Cashflow Item tidak boleh kosong." };
    }

    if (cashflowUnits.some((u) => u.id !== id && u.code.toUpperCase() === cleanCode)) {
      return {
        success: false,
        message: `Kode '${cleanCode}' sudah digunakan oleh Cashflow Item lain.`,
      };
    }

    const targetType = unitUpdate.unit_type !== undefined ? unitUpdate.unit_type : existing.unit_type;
    const rawCategory = unitUpdate.category !== undefined ? unitUpdate.category : existing.category;
    const sanitizedCategory = targetType === "EXPENSE" && rawCategory ? rawCategory : null;

    const rawAsset = unitUpdate.linked_asset_id !== undefined ? unitUpdate.linked_asset_id : existing.linked_asset_id;
    const sanitizedAssetId = targetType === "ASSET" && rawAsset ? rawAsset : null;

    if (isSupabaseConfigured) {
      const dbPayload: any = {
        name: cleanName,
        code: cleanCode,
        unit_type: targetType,
        category: sanitizedCategory,
        linked_asset_id: sanitizedAssetId,
      };
      if (unitUpdate.default_urgency !== undefined) dbPayload.default_urgency = unitUpdate.default_urgency;
      if (unitUpdate.is_active !== undefined) dbPayload.is_active = unitUpdate.is_active;

      try {
        const { error } = await supabase
          .from("cashflow_units")
          .update(dbPayload)
          .eq("id", id);

        if (error) {
          console.error("Supabase update unit error:", error);
          let userMsg = `Gagal memperbarui item di database: ${error.message}`;
          if (error.code === "23505") {
            userMsg = `Kode item '${cleanCode}' sudah terdaftar di database.`;
          } else if (error.code === "23503") {
            userMsg = `Kategori '${sanitizedCategory}' tidak valid di database.`;
          }
          return { success: false, message: userMsg };
        }
      } catch (err: any) {
        console.error("Supabase update unit exception:", err);
        return {
          success: false,
          message: `Koneksi database terputus atau offline: ${err.message || "Gagal menghubungi server"}`,
        };
      }
    }

    setCashflowUnits((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        return {
          ...u,
          ...unitUpdate,
          code: cleanCode,
          name: cleanName,
          unit_type: targetType,
          category: sanitizedCategory || undefined,
          linked_asset_id: sanitizedAssetId || undefined,
        };
      })
    );

    broadcastSync({ type: "MASTER_DATA_CHANGED" });
    return { success: true };
  };

  // Master Data: Delete Cashflow Unit
  const deleteCashflowUnit = async (id: string): Promise<{ success: boolean; message?: string }> => {
    const target = cashflowUnits.find((u) => u.id === id);
    if (!target) return { success: false, message: "Cashflow Item tidak ditemukan." };

    const periodsMap = getPeriodsMap();
    const transactions = getTransactions();

    const usedInMonths: string[] = [];
    Object.values(periodsMap).forEach((p) => {
      if (p.items && p.items.some((i) => i.cashflow_unit_id === id)) {
        usedInMonths.push(p.period_month);
      }
    });

    const usedTransactionsCount = transactions.filter((t) => t.cashflow_unit_id === id).length;

    if (usedInMonths.length > 0 || usedTransactionsCount > 0) {
      const reasons: string[] = [];
      if (usedInMonths.length > 0) {
        reasons.push(`dianggarkan pada periode: ${usedInMonths.join(", ")}`);
      }
      if (usedTransactionsCount > 0) {
        reasons.push(`tercatat dalam ${usedTransactionsCount} transaksi riil`);
      }

      return {
        success: false,
        message: `Gak bisa dihapus bro! Cashflow item '${target.name}' sudah ${reasons.join(" dan ")}. Untuk menjaga integritas data historis, lu bisa nonaktifkan (archive) item ini agar tidak muncul di rencana bulan mendatang.`,
      };
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("cashflow_units").delete().eq("id", id);
        if (error) {
          console.error("Supabase delete unit error:", error);
          return { success: false, message: `Gagal menghapus item dari database: ${error.message}` };
        }
      } catch (err: any) {
        return { success: false, message: `Koneksi database bermasalah: ${err.message || "Gagal menghubungi server"}` };
      }
    }

    setCashflowUnits((prev) => prev.filter((u) => u.id !== id));
    broadcastSync({ type: "MASTER_DATA_CHANGED" });
    return { success: true };
  };

  // Master Data: Categories CRUD
  const createCategory = async (
    cat: Omit<CashflowCategory, "id">
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanCode = cat.code.trim().toUpperCase();
    const cleanName = cat.name.trim();

    if (!cleanName || !cleanCode) {
      return { success: false, message: "Nama dan kode kategori tidak boleh kosong." };
    }

    if (categories.some((c) => c.code.toUpperCase() === cleanCode)) {
      return { success: false, message: `Kode kategori '${cleanCode}' sudah digunakan.` };
    }

    const newCat: CashflowCategory = {
      ...cat,
      id: `cat-${Date.now()}`,
      code: cleanCode,
      name: cleanName,
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("cashflow_categories").insert(newCat);
        if (error) {
          console.error("Supabase insert category error:", error);
          return { success: false, message: `Gagal menyimpan kategori ke database: ${error.message}` };
        }
      } catch (err: any) {
        return { success: false, message: `Koneksi database bermasalah: ${err.message || "Gagal menghubungi server"}` };
      }
    }

    setCategories((prev) => [...prev, newCat]);
    broadcastSync({ type: "MASTER_DATA_CHANGED" });
    return { success: true };
  };

  const updateCategory = async (
    id: string,
    catUpdate: Partial<CashflowCategory>
  ): Promise<{ success: boolean; message?: string }> => {
    const existing = categories.find((c) => c.id === id);
    if (!existing) return { success: false, message: "Kategori tidak ditemukan." };

    if (catUpdate.code) {
      const cleanCode = catUpdate.code.trim().toUpperCase();
      if (categories.some((c) => c.id !== id && c.code.toUpperCase() === cleanCode)) {
        return { success: false, message: `Kode kategori '${cleanCode}' sudah digunakan.` };
      }
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("cashflow_categories").update(catUpdate).eq("id", id);
        if (error) {
          console.error("Supabase update category error:", error);
          return { success: false, message: `Gagal memperbarui kategori di database: ${error.message}` };
        }
      } catch (err: any) {
        return { success: false, message: `Koneksi database bermasalah: ${err.message || "Gagal menghubungi server"}` };
      }
    }

    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...catUpdate } : c)));
    broadcastSync({ type: "MASTER_DATA_CHANGED" });
    return { success: true };
  };

  const deleteCategory = async (id: string): Promise<{ success: boolean; message?: string }> => {
    const target = categories.find((c) => c.id === id);
    if (!target) return { success: false, message: "Kategori tidak ditemukan." };

    const linkedUnits = cashflowUnits.filter((u) => u.category === target.code);
    if (linkedUnits.length > 0) {
      const sampleNames = linkedUnits.slice(0, 3).map((u) => u.name).join(", ");
      const extra = linkedUnits.length > 3 ? ` dan ${linkedUnits.length - 3} lainnya` : "";
      return {
        success: false,
        message: `Gak bisa dihapus bro! Kategori '${target.name}' masih dipakai oleh ${linkedUnits.length} Cashflow Item (${sampleNames}${extra}). Pindahkan kategori item tersebut dulu sebelum dihapus.`,
      };
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("cashflow_categories").delete().eq("id", id);
        if (error) {
          console.error("Supabase delete category error:", error);
          return { success: false, message: `Gagal menghapus kategori dari database: ${error.message}` };
        }
      } catch (err: any) {
        return { success: false, message: `Koneksi database bermasalah: ${err.message || "Gagal menghubungi server"}` };
      }
    }

    setCategories((prev) => prev.filter((c) => c.id !== id));
    broadcastSync({ type: "MASTER_DATA_CHANGED" });
    return { success: true };
  };

  // Master Data: Assets CRUD
  const createAsset = async (
    asset: Omit<Asset, "id" | "total_value">
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanName = asset.name.trim();
    if (!cleanName) return { success: false, message: "Nama aset tidak boleh kosong." };

    const newAsset: Asset = {
      ...asset,
      id: `ast-${Date.now()}`,
      name: cleanName,
      total_value: asset.main_value + asset.income_generated,
    };

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("assets").insert({
          id: newAsset.id,
          name: newAsset.name,
          liquidity_tier: newAsset.liquidity_tier,
          main_value: newAsset.main_value,
          generating_rate: newAsset.generating_rate,
          start_date: newAsset.start_date || null,
          income_generated: newAsset.income_generated,
          total_value: newAsset.total_value,
          goal_bucket: newAsset.goal_bucket || null,
          is_external: newAsset.is_external || false,
        });

        if (error) {
          console.error("Supabase insert asset error:", error);
          return { success: false, message: `Gagal menyimpan aset ke database: ${error.message}` };
        }
      } catch (err: any) {
        return { success: false, message: `Koneksi database bermasalah: ${err.message || "Gagal menghubungi server"}` };
      }
    }

    setAssets((prev) => [...prev, newAsset]);
    broadcastSync({ type: "MASTER_DATA_CHANGED" });
    return { success: true };
  };

  const updateAsset = async (
    id: string,
    assetUpdate: Partial<Asset>
  ): Promise<{ success: boolean; message?: string }> => {
    const existing = assets.find((a) => a.id === id);
    if (!existing) return { success: false, message: "Aset tidak ditemukan." };

    const main = assetUpdate.main_value ?? existing.main_value;
    const inc = assetUpdate.income_generated ?? existing.income_generated;
    const calculatedTotal = main + inc;

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from("assets")
          .update({
            ...assetUpdate,
            total_value: calculatedTotal,
          })
          .eq("id", id);

        if (error) {
          console.error("Supabase update asset error:", error);
          return { success: false, message: `Gagal memperbarui aset di database: ${error.message}` };
        }
      } catch (err: any) {
        return { success: false, message: `Koneksi database bermasalah: ${err.message || "Gagal menghubungi server"}` };
      }
    }

    setAssets((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          return {
            ...a,
            ...assetUpdate,
            total_value: calculatedTotal,
          };
        }
        return a;
      })
    );

    broadcastSync({ type: "MASTER_DATA_CHANGED" });
    return { success: true };
  };

  const deleteAsset = async (id: string): Promise<{ success: boolean; message?: string }> => {
    const target = assets.find((a) => a.id === id);
    if (!target) return { success: false, message: "Aset tidak ditemukan." };

    const linkedUnits = cashflowUnits.filter((u) => u.linked_asset_id === id);
    if (linkedUnits.length > 0) {
      const names = linkedUnits.map((u) => u.name).join(", ");
      return {
        success: false,
        message: `Gak bisa dihapus bro! Aset '${target.name}' terhubung dengan Cashflow Item (${names}). Putus tautan aset pada cashflow item tersebut terlebih dahulu.`,
      };
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("assets").delete().eq("id", id);
        if (error) {
          console.error("Supabase delete asset error:", error);
          return { success: false, message: `Gagal menghapus aset dari database: ${error.message}` };
        }
      } catch (err: any) {
        return { success: false, message: `Koneksi database bermasalah: ${err.message || "Gagal menghubungi server"}` };
      }
    }

    setAssets((prev) => prev.filter((a) => a.id !== id));
    broadcastSync({ type: "MASTER_DATA_CHANGED" });
    return { success: true };
  };

  // Wishlist Toggle
  const toggleWishlistBought = (wishlistId: string) => {
    const target = wishlists.find((w) => w.id === wishlistId);
    const nextBought = target ? !target.is_bought : false;
    const nextBoughtAt = nextBought ? new Date().toISOString() : null;

    setWishlists((prev) =>
      prev.map((w) =>
        w.id === wishlistId
          ? { ...w, is_bought: nextBought, bought_at: nextBoughtAt || undefined }
          : w
      )
    );

    if (isSupabaseConfigured) {
      supabase
        .from("wishlists")
        .update({
          is_bought: nextBought,
          bought_at: nextBoughtAt,
        })
        .eq("id", wishlistId)
        .then(({ error }) => {
          if (error) console.error("Supabase update wishlist error:", error.message);
        });
    }
  };

  return {
    assets,
    setAssets,
    cashflowUnits,
    setCashflowUnits,
    categories,
    setCategories,
    wishlists,
    setWishlists,
    createCashflowUnit,
    updateCashflowUnit,
    deleteCashflowUnit,
    createCategory,
    updateCategory,
    deleteCategory,
    createAsset,
    updateAsset,
    deleteAsset,
    toggleWishlistBought,
  };
}
