"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Asset, BudgetPeriodItem, CashflowCategory, CashflowTransaction, CashflowUnit, WishlistItem, PeriodStatus, UrgencyLevel } from "@/types";
import { initialAssets, initialCashflowUnits, initialWishlists, initialTransactions, initialCategories } from "@/lib/mockData";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export interface MonthPeriodData {
  period_month: string; // Format: "YYYY-MM"
  status: PeriodStatus; // "PLANNING" | "ACTIVE" | "LOCKED"
  salary_budget: number;
  additional_budget: number; // Anggaran Tambahan / Sisa Dana Bulan Lalu
  real_bca_balance: number;
  real_jago_balance: number;
  items: BudgetPeriodItem[];
}

export interface MonthOption {
  value: string;
  label: string;
}

export const availableMonths: MonthOption[] = [
  { value: "2026-09", label: "September 2026" },
  { value: "2026-10", label: "Oktober 2026" },
  { value: "2026-11", label: "November 2026" },
  { value: "2026-12", label: "Desember 2026" },
  { value: "2027-01", label: "Januari 2027" },
];

// Seed 16 items for current month (2026-11)
const initialNovemberItems: BudgetPeriodItem[] = [
  { id: "bi-1", period_id: "2026-11", cashflow_unit_id: "cf-1", budget_amount: 180000, realization_amount: 180000, projection_amount: 180000, actual_amount: 180000, urgency: "HIGHEST", is_realized: false, sort_order: 1 },
  { id: "bi-2", period_id: "2026-11", cashflow_unit_id: "cf-2", budget_amount: 200000, realization_amount: 200000, projection_amount: 200000, actual_amount: 200000, urgency: "HIGHEST", is_realized: false, sort_order: 2 },
  { id: "bi-3", period_id: "2026-11", cashflow_unit_id: "cf-3", budget_amount: 200000, realization_amount: 200000, projection_amount: 200000, actual_amount: 200000, urgency: "HIGH", is_realized: false, sort_order: 3 },
  { id: "bi-4", period_id: "2026-11", cashflow_unit_id: "cf-4", budget_amount: 3000000, realization_amount: 3000000, projection_amount: 3000000, actual_amount: 3000000, urgency: "HIGH", is_realized: true, sort_order: 4 },
  { id: "bi-5", period_id: "2026-11", cashflow_unit_id: "cf-5", budget_amount: 1770000, realization_amount: 1770000, projection_amount: 1770000, actual_amount: 1770000, urgency: "HIGH", is_realized: true, sort_order: 5 },
  { id: "bi-6", period_id: "2026-11", cashflow_unit_id: "cf-6", budget_amount: 500000, realization_amount: 500000, projection_amount: 500000, actual_amount: 500000, urgency: "NORMAL", is_realized: true, sort_order: 6 },
  { id: "bi-7", period_id: "2026-11", cashflow_unit_id: "cf-7", budget_amount: 50000, realization_amount: 50000, projection_amount: 50000, actual_amount: 50000, urgency: "NORMAL", is_realized: true, sort_order: 7 },
  { id: "bi-8", period_id: "2026-11", cashflow_unit_id: "cf-8", budget_amount: 100000, realization_amount: 100000, projection_amount: 100000, actual_amount: 100000, urgency: "HIGH", is_realized: false, sort_order: 8 },
  { id: "bi-9", period_id: "2026-11", cashflow_unit_id: "cf-9", budget_amount: 100000, realization_amount: 100000, projection_amount: 100000, actual_amount: 100000, urgency: "HIGH", is_realized: false, sort_order: 9 },
  { id: "bi-10", period_id: "2026-11", cashflow_unit_id: "cf-10", budget_amount: 79000, realization_amount: 79000, projection_amount: 79000, actual_amount: 79000, urgency: "HIGH", is_realized: true, sort_order: 10 },
  { id: "bi-11", period_id: "2026-11", cashflow_unit_id: "cf-11", budget_amount: 175000, realization_amount: 175000, projection_amount: 175000, actual_amount: 175000, urgency: "HIGH", is_realized: true, sort_order: 11 },
  { id: "bi-12", period_id: "2026-11", cashflow_unit_id: "cf-12", budget_amount: 2000000, realization_amount: 2000000, projection_amount: 2000000, actual_amount: 2000000, urgency: "HIGH", is_realized: false, sort_order: 12 },
  { id: "bi-13", period_id: "2026-11", cashflow_unit_id: "cf-13", budget_amount: 450000, realization_amount: 450000, projection_amount: 450000, actual_amount: 450000, urgency: "HIGH", is_realized: true, sort_order: 13 },
  { id: "bi-14", period_id: "2026-11", cashflow_unit_id: "cf-14", budget_amount: 30000, realization_amount: 30000, projection_amount: 30000, actual_amount: 30000, urgency: "HIGH", is_realized: false, sort_order: 14 },
  { id: "bi-15", period_id: "2026-11", cashflow_unit_id: "cf-15", budget_amount: 260000, realization_amount: 260000, projection_amount: 260000, actual_amount: 260000, urgency: "HIGH", is_realized: false, sort_order: 15 },
  { id: "bi-16", period_id: "2026-11", cashflow_unit_id: "cf-16", budget_amount: 885000, realization_amount: 885000, projection_amount: 885000, actual_amount: 885000, urgency: "HIGH", is_realized: false, sort_order: 16 },
];

// Initial months storage map
const initialMonthsData: Record<string, MonthPeriodData> = {
  // Past month: LOCKED with actuals
  "2026-10": {
    period_month: "2026-10",
    status: "LOCKED",
    salary_budget: 10000000,
    additional_budget: 0,
    real_bca_balance: 3800000,
    real_jago_balance: 500000,
    items: initialNovemberItems.map((item) => ({ ...item, id: `oct-${item.id}`, period_id: "2026-10", is_realized: true })),
  },
  // Current month: ACTIVE
  "2026-11": {
    period_month: "2026-11",
    status: "ACTIVE",
    salary_budget: 10000000,
    additional_budget: 0,
    real_bca_balance: 3976000,
    real_jago_balance: 500000,
    items: initialNovemberItems,
  },
  // Future months: PLANNING & EMPTY by default
  "2026-12": {
    period_month: "2026-12",
    status: "PLANNING",
    salary_budget: 10000000,
    additional_budget: 21000, // Sisa dana dari actual bulan lalu!
    real_bca_balance: 0,
    real_jago_balance: 0,
    items: [], // Kosong! Siap di-plan
  },
  "2027-01": {
    period_month: "2027-01",
    status: "PLANNING",
    salary_budget: 10000000,
    additional_budget: 0,
    real_bca_balance: 0,
    real_jago_balance: 0,
    items: [], // Kosong
  },
};

interface AppContextType {
  // Data
  assets: Asset[];
  cashflowUnits: CashflowUnit[];
  categories: CashflowCategory[];
  wishlists: WishlistItem[];
  transactions: CashflowTransaction[];
  
  // Multi-month state
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  availableMonths: MonthOption[];
  currentMonthData: MonthPeriodData;

  // Actions: Budget Module
  addItemToCurrentMonth: (unitId: string, customAmount?: number) => void;
  removeItemFromCurrentMonth: (itemId: string) => void;
  updateItemBudgetAmount: (itemId: string, newBudget: number) => void;
  updateMonthIncome: (salaryBudget: number, additionalBudget: number) => void;
  saveCurrentMonthBudget: () => boolean;
  copyPreviousMonthBudget: () => boolean; // Auto-clone previous month
  getPreviousMonthUnitNominal: (unitId: string) => number | null; // Helper to show hint

  // Governance Actions
  lockCurrentMonth: () => void;
  unlockCurrentMonth: () => void;

  // Actions: Mobile & Realization
  toggleItemRealized: (itemId: string) => void;
  updateItemRealization: (itemId: string, newRealization: number) => void;
  /** @deprecated backward compat alias */
  updateItemProjection: (itemId: string, newProjection: number) => void;
  addTransaction: (tx: Omit<CashflowTransaction, "id" | "created_at">) => void;
  deleteTransaction: (txId: string) => void;

  // Actions: Master Data
  createCashflowUnit: (unit: Omit<CashflowUnit, "id" | "is_active">) => void;
  updateCashflowUnit: (id: string, unit: Partial<CashflowUnit>) => void;
  deleteCashflowUnit: (id: string) => { success: boolean; message?: string };
  createCategory: (cat: Omit<CashflowCategory, "id">) => void;
  updateCategory: (id: string, cat: Partial<CashflowCategory>) => void;
  deleteCategory: (id: string) => { success: boolean; message?: string };
  createAsset: (asset: Omit<Asset, "id" | "total_value">) => void;
  updateAsset: (id: string, asset: Partial<Asset>) => void;
  deleteAsset: (id: string) => { success: boolean; message?: string };
  toggleWishlistBought: (wishlistId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [cashflowUnits, setCashflowUnits] = useState<CashflowUnit[]>(initialCashflowUnits);
  const [categories, setCategories] = useState<CashflowCategory[]>(initialCategories);
  const [wishlists, setWishlists] = useState<WishlistItem[]>(initialWishlists);
  const [transactions, setTransactions] = useState<CashflowTransaction[]>(initialTransactions);
  
  // Multi-month periods dictionary
  const [periodsMap, setPeriodsMap] = useState<Record<string, MonthPeriodData>>(initialMonthsData);
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-11");
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Initial Load: Instant LocalStorage first, then Cloud Sync with Supabase
  useEffect(() => {
    let isMounted = true;

    async function initializeData() {
      // Step A: Load from localStorage immediately
      try {
        const savedAssets = localStorage.getItem("scf_assets");
        const savedUnits = localStorage.getItem("scf_units");
        const savedCategories = localStorage.getItem("scf_categories");
        const savedWishlists = localStorage.getItem("scf_wishlists");
        const savedTransactions = localStorage.getItem("scf_transactions");
        const savedPeriods = localStorage.getItem("scf_periods_map");
        const savedMonth = localStorage.getItem("scf_selected_month");

        if (savedAssets) setAssets(JSON.parse(savedAssets));
        if (savedUnits) setCashflowUnits(JSON.parse(savedUnits));
        if (savedCategories) setCategories(JSON.parse(savedCategories));
        if (savedWishlists) setWishlists(JSON.parse(savedWishlists));
        if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
        if (savedPeriods) {
          const parsed = JSON.parse(savedPeriods) as Record<string, MonthPeriodData>;
          Object.values(parsed).forEach((p) => {
            if (p.items) {
              p.items.forEach((item) => {
                if (item.realization_amount === undefined) {
                  item.realization_amount = item.projection_amount ?? item.budget_amount;
                }
                if (item.projection_amount === undefined) {
                  item.projection_amount = item.realization_amount;
                }
              });
            }
          });
          setPeriodsMap(parsed);
        }
        if (savedMonth) setSelectedMonth(savedMonth);
      } catch (e) {
        console.error("Failed to load local storage state", e);
      } finally {
        if (isMounted) setIsLoaded(true);
      }

      // Step B: If Supabase is configured, fetch live cloud data
      if (!isSupabaseConfigured) {
        console.warn("⚠️ NineTally: Supabase env vars not found or incomplete. Running in offline/localStorage mode.");
      } else {
        try {
          const [catRes, assetRes, unitRes, periodRes, itemRes, txRes, wlRes] = await Promise.all([
            supabase.from("cashflow_categories").select("*").order("sort_order", { ascending: true }),
            supabase.from("assets").select("*"),
            supabase.from("cashflow_units").select("*").order("code", { ascending: true }),
            supabase.from("budget_periods").select("*").order("period_month", { ascending: true }),
            supabase.from("budget_period_items").select("*").order("sort_order", { ascending: true }),
            supabase.from("cashflow_transactions").select("*").order("date", { ascending: false }),
            supabase.from("wishlists").select("*").order("priority", { ascending: true }),
          ]);

          if (!isMounted) return;

          if (catRes.data && catRes.data.length > 0) {
            setCategories(catRes.data);
          }
          if (assetRes.data && assetRes.data.length > 0) {
            setAssets(
              assetRes.data.map((a: any) => ({
                id: a.id,
                name: a.name,
                liquidity_tier: a.liquidity_tier,
                main_value: Number(a.main_value) || 0,
                generating_rate: Number(a.generating_rate) || 0,
                start_date: a.start_date || undefined,
                income_generated: Number(a.income_generated) || 0,
                total_value: Number(a.total_value) || 0,
                goal_bucket: a.goal_bucket || undefined,
                is_external: Boolean(a.is_external),
              }))
            );
          }
          if (unitRes.data && unitRes.data.length > 0) {
            setCashflowUnits(unitRes.data);
          }
          if (wlRes.data && wlRes.data.length > 0) {
            setWishlists(
              wlRes.data.map((w: any) => ({
                id: w.id,
                item_name: w.item_name,
                target_amount: Number(w.target_amount) || 0,
                priority: Number(w.priority) || 1,
                is_bought: Boolean(w.is_bought),
                bought_at: w.bought_at || undefined,
              }))
            );
          }
          
          const liveTransactions: CashflowTransaction[] = txRes.data
            ? txRes.data.map((t: any) => ({
                id: t.id,
                period_id: t.period_id,
                cashflow_unit_id: t.cashflow_unit_id,
                amount: Number(t.amount) || 0,
                date: t.date,
                notes: t.notes || undefined,
                created_at: t.created_at,
              }))
            : [];

          if (txRes.data) {
            setTransactions(liveTransactions);
          }

          if (periodRes.data && periodRes.data.length > 0) {
            const periodsDictionary: Record<string, MonthPeriodData> = {};
            const itemsData = itemRes.data || [];

            periodRes.data.forEach((p: any) => {
              const monthTx = liveTransactions.filter((t) => t.period_id === p.period_month);
              periodsDictionary[p.period_month] = {
                period_month: p.period_month,
                status: p.status,
                salary_budget: Number(p.salary_budget) || 0,
                additional_budget: Number(p.additional_budget) || 0,
                real_bca_balance: Number(p.real_bca_balance) || 0,
                real_jago_balance: Number(p.real_jago_balance) || 0,
                items: itemsData
                  .filter((item: any) => item.period_id === p.period_month)
                  .map((item: any) => {
                    const txSum = monthTx
                      .filter((t) => t.cashflow_unit_id === item.cashflow_unit_id)
                      .reduce((sum, t) => sum + t.amount, 0);
                    const hasTx = monthTx.some((t) => t.cashflow_unit_id === item.cashflow_unit_id);
                    const finalRealization = hasTx ? txSum : Number(item.realization_amount ?? item.budget_amount) || 0;
                    return {
                      id: item.id,
                      period_id: item.period_id,
                      cashflow_unit_id: item.cashflow_unit_id,
                      budget_amount: Number(item.budget_amount) || 0,
                      realization_amount: finalRealization,
                      projection_amount: finalRealization,
                      actual_amount: finalRealization,
                      urgency: item.urgency,
                      is_realized: hasTx ? txSum > 0 : Boolean(item.is_realized),
                      notes: item.notes || undefined,
                      sort_order: Number(item.sort_order) || 0,
                    };
                  }),
              };
            });
            setPeriodsMap((prev) => ({ ...prev, ...periodsDictionary }));
          }
        } catch (err) {
          console.warn("Supabase initial sync skipped or tables not yet created:", err);
        }
      }
    }

    initializeData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save to localStorage on change (ONLY after initial load is complete!)
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("scf_assets", JSON.stringify(assets));
      localStorage.setItem("scf_units", JSON.stringify(cashflowUnits));
      localStorage.setItem("scf_categories", JSON.stringify(categories));
      localStorage.setItem("scf_wishlists", JSON.stringify(wishlists));
      localStorage.setItem("scf_transactions", JSON.stringify(transactions));
      localStorage.setItem("scf_periods_map", JSON.stringify(periodsMap));
      localStorage.setItem("scf_selected_month", selectedMonth);
    } catch (e) {
      console.error("Failed to save local storage state", e);
    }
  }, [isLoaded, assets, cashflowUnits, categories, wishlists, transactions, periodsMap, selectedMonth]);

  // ============================================================================
  // REALTIME WEBSOCKET SYNC (Supabase Realtime Broadcast & Postgres Changes)
  // ============================================================================
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  const broadcastSync = (payload: any) => {
    if (realtimeChannelRef.current) {
      realtimeChannelRef.current.send({
        type: "broadcast",
        event: "NINETALLY_SYNC",
        payload,
      });
    }
  };

  const refreshTransactionsFromCloud = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data } = await supabase
        .from("cashflow_transactions")
        .select("*")
        .order("date", { ascending: false });

      if (data) {
        const mapped: CashflowTransaction[] = data.map((t: any) => ({
          id: t.id,
          period_id: t.period_id,
          cashflow_unit_id: t.cashflow_unit_id,
          amount: Number(t.amount) || 0,
          date: t.date,
          notes: t.notes || undefined,
          created_at: t.created_at,
        }));
        setTransactions(mapped);

        // Recalculate realization and actuals for items in periodsMap
        setPeriodsMap((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((mKey) => {
            const p = next[mKey];
            if (!p || !p.items) return;
            const monthTx = mapped.filter((t) => t.period_id === mKey);
            next[mKey] = {
              ...p,
              items: p.items.map((item) => {
                const total = monthTx
                  .filter((t) => t.cashflow_unit_id === item.cashflow_unit_id)
                  .reduce((s, t) => s + t.amount, 0);
                if (total > 0 || monthTx.some((t) => t.cashflow_unit_id === item.cashflow_unit_id)) {
                  return {
                    ...item,
                    realization_amount: total,
                    projection_amount: total,
                    actual_amount: total,
                    is_realized: total > 0,
                  };
                }
                return item;
              }),
            };
          });
          return next;
        });
      }
    } catch (e) {
      console.warn("Supabase refresh transactions error:", e);
    }
  };

  const refreshBudgetItemsFromCloud = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { data } = await supabase
        .from("budget_period_items")
        .select("*")
        .order("sort_order", { ascending: true });

      if (data) {
        setPeriodsMap((prev) => {
          const next = { ...prev };
          data.forEach((item: any) => {
            const p = next[item.period_id];
            if (!p) return;
            const existingIdx = p.items.findIndex((i) => i.id === item.id);
            const mappedItem: BudgetPeriodItem = {
              id: item.id,
              period_id: item.period_id,
              cashflow_unit_id: item.cashflow_unit_id,
              budget_amount: Number(item.budget_amount) || 0,
              realization_amount: Number(item.realization_amount ?? item.budget_amount) || 0,
              projection_amount: Number(item.projection_amount ?? item.budget_amount) || 0,
              actual_amount: Number(item.actual_amount ?? item.budget_amount) || 0,
              urgency: item.urgency,
              is_realized: Boolean(item.is_realized),
              notes: item.notes || undefined,
              sort_order: Number(item.sort_order) || 0,
            };
            if (existingIdx >= 0) {
              p.items[existingIdx] = mappedItem;
            } else {
              p.items.push(mappedItem);
            }
          });
          return next;
        });
      }
    } catch (e) {
      console.warn("Supabase refresh budget items error:", e);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Connect to Supabase Realtime WebSocket Channel
    const channel = supabase.channel("ninetally-realtime-sync", {
      config: { broadcast: { self: false } },
    });

    // 1. WebSocket Broadcast Listener (instant sub-second sync between Web & Mobile)
    channel.on("broadcast", { event: "NINETALLY_SYNC" }, (msg) => {
      const payload = msg.payload;
      if (!payload || !payload.type) return;

      if (payload.type === "TX_ADDED") {
        const { newTx, unitTotal, linkedAssetUpdate } = payload;
        setTransactions((prev) => {
          if (prev.some((t) => t.id === newTx.id)) return prev;
          return [newTx, ...prev];
        });

        setPeriodsMap((prev) => {
          const period = prev[newTx.period_id];
          if (!period) return prev;
          return {
            ...prev,
            [newTx.period_id]: {
              ...period,
              items: period.items.map((i) =>
                i.cashflow_unit_id === newTx.cashflow_unit_id
                  ? {
                      ...i,
                      realization_amount: unitTotal,
                      projection_amount: unitTotal,
                      actual_amount: unitTotal,
                      is_realized: true,
                    }
                  : i
              ),
            },
          };
        });

        if (linkedAssetUpdate) {
          setAssets((prev) =>
            prev.map((a) => (a.id === linkedAssetUpdate.id ? { ...a, ...linkedAssetUpdate } : a))
          );
        }
      }

      if (payload.type === "TX_DELETED") {
        const { txId, periodId, cashflowUnitId, unitTotal, linkedAssetUpdate } = payload;
        setTransactions((prev) => prev.filter((t) => t.id !== txId));

        setPeriodsMap((prev) => {
          const period = prev[periodId];
          if (!period) return prev;
          return {
            ...prev,
            [periodId]: {
              ...period,
              items: period.items.map((i) =>
                i.cashflow_unit_id === cashflowUnitId
                  ? {
                      ...i,
                      realization_amount: unitTotal,
                      projection_amount: unitTotal,
                      actual_amount: unitTotal,
                      is_realized: unitTotal > 0,
                    }
                  : i
              ),
            },
          };
        });

        if (linkedAssetUpdate) {
          setAssets((prev) =>
            prev.map((a) => (a.id === linkedAssetUpdate.id ? { ...a, ...linkedAssetUpdate } : a))
          );
        }
      }

      if (payload.type === "ITEM_REALIZED_TOGGLED") {
        const { periodId, itemId, isRealized } = payload;
        setPeriodsMap((prev) => {
          const period = prev[periodId];
          if (!period) return prev;
          return {
            ...prev,
            [periodId]: {
              ...period,
              items: period.items.map((i) =>
                i.id === itemId ? { ...i, is_realized: isRealized } : i
              ),
            },
          };
        });
      }

      if (payload.type === "ITEM_REALIZATION_UPDATED") {
        const { periodId, itemId, amount } = payload;
        setPeriodsMap((prev) => {
          const period = prev[periodId];
          if (!period) return prev;
          return {
            ...prev,
            [periodId]: {
              ...period,
              items: period.items.map((i) =>
                i.id === itemId
                  ? {
                      ...i,
                      realization_amount: amount,
                      projection_amount: amount,
                      actual_amount: amount,
                    }
                  : i
              ),
            },
          };
        });
      }

      if (payload.type === "BUDGET_SAVED") {
        const { periodId, items } = payload;
        setPeriodsMap((prev) => {
          const period = prev[periodId];
          if (!period) return prev;
          return {
            ...prev,
            [periodId]: {
              ...period,
              items,
            },
          };
        });
      }

      if (payload.type === "PERIOD_STATUS_UPDATED") {
        const { periodId, status } = payload;
        setPeriodsMap((prev) => {
          const period = prev[periodId];
          if (!period) return prev;
          return {
            ...prev,
            [periodId]: {
              ...period,
              status,
            },
          };
        });
      }

      if (payload.type === "MONTH_INCOME_UPDATED") {
        const { periodId, salary, additional } = payload;
        setPeriodsMap((prev) => {
          const period = prev[periodId];
          if (!period) return prev;
          return {
            ...prev,
            [periodId]: {
              ...period,
              salary_budget: salary,
              additional_budget: additional,
            },
          };
        });
      }

      if (payload.type === "MASTER_DATA_CHANGED") {
        supabase.from("cashflow_units").select("*").then(({ data }) => {
          if (data) setCashflowUnits(data);
        });
        supabase.from("cashflow_categories").select("*").then(({ data }) => {
          if (data) setCategories(data);
        });
        supabase.from("assets").select("*").then(({ data }) => {
          if (data) setAssets(data);
        });
      }
    });

    // 2. Also listen for Postgres CDC changes directly
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "cashflow_transactions" }, () => {
        refreshTransactionsFromCloud();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_period_items" }, () => {
        refreshBudgetItemsFromCloud();
      });

    channel.subscribe((status) => {
      console.log("Supabase Realtime Channel Status:", status);
    });

    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  }, [isLoaded]);

  // Current active period object
  const currentMonthData: MonthPeriodData = periodsMap[selectedMonth] || {
    period_month: selectedMonth,
    status: selectedMonth < "2026-11" ? "LOCKED" : selectedMonth === "2026-11" ? "ACTIVE" : "PLANNING",
    salary_budget: 10000000,
    additional_budget: 0,
    real_bca_balance: 0,
    real_jago_balance: 0,
    items: [],
  };

  const isCurrentMonthLocked = currentMonthData.status === "LOCKED";

  // Helper: Find nominal from the latest month before selectedMonth
  const getPreviousMonthUnitNominal = (unitId: string): number | null => {
    const sortedMonthKeys = Object.keys(periodsMap)
      .filter((k) => k < selectedMonth)
      .sort()
      .reverse();

    for (const mKey of sortedMonthKeys) {
      const monthPeriod = periodsMap[mKey];
      if (monthPeriod && monthPeriod.items) {
        const found = monthPeriod.items.find((item) => item.cashflow_unit_id === unitId);
        if (found && found.budget_amount > 0) {
          return found.budget_amount;
        }
      }
    }
    return null;
  };

  // 1. Add Item to Current Month (Auto-inherits previous month's nominal!)
  const addItemToCurrentMonth = (unitId: string, customAmount?: number) => {
    if (isCurrentMonthLocked) return;

    const unit = cashflowUnits.find((u) => u.id === unitId);
    if (!unit) return;

    // Check previous month's nominal or fallback to 100000
    let finalAmount = customAmount;
    if (finalAmount === undefined) {
      const prevNominal = getPreviousMonthUnitNominal(unitId);
      finalAmount = prevNominal !== null ? prevNominal : 100000;
    }

    setPeriodsMap((prev) => {
      const current = prev[selectedMonth] || currentMonthData;
      // Prevent duplicates
      if (current.items.some((i) => i.cashflow_unit_id === unitId)) return prev;

      const newItem: BudgetPeriodItem = {
        id: `bi-${selectedMonth}-${Date.now()}`,
        period_id: selectedMonth,
        cashflow_unit_id: unitId,
        budget_amount: finalAmount,
        realization_amount: finalAmount,
        projection_amount: finalAmount,
        actual_amount: finalAmount,
        urgency: unit.default_urgency,
        is_realized: false,
        sort_order: current.items.length + 1,
      };

      return {
        ...prev,
        [selectedMonth]: {
          ...current,
          items: [...current.items, newItem],
        },
      };
    });
  };

  // 2. Copy entire budget from the most recent previous month
  const copyPreviousMonthBudget = (): boolean => {
    if (isCurrentMonthLocked) return false;

    const sortedMonthKeys = Object.keys(periodsMap)
      .filter((k) => k < selectedMonth)
      .sort()
      .reverse();

    const prevMonthKey = sortedMonthKeys[0];
    if (!prevMonthKey || !periodsMap[prevMonthKey]) return false;

    const prevMonth = periodsMap[prevMonthKey];
    if (!prevMonth.items || prevMonth.items.length === 0) return false;

    const clonedItems: BudgetPeriodItem[] = prevMonth.items.map((item, idx) => {
      const amount = item.budget_amount;
      return {
        id: `bi-${selectedMonth}-${Date.now()}-${idx}`,
        period_id: selectedMonth,
        cashflow_unit_id: item.cashflow_unit_id,
        budget_amount: amount,
        realization_amount: amount,
        projection_amount: amount,
        actual_amount: amount,
        urgency: item.urgency,
        is_realized: false,
        sort_order: idx + 1,
      };
    });

    setPeriodsMap((prev) => {
      const current = prev[selectedMonth] || currentMonthData;
      return {
        ...prev,
        [selectedMonth]: {
          ...current,
          items: clonedItems,
        },
      };
    });

    return true;
  };

  // 3. Remove Item from Current Month
  const removeItemFromCurrentMonth = (itemId: string) => {
    if (isCurrentMonthLocked) return;

    setPeriodsMap((prev) => {
      const current = prev[selectedMonth] || currentMonthData;
      return {
        ...prev,
        [selectedMonth]: {
          ...current,
          items: current.items.filter((i) => i.id !== itemId),
        },
      };
    });
  };

  // 4. Update Item Budget Amount in Current Month
  const updateItemBudgetAmount = (itemId: string, newBudget: number) => {
    if (isCurrentMonthLocked) return;

    setPeriodsMap((prev) => {
      const current = prev[selectedMonth] || currentMonthData;
      return {
        ...prev,
        [selectedMonth]: {
          ...current,
          items: current.items.map((i) =>
            i.id === itemId
              ? { 
                  ...i, 
                  budget_amount: newBudget, 
                  realization_amount: newBudget, 
                  projection_amount: newBudget, 
                  actual_amount: newBudget 
                }
              : i
          ),
        },
      };
    });
  };

  // 5. Update Income (Salary + Sisa Dana / Additional Budget)
  const updateMonthIncome = (salaryBudget: number, additionalBudget: number) => {
    if (isCurrentMonthLocked) return;

    setPeriodsMap((prev) => {
      const current = prev[selectedMonth] || currentMonthData;
      return {
        ...prev,
        [selectedMonth]: {
          ...current,
          salary_budget: salaryBudget,
          additional_budget: additionalBudget,
        },
      };
    });

    broadcastSync({
      type: "MONTH_INCOME_UPDATED",
      periodId: selectedMonth,
      salary: salaryBudget,
      additional: additionalBudget,
    });
  };

  // 6. Explicit Save Button Handler
  const saveCurrentMonthBudget = () => {
    try {
      localStorage.setItem("scf_periods_map", JSON.stringify(periodsMap));
      if (isSupabaseConfigured) {
        const periodData = periodsMap[selectedMonth] || currentMonthData;
        supabase
          .from("budget_periods")
          .upsert({
            period_month: selectedMonth,
            status: periodData.status,
            salary_budget: periodData.salary_budget,
            additional_budget: periodData.additional_budget,
            real_bca_balance: periodData.real_bca_balance,
            real_jago_balance: periodData.real_jago_balance,
          })
          .then(({ error }) => {
            if (error) console.error("Supabase upsert period error:", error.message);
          });

        if (periodData.items && periodData.items.length > 0) {
          const itemsPayload = periodData.items.map((i) => ({
            id: i.id,
            period_id: selectedMonth,
            cashflow_unit_id: i.cashflow_unit_id,
            budget_amount: i.budget_amount,
            realization_amount: i.realization_amount ?? i.budget_amount,
            projection_amount: i.projection_amount ?? i.budget_amount,
            actual_amount: i.actual_amount ?? i.budget_amount,
            urgency: i.urgency,
            is_realized: Boolean(i.is_realized),
            notes: i.notes || null,
            sort_order: i.sort_order,
          }));
          supabase
            .from("budget_period_items")
            .upsert(itemsPayload)
            .then(({ error }) => {
              if (error) console.error("Supabase upsert items error:", error.message);
            });
        }
      }

      broadcastSync({
        type: "BUDGET_SAVED",
        periodId: selectedMonth,
        items: (periodsMap[selectedMonth] || currentMonthData).items,
      });

      return true;
    } catch {
      return false;
    }
  };

  // 7. Governance: Lock / Unlock
  const lockCurrentMonth = () => {
    setPeriodsMap((prev) => {
      const current = prev[selectedMonth] || currentMonthData;
      return {
        ...prev,
        [selectedMonth]: {
          ...current,
          status: "LOCKED",
          items: current.items.map((i) => ({ 
            ...i, 
            actual_amount: i.realization_amount ?? i.projection_amount ?? i.budget_amount 
          })),
        },
      };
    });

    broadcastSync({
      type: "PERIOD_STATUS_UPDATED",
      periodId: selectedMonth,
      status: "LOCKED",
    });
  };

  const unlockCurrentMonth = () => {
    setPeriodsMap((prev) => {
      const current = prev[selectedMonth] || currentMonthData;
      return {
        ...prev,
        [selectedMonth]: {
          ...current,
          status: "ACTIVE",
        },
      };
    });

    broadcastSync({
      type: "PERIOD_STATUS_UPDATED",
      periodId: selectedMonth,
      status: "ACTIVE",
    });
  };

  // 8. Mobile Checklist Toggle
  const toggleItemRealized = (itemId: string) => {
    if (isCurrentMonthLocked) return;

    const current = periodsMap[selectedMonth] || currentMonthData;
    const target = current.items.find((i) => i.id === itemId);
    const nextRealized = target ? !target.is_realized : true;

    setPeriodsMap((prev) => {
      const curr = prev[selectedMonth] || currentMonthData;
      return {
        ...prev,
        [selectedMonth]: {
          ...curr,
          items: curr.items.map((i) =>
            i.id === itemId ? { ...i, is_realized: nextRealized } : i
          ),
        },
      };
    });

    if (isSupabaseConfigured) {
      supabase
        .from("budget_period_items")
        .update({ is_realized: nextRealized })
        .eq("id", itemId)
        .then(({ error }) => {
          if (error) console.error("Supabase toggle item error:", error.message);
        });
    }

    broadcastSync({
      type: "ITEM_REALIZED_TOGGLED",
      periodId: selectedMonth,
      itemId,
      isRealized: nextRealized,
    });
  };

  // 9. Update Realization (Realisasi Berjalan)
  const updateItemRealization = (itemId: string, newRealization: number) => {
    if (isCurrentMonthLocked) return;

    setPeriodsMap((prev) => {
      const current = prev[selectedMonth] || currentMonthData;
      const target = current.items.find((i) => i.id === itemId);
      if (!target) return prev;

      const currentAmount = target.realization_amount ?? target.projection_amount ?? 0;
      const diff = newRealization - currentAmount;

      // Auto-sync with linked Asset if type is ASSET
      const unit = cashflowUnits.find((u) => u.id === target.cashflow_unit_id);
      if (unit?.unit_type === "ASSET" && unit.linked_asset_id) {
        setAssets((prevAssets) =>
          prevAssets.map((ast) => {
            if (ast.id === unit.linked_asset_id) {
              const newMain = ast.main_value + diff;
              return {
                ...ast,
                main_value: newMain,
                total_value: newMain + ast.income_generated,
              };
            }
            return ast;
          })
        );
      }

      return {
        ...prev,
        [selectedMonth]: {
          ...current,
          items: current.items.map((i) =>
            i.id === itemId
              ? { 
                  ...i, 
                  realization_amount: newRealization, 
                  projection_amount: newRealization, 
                  actual_amount: newRealization 
                }
              : i
          ),
        },
      };
    });

    if (isSupabaseConfigured) {
      supabase
        .from("budget_period_items")
        .update({
          realization_amount: newRealization,
          projection_amount: newRealization,
          actual_amount: newRealization,
        })
        .eq("id", itemId)
        .then(({ error }) => {
          if (error) console.error("Supabase update item realization error:", error.message);
        });
    }

    broadcastSync({
      type: "ITEM_REALIZATION_UPDATED",
      periodId: selectedMonth,
      itemId,
      amount: newRealization,
    });
  };

  // Backward compatibility alias
  const updateItemProjection = updateItemRealization;

  // 10. Daily Transaction Logging (Mobile & Web)
  const addTransaction = (tx: Omit<CashflowTransaction, "id" | "created_at">) => {
    if (isCurrentMonthLocked) return;

    const newTx: CashflowTransaction = {
      ...tx,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };

    const updatedTransactions = [newTx, ...transactions];
    setTransactions(updatedTransactions);

    // Calculate sum of transactions for this cashflow unit in this period
    const unitTotal = updatedTransactions
      .filter((t) => t.period_id === tx.period_id && t.cashflow_unit_id === tx.cashflow_unit_id)
      .reduce((sum, t) => sum + t.amount, 0);

    // Auto-sync with linked Asset if unit is ASSET
    let linkedAssetUpdate: { id: string; main_value: number; total_value: number } | undefined;
    const unit = cashflowUnits.find((u) => u.id === tx.cashflow_unit_id);
    if (unit?.unit_type === "ASSET" && unit.linked_asset_id) {
      const targetAsset = assets.find((a) => a.id === unit.linked_asset_id);
      if (targetAsset) {
        const newMain = targetAsset.main_value + tx.amount;
        linkedAssetUpdate = {
          id: targetAsset.id,
          main_value: newMain,
          total_value: newMain + targetAsset.income_generated,
        };
        setAssets((prevAssets) =>
          prevAssets.map((ast) => (ast.id === targetAsset.id ? { ...ast, ...linkedAssetUpdate } : ast))
        );
      }
    }

    setPeriodsMap((prev) => {
      const current = prev[tx.period_id] || currentMonthData;
      return {
        ...prev,
        [tx.period_id]: {
          ...current,
          items: current.items.map((i) =>
            i.cashflow_unit_id === tx.cashflow_unit_id
              ? {
                  ...i,
                  realization_amount: unitTotal,
                  projection_amount: unitTotal,
                  actual_amount: unitTotal,
                  is_realized: true,
                }
              : i
          ),
        },
      };
    });

    if (isSupabaseConfigured) {
      supabase
        .from("cashflow_transactions")
        .insert({
          id: newTx.id,
          period_id: newTx.period_id,
          cashflow_unit_id: newTx.cashflow_unit_id,
          amount: newTx.amount,
          date: newTx.date,
          notes: newTx.notes || null,
        })
        .then(({ error }) => {
          if (error) console.error("Supabase insert tx error:", error.message);
        });

      // Keep budget_period_items table in Supabase 100% synchronized
      supabase
        .from("budget_period_items")
        .update({
          realization_amount: unitTotal,
          projection_amount: unitTotal,
          actual_amount: unitTotal,
          is_realized: true,
        })
        .eq("period_id", tx.period_id)
        .eq("cashflow_unit_id", tx.cashflow_unit_id)
        .then(({ error }) => {
          if (error) console.error("Supabase sync item realization error:", error.message);
        });
    }

    // Broadcast instant update to all other open screens (Web, Mobile, etc.)
    broadcastSync({
      type: "TX_ADDED",
      newTx,
      periodId: tx.period_id,
      cashflowUnitId: tx.cashflow_unit_id,
      unitTotal,
      linkedAssetUpdate,
    });
  };

  const deleteTransaction = (txId: string) => {
    if (isCurrentMonthLocked) return;

    const targetTx = transactions.find((t) => t.id === txId);
    if (!targetTx) return;

    const updatedTransactions = transactions.filter((t) => t.id !== txId);
    setTransactions(updatedTransactions);

    // Recalculate sum
    const unitTotal = updatedTransactions
      .filter((t) => t.period_id === targetTx.period_id && t.cashflow_unit_id === targetTx.cashflow_unit_id)
      .reduce((sum, t) => sum + t.amount, 0);

    // Revert asset sync if ASSET
    let linkedAssetUpdate: { id: string; main_value: number; total_value: number } | undefined;
    const unit = cashflowUnits.find((u) => u.id === targetTx.cashflow_unit_id);
    if (unit?.unit_type === "ASSET" && unit.linked_asset_id) {
      const targetAsset = assets.find((a) => a.id === unit.linked_asset_id);
      if (targetAsset) {
        const newMain = Math.max(0, targetAsset.main_value - targetTx.amount);
        linkedAssetUpdate = {
          id: targetAsset.id,
          main_value: newMain,
          total_value: newMain + targetAsset.income_generated,
        };
        setAssets((prevAssets) =>
          prevAssets.map((ast) => (ast.id === targetAsset.id ? { ...ast, ...linkedAssetUpdate } : ast))
        );
      }
    }

    setPeriodsMap((prev) => {
      const current = prev[targetTx.period_id] || currentMonthData;
      return {
        ...prev,
        [targetTx.period_id]: {
          ...current,
          items: current.items.map((i) =>
            i.cashflow_unit_id === targetTx.cashflow_unit_id
              ? {
                  ...i,
                  realization_amount: unitTotal,
                  projection_amount: unitTotal,
                  actual_amount: unitTotal,
                  is_realized: unitTotal > 0,
                }
              : i
          ),
        },
      };
    });

    if (isSupabaseConfigured) {
      supabase
        .from("cashflow_transactions")
        .delete()
        .eq("id", txId)
        .then(({ error }) => {
          if (error) console.error("Supabase delete tx error:", error.message);
        });

      // Synchronize budget_period_items table in Supabase
      supabase
        .from("budget_period_items")
        .update({
          realization_amount: unitTotal,
          projection_amount: unitTotal,
          actual_amount: unitTotal,
          is_realized: unitTotal > 0,
        })
        .eq("period_id", targetTx.period_id)
        .eq("cashflow_unit_id", targetTx.cashflow_unit_id)
        .then(({ error }) => {
          if (error) console.error("Supabase sync item on delete tx error:", error.message);
        });
    }

    // Broadcast instant delete to all other open screens (Web, Mobile, etc.)
    broadcastSync({
      type: "TX_DELETED",
      txId,
      periodId: targetTx.period_id,
      cashflowUnitId: targetTx.cashflow_unit_id,
      unitTotal,
      linkedAssetUpdate,
    });
  };

  // Master Data: Create Cashflow Unit
  const createCashflowUnit = (unit: Omit<CashflowUnit, "id" | "is_active">) => {
    const newUnit: CashflowUnit = {
      ...unit,
      id: `cf-${Date.now()}`,
      is_active: true,
    };
    setCashflowUnits((prev) => [...prev, newUnit]);

    if (isSupabaseConfigured) {
      supabase
        .from("cashflow_units")
        .insert({
          id: newUnit.id,
          code: newUnit.code,
          name: newUnit.name,
          unit_type: newUnit.unit_type,
          category: newUnit.category || null,
          default_urgency: newUnit.default_urgency,
          linked_asset_id: newUnit.linked_asset_id || null,
          is_active: newUnit.is_active,
        })
        .then(({ error }) => {
          if (error) console.error("Supabase insert unit error:", error.message);
        });
    }

    broadcastSync({ type: "MASTER_DATA_CHANGED" });
  };

  // Master Data: Update Cashflow Unit
  const updateCashflowUnit = (id: string, unitUpdate: Partial<CashflowUnit>) => {
    setCashflowUnits((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...unitUpdate } : u))
    );

    if (isSupabaseConfigured) {
      supabase
        .from("cashflow_units")
        .update(unitUpdate)
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Supabase update unit error:", error.message);
        });
    }

    broadcastSync({ type: "MASTER_DATA_CHANGED" });
  };

  // Master Data: Delete Cashflow Unit with strict validation
  const deleteCashflowUnit = (id: string): { success: boolean; message?: string } => {
    const target = cashflowUnits.find((u) => u.id === id);
    if (!target) return { success: false, message: "Cashflow Item tidak ditemukan." };

    // Check usage across all budget months
    const usedInMonths: string[] = [];
    Object.values(periodsMap).forEach((p) => {
      if (p.items && p.items.some((i) => i.cashflow_unit_id === id)) {
        usedInMonths.push(p.period_month);
      }
    });

    // Check usage in logged transactions
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

    // Safe to delete!
    setCashflowUnits((prev) => prev.filter((u) => u.id !== id));

    if (isSupabaseConfigured) {
      supabase
        .from("cashflow_units")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Supabase delete unit error:", error.message);
        });
    }

    broadcastSync({ type: "MASTER_DATA_CHANGED" });
    return { success: true };
  };

  // Master Data: Categories / Labels CRUD
  const createCategory = (cat: Omit<CashflowCategory, "id">) => {
    const newCat: CashflowCategory = {
      ...cat,
      id: `cat-${Date.now()}`,
    };
    setCategories((prev) => [...prev, newCat]);

    if (isSupabaseConfigured) {
      supabase
        .from("cashflow_categories")
        .insert(newCat)
        .then(({ error }) => {
          if (error) console.error("Supabase insert category error:", error.message);
        });
    }

    broadcastSync({ type: "MASTER_DATA_CHANGED" });
  };

  const updateCategory = (id: string, catUpdate: Partial<CashflowCategory>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...catUpdate } : c))
    );

    if (isSupabaseConfigured) {
      supabase
        .from("cashflow_categories")
        .update(catUpdate)
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Supabase update category error:", error.message);
        });
    }

    broadcastSync({ type: "MASTER_DATA_CHANGED" });
  };

  // Master Data: Delete Category with validation check
  const deleteCategory = (id: string): { success: boolean; message?: string } => {
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

    setCategories((prev) => prev.filter((c) => c.id !== id));

    if (isSupabaseConfigured) {
      supabase
        .from("cashflow_categories")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Supabase delete category error:", error.message);
        });
    }

    broadcastSync({ type: "MASTER_DATA_CHANGED" });
    return { success: true };
  };

  // Master Data: Create Asset
  const createAsset = (asset: Omit<Asset, "id" | "total_value">) => {
    const newAsset: Asset = {
      ...asset,
      id: `ast-${Date.now()}`,
      total_value: asset.main_value + asset.income_generated,
    };
    setAssets((prev) => [...prev, newAsset]);

    if (isSupabaseConfigured) {
      supabase
        .from("assets")
        .insert({
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
        })
        .then(({ error }) => {
          if (error) console.error("Supabase insert asset error:", error.message);
        });
    }

    broadcastSync({ type: "MASTER_DATA_CHANGED" });
  };

  // Master Data: Update Asset
  const updateAsset = (id: string, assetUpdate: Partial<Asset>) => {
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const main = assetUpdate.main_value ?? a.main_value;
          const inc = assetUpdate.income_generated ?? a.income_generated;
          return {
            ...a,
            ...assetUpdate,
            total_value: main + inc,
          };
        }
        return a;
      })
    );

    if (isSupabaseConfigured) {
      supabase
        .from("assets")
        .update(assetUpdate)
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Supabase update asset error:", error.message);
        });
    }

    broadcastSync({ type: "MASTER_DATA_CHANGED" });
  };

  // Master Data: Delete Asset with validation check
  const deleteAsset = (id: string): { success: boolean; message?: string } => {
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

    setAssets((prev) => prev.filter((a) => a.id !== id));

    if (isSupabaseConfigured) {
      supabase
        .from("assets")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) console.error("Supabase delete asset error:", error.message);
        });
    }

    broadcastSync({ type: "MASTER_DATA_CHANGED" });
    return { success: true };
  };

  // Wishlist toggle
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

  return (
    <AppContext.Provider
      value={{
        assets,
        cashflowUnits,
        categories,
        wishlists,
        transactions,
        selectedMonth,
        setSelectedMonth,
        availableMonths,
        currentMonthData,
        addItemToCurrentMonth,
        removeItemFromCurrentMonth,
        updateItemBudgetAmount,
        updateMonthIncome,
        saveCurrentMonthBudget,
        copyPreviousMonthBudget,
        getPreviousMonthUnitNominal,
        lockCurrentMonth,
        unlockCurrentMonth,
        toggleItemRealized,
        updateItemRealization,
        updateItemProjection,
        addTransaction,
        deleteTransaction,
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};
