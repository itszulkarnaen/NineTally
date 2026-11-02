"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Asset, BudgetPeriodItem, CashflowCategory, CashflowTransaction, CashflowUnit, WishlistItem, PeriodStatus, UrgencyLevel, PayrollSettings } from "@/types";
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

// Clean initial items - user creates budget items from master units
const initialNovemberItems: BudgetPeriodItem[] = [];

// Initial months storage map
const initialMonthsData: Record<string, MonthPeriodData> = {
  // Past month: LOCKED
  "2026-10": {
    period_month: "2026-10",
    status: "LOCKED",
    salary_budget: 10000000,
    additional_budget: 0,
    real_bca_balance: 0,
    real_jago_balance: 0,
    items: [],
  },
  // Current month: ACTIVE
  "2026-11": {
    period_month: "2026-11",
    status: "ACTIVE",
    salary_budget: 10000000,
    additional_budget: 0,
    real_bca_balance: 0,
    real_jago_balance: 0,
    items: [],
  },
  // Future months: PLANNING
  "2026-12": {
    period_month: "2026-12",
    status: "PLANNING",
    salary_budget: 10000000,
    additional_budget: 0,
    real_bca_balance: 0,
    real_jago_balance: 0,
    items: [],
  },
  "2027-01": {
    period_month: "2027-01",
    status: "PLANNING",
    salary_budget: 10000000,
    additional_budget: 0,
    real_bca_balance: 0,
    real_jago_balance: 0,
    items: [],
  },
};

export function getNextMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function isPaydayReached(settings: PayrollSettings, checkDate: Date = new Date()): boolean {
  const currentDay = checkDate.getDate();
  const lastDayOfMonth = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0).getDate();
  if (settings.is_last_day) {
    return currentDay >= lastDayOfMonth;
  }
  return currentDay >= settings.payday_day;
}

export const defaultPayrollSettings: PayrollSettings = {
  monthly_salary: 10000000,
  payday_day: 25,
  is_last_day: true,
  target_unit_id: "cf-inc-1",
  target_bank: "BCA",
  auto_post_transaction: true,
  next_month_allocation: true,
  last_posted_period: "",
};

export type CloudSyncStatus = "CONNECTED" | "CONNECTING" | "OFFLINE" | "ERROR";

interface AppContextType {
  // Data
  assets: Asset[];
  cashflowUnits: CashflowUnit[];
  categories: CashflowCategory[];
  wishlists: WishlistItem[];
  transactions: CashflowTransaction[];
  
  // Cloud Sync & Realtime Status
  cloudSyncStatus: CloudSyncStatus;
  retryCloudSync: () => Promise<{ success: boolean; message?: string }>;

  // Payroll & Payday Engine
  payrollSettings: PayrollSettings;
  updatePayrollSettings: (settings: Partial<PayrollSettings>) => void;
  triggerPaydayExecution: (monthKey?: string) => { success: boolean; message: string; txAdded?: boolean; budgetAllocated?: boolean };
  
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
  updateBankBalance: (bcaBalance: number, jagoBalance: number) => void;
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

  // Actions: Master Data (with Database Error Handling)
  createCashflowUnit: (unit: Omit<CashflowUnit, "id" | "is_active">) => Promise<{ success: boolean; message?: string }>;
  updateCashflowUnit: (id: string, unit: Partial<CashflowUnit>) => Promise<{ success: boolean; message?: string }>;
  deleteCashflowUnit: (id: string) => Promise<{ success: boolean; message?: string }>;
  createCategory: (cat: Omit<CashflowCategory, "id">) => Promise<{ success: boolean; message?: string }>;
  updateCategory: (id: string, cat: Partial<CashflowCategory>) => Promise<{ success: boolean; message?: string }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; message?: string }>;
  createAsset: (asset: Omit<Asset, "id" | "total_value">) => Promise<{ success: boolean; message?: string }>;
  updateAsset: (id: string, asset: Partial<Asset>) => Promise<{ success: boolean; message?: string }>;
  deleteAsset: (id: string) => Promise<{ success: boolean; message?: string }>;
  toggleWishlistBought: (wishlistId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [cashflowUnits, setCashflowUnits] = useState<CashflowUnit[]>(initialCashflowUnits);
  const [categories, setCategories] = useState<CashflowCategory[]>(initialCategories);
  const [wishlists, setWishlists] = useState<WishlistItem[]>(initialWishlists);
  const [transactions, setTransactions] = useState<CashflowTransaction[]>(initialTransactions);
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings>(defaultPayrollSettings);
  
  // Multi-month periods dictionary
  const [periodsMap, setPeriodsMap] = useState<Record<string, MonthPeriodData>>(initialMonthsData);
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-11");
  const [isLoaded, setIsLoaded] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(
    !isSupabaseConfigured
      ? "OFFLINE"
      : typeof navigator !== "undefined" && !navigator.onLine
      ? "OFFLINE"
      : "CONNECTING"
  );

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
        const savedMonth = localStorage.getItem("scf_selected_month");
        const savedPayroll = localStorage.getItem("ninetally_payroll_settings");

        if (savedPayroll) {
          try {
            setPayrollSettings(JSON.parse(savedPayroll));
          } catch (e) {}
        }

        // Cache-buster migration: wipe old dummy periods & transactions from client storage
        const savedVersion = localStorage.getItem("scf_data_version");
        if (savedVersion !== "scf_v2_clean") {
          localStorage.removeItem("scf_periods_map");
          localStorage.removeItem("scf_transactions");
          localStorage.setItem("scf_data_version", "scf_v2_clean");
        } else {
          const savedPeriods = localStorage.getItem("scf_periods_map");
          const savedTransactions = localStorage.getItem("scf_transactions");
          if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
          if (savedPeriods) {
            setPeriodsMap(JSON.parse(savedPeriods));
          }
        }

        if (savedAssets) setAssets(JSON.parse(savedAssets));
        if (savedUnits) setCashflowUnits(JSON.parse(savedUnits));
        if (savedCategories) setCategories(JSON.parse(savedCategories));
        if (savedWishlists) setWishlists(JSON.parse(savedWishlists));
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
          const [catRes, assetRes, unitRes, periodRes, itemRes, txRes, wlRes, payrollRes] = await Promise.all([
            supabase.from("cashflow_categories").select("*").order("sort_order", { ascending: true }),
            supabase.from("assets").select("*"),
            supabase.from("cashflow_units").select("*").order("code", { ascending: true }),
            supabase.from("budget_periods").select("*").order("period_month", { ascending: true }),
            supabase.from("budget_period_items").select("*").order("sort_order", { ascending: true }),
            supabase.from("cashflow_transactions").select("*").order("date", { ascending: false }),
            supabase.from("wishlists").select("*").order("priority", { ascending: true }),
            supabase.from("payroll_settings").select("*").eq("id", "default").maybeSingle(),
          ]);

          if (!isMounted) return;

          if (payrollRes.data) {
            const p = payrollRes.data;
            setPayrollSettings({
              monthly_salary: Number(p.monthly_salary) || 10000000,
              payday_day: Number(p.payday_day) || 25,
              is_last_day: Boolean(p.is_last_day),
              target_bank: p.target_bank || "BCA",
              target_unit_id: p.target_unit_id || "cf-inc-1",
              auto_post_transaction: Boolean(p.auto_post_transaction),
              next_month_allocation: Boolean(p.next_month_allocation),
              last_posted_period: p.last_posted_period || undefined,
            });
          }

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
              const isLocked = p.status === "LOCKED";
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
                    const finalRealization = isLocked
                      ? Number(item.realization_amount ?? item.budget_amount) || 0
                      : txSum;
                    return {
                      id: item.id,
                      period_id: item.period_id,
                      cashflow_unit_id: item.cashflow_unit_id,
                      budget_amount: Number(item.budget_amount) || 0,
                      realization_amount: finalRealization,
                      projection_amount: finalRealization,
                      actual_amount: finalRealization,
                      urgency: item.urgency,
                      is_realized: isLocked 
                        ? Boolean(item.is_realized) 
                        : (Number(item.budget_amount) > 0 ? txSum >= Number(item.budget_amount) : txSum > 0),
                      notes: item.notes || undefined,
                      sort_order: Number(item.sort_order) || 0,
                    };
                  }),
              };
            });
            setPeriodsMap((prev) => ({ ...prev, ...periodsDictionary }));
          }
          if (isMounted) setCloudSyncStatus("CONNECTED");
        } catch (err) {
          console.warn("Supabase initial sync skipped or tables not yet created:", err);
          if (isMounted) setCloudSyncStatus("ERROR");
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
            if (!p || !p.items || p.status === "LOCKED") return;
            const monthTx = mapped.filter((t) => t.period_id === mKey);
            next[mKey] = {
              ...p,
              items: p.items.map((item) => {
                const total = monthTx
                  .filter((t) => t.cashflow_unit_id === item.cashflow_unit_id)
                  .reduce((s, t) => s + t.amount, 0);
                return {
                  ...item,
                  realization_amount: total,
                  projection_amount: total,
                  actual_amount: total,
                  is_realized: item.budget_amount > 0 ? total >= item.budget_amount : total > 0,
                };
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
            const isLocked = p.status === "LOCKED";
            const mappedItem: BudgetPeriodItem = {
              id: item.id,
              period_id: item.period_id,
              cashflow_unit_id: item.cashflow_unit_id,
              budget_amount: Number(item.budget_amount) || 0,
              realization_amount: Number(item.realization_amount ?? (isLocked ? item.budget_amount : 0)) || 0,
              projection_amount: Number(item.projection_amount ?? (isLocked ? item.budget_amount : 0)) || 0,
              actual_amount: Number(item.actual_amount ?? (isLocked ? item.budget_amount : 0)) || 0,
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
        const { newTx, unitTotal, newBcaBalance, linkedAssetUpdate } = payload;
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
              real_bca_balance: newBcaBalance !== undefined ? newBcaBalance : period.real_bca_balance,
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
        const { txId, periodId, cashflowUnitId, unitTotal, newBcaBalance, linkedAssetUpdate } = payload;
        setTransactions((prev) => prev.filter((t) => t.id !== txId));

        setPeriodsMap((prev) => {
          const period = prev[periodId];
          if (!period) return prev;
          return {
            ...prev,
            [periodId]: {
              ...period,
              real_bca_balance: newBcaBalance !== undefined ? newBcaBalance : period.real_bca_balance,
              items: period.items.map((i) =>
                i.cashflow_unit_id === cashflowUnitId
                  ? {
                      ...i,
                      realization_amount: unitTotal,
                      projection_amount: unitTotal,
                      actual_amount: unitTotal,
                      is_realized: i.budget_amount > 0 ? unitTotal >= i.budget_amount : unitTotal > 0,
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

      if (payload.type === "BANK_BALANCE_UPDATED") {
        const { periodId, bcaBalance, jagoBalance } = payload;
        setPeriodsMap((prev) => {
          const period = prev[periodId];
          if (!period) return prev;
          return {
            ...prev,
            [periodId]: {
              ...period,
              real_bca_balance: bcaBalance,
              real_jago_balance: jagoBalance,
            },
          };
        });
      }

      if (payload.type === "PAYROLL_SETTINGS_UPDATED") {
        const { payrollSettings: incomingSettings, allocatedMonth, allocatedAmount } = payload;
        if (incomingSettings) {
          setPayrollSettings(incomingSettings);
          try {
            localStorage.setItem("ninetally_payroll_settings", JSON.stringify(incomingSettings));
          } catch (e) {}
        }
        if (allocatedMonth && allocatedAmount) {
          setPeriodsMap((prev) => {
            const existing = prev[allocatedMonth] || {
              period_month: allocatedMonth,
              status: "PLANNING",
              salary_budget: allocatedAmount,
              additional_budget: 0,
              real_bca_balance: 0,
              real_jago_balance: 0,
              items: [],
            };
            return {
              ...prev,
              [allocatedMonth]: {
                ...existing,
                salary_budget: allocatedAmount,
              },
            };
          });
        }
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
      if (status === "SUBSCRIBED") {
        setCloudSyncStatus("CONNECTED");
      } else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setCloudSyncStatus("ERROR");
      } else {
        setCloudSyncStatus("CONNECTING");
      }
    });

    const handleOnline = () => {
      setCloudSyncStatus("CONNECTING");
      refreshTransactionsFromCloud();
      refreshBudgetItemsFromCloud();
    };
    const handleOffline = () => setCloudSyncStatus("OFFLINE");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    realtimeChannelRef.current = channel;

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
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

  // 5b. Update Real Bank Balance (BCA & Jago) for selected month
  const updateBankBalance = (bcaBalance: number, jagoBalance: number) => {
    setPeriodsMap((prev) => {
      const current = prev[selectedMonth] || currentMonthData;
      return {
        ...prev,
        [selectedMonth]: {
          ...current,
          real_bca_balance: bcaBalance,
          real_jago_balance: jagoBalance,
        },
      };
    });

    if (isSupabaseConfigured) {
      const periodData = periodsMap[selectedMonth] || currentMonthData;
      supabase
        .from("budget_periods")
        .upsert({
          period_month: selectedMonth,
          status: periodData.status,
          salary_budget: periodData.salary_budget,
          additional_budget: periodData.additional_budget,
          real_bca_balance: bcaBalance,
          real_jago_balance: jagoBalance,
        })
        .then(({ error }) => {
          if (error) console.error("Supabase update bank balance error:", error.message);
        });
    }

    broadcastSync({
      type: "BANK_BALANCE_UPDATED",
      periodId: selectedMonth,
      bcaBalance,
      jagoBalance,
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

    // Auto-sync bank balance: Deduct expense, or add income
    const currentPeriod = periodsMap[tx.period_id] || currentMonthData;
    const currentBca = currentPeriod.real_bca_balance || 0;
    const isIncome = unit?.unit_type === "INCOME";
    const delta = isIncome ? tx.amount : -tx.amount;
    const newBcaBalance = currentBca + delta;

    const targetBudgetItem = currentPeriod.items.find((i) => i.cashflow_unit_id === tx.cashflow_unit_id);
    const isTargetItemRealized = targetBudgetItem && targetBudgetItem.budget_amount > 0 
      ? unitTotal >= targetBudgetItem.budget_amount 
      : unitTotal > 0;

    setPeriodsMap((prev) => {
      const current = prev[tx.period_id] || currentMonthData;
      return {
        ...prev,
        [tx.period_id]: {
          ...current,
          real_bca_balance: newBcaBalance,
          items: current.items.map((i) =>
            i.cashflow_unit_id === tx.cashflow_unit_id
              ? {
                  ...i,
                  realization_amount: unitTotal,
                  projection_amount: unitTotal,
                  actual_amount: unitTotal,
                  is_realized: i.budget_amount > 0 ? unitTotal >= i.budget_amount : unitTotal > 0,
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
          is_realized: isTargetItemRealized,
        })
        .eq("period_id", tx.period_id)
        .eq("cashflow_unit_id", tx.cashflow_unit_id)
        .then(({ error }) => {
          if (error) console.error("Supabase sync item realization error:", error.message);
        });

      // Persist deducted bank balance to Supabase budget_periods
      supabase
        .from("budget_periods")
        .update({
          real_bca_balance: newBcaBalance,
        })
        .eq("period_month", tx.period_id)
        .then(({ error }) => {
          if (error) console.error("Supabase update bank balance on tx error:", error.message);
        });
    }

    // Broadcast instant update to all other open screens (Web, Mobile, etc.)
    broadcastSync({
      type: "TX_ADDED",
      newTx,
      periodId: tx.period_id,
      cashflowUnitId: tx.cashflow_unit_id,
      unitTotal,
      newBcaBalance,
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

    // Refund / restore bank balance on delete transaction
    const currentPeriod = periodsMap[targetTx.period_id] || currentMonthData;
    const currentBca = currentPeriod.real_bca_balance || 0;
    const isIncome = unit?.unit_type === "INCOME";
    const refundDelta = isIncome ? -targetTx.amount : targetTx.amount;
    const newBcaBalance = currentBca + refundDelta;

    const targetBudgetItem = currentPeriod.items.find((i) => i.cashflow_unit_id === targetTx.cashflow_unit_id);
    const isTargetItemRealized = targetBudgetItem && targetBudgetItem.budget_amount > 0 
      ? unitTotal >= targetBudgetItem.budget_amount 
      : unitTotal > 0;

    setPeriodsMap((prev) => {
      const current = prev[targetTx.period_id] || currentMonthData;
      return {
        ...prev,
        [targetTx.period_id]: {
          ...current,
          real_bca_balance: newBcaBalance,
          items: current.items.map((i) =>
            i.cashflow_unit_id === targetTx.cashflow_unit_id
              ? {
                  ...i,
                  realization_amount: unitTotal,
                  projection_amount: unitTotal,
                  actual_amount: unitTotal,
                  is_realized: i.budget_amount > 0 ? unitTotal >= i.budget_amount : unitTotal > 0,
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
          is_realized: isTargetItemRealized,
        })
        .eq("period_id", targetTx.period_id)
        .eq("cashflow_unit_id", targetTx.cashflow_unit_id)
        .then(({ error }) => {
          if (error) console.error("Supabase sync item on delete tx error:", error.message);
        });

      // Restore bank balance in Supabase budget_periods
      supabase
        .from("budget_periods")
        .update({
          real_bca_balance: newBcaBalance,
        })
        .eq("period_month", targetTx.period_id)
        .then(({ error }) => {
          if (error) console.error("Supabase restore bank balance on tx delete error:", error.message);
        });
    }

    // Broadcast instant delete to all other open screens (Web, Mobile, etc.)
    broadcastSync({
      type: "TX_DELETED",
      txId,
      periodId: targetTx.period_id,
      cashflowUnitId: targetTx.cashflow_unit_id,
      unitTotal,
      newBcaBalance,
      linkedAssetUpdate,
    });
  };

  // 11. Payroll & Payday Engine Actions
  const updatePayrollSettings = (newSettings: Partial<PayrollSettings>) => {
    setPayrollSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem("ninetally_payroll_settings", JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save payroll settings", e);
      }

      if (isSupabaseConfigured) {
        supabase
          .from("payroll_settings")
          .upsert({
            id: "default",
            monthly_salary: updated.monthly_salary,
            payday_day: updated.payday_day,
            is_last_day: updated.is_last_day,
            target_bank: updated.target_bank,
            target_unit_id: updated.target_unit_id,
            auto_post_transaction: updated.auto_post_transaction,
            next_month_allocation: updated.next_month_allocation,
            last_posted_period: updated.last_posted_period || null,
            updated_at: new Date().toISOString(),
          })
          .then(({ error }) => {
            if (error) console.warn("Supabase upsert payroll_settings error/skipped:", error.message);
          });
      }

      broadcastSync({
        type: "PAYROLL_SETTINGS_UPDATED",
        payrollSettings: updated,
      });

      return updated;
    });
  };

  const triggerPaydayExecution = (customMonthKey?: string) => {
    const targetPeriod = customMonthKey || selectedMonth || getCurrentMonthKey();
    const targetSalary = payrollSettings.monthly_salary;
    const targetUnitId = payrollSettings.target_unit_id || "cf-inc-1";
    const targetUnit = cashflowUnits.find((u) => u.id === targetUnitId) || cashflowUnits.find((u) => u.unit_type === "INCOME");
    const actualUnitId = targetUnit ? targetUnit.id : targetUnitId;

    // Check if payroll transaction already exists for targetPeriod
    const existingTx = transactions.find(
      (t) => t.period_id === targetPeriod && t.cashflow_unit_id === actualUnitId
    );

    let txAdded = false;
    if (!existingTx) {
      const todayStr = new Date().toISOString().split("T")[0];
      addTransaction({
        period_id: targetPeriod,
        cashflow_unit_id: actualUnitId,
        amount: targetSalary,
        date: todayStr,
        notes: `Gaji Bulanan (${targetPeriod}) - Payday Engine`,
      });
      txAdded = true;
    }

    // Live on Last Month's Income: allocate salary to next month's salary_budget
    let budgetAllocated = false;
    const nextMonth = getNextMonthKey(targetPeriod);
    if (payrollSettings.next_month_allocation) {
      setPeriodsMap((prev) => {
        const existingNext = prev[nextMonth] || {
          period_month: nextMonth,
          status: "PLANNING",
          salary_budget: 0,
          additional_budget: 0,
          real_bca_balance: 0,
          real_jago_balance: 0,
          items: [],
        };
        return {
          ...prev,
          [nextMonth]: {
            ...existingNext,
            salary_budget: targetSalary,
          },
        };
      });

      if (isSupabaseConfigured) {
        supabase
          .from("budget_periods")
          .upsert(
            {
              period_month: nextMonth,
              salary_budget: targetSalary,
            },
            { onConflict: "period_month" }
          )
          .then(({ error }) => {
            if (error) console.warn("Supabase upsert next month salary budget error:", error.message);
          });
      }
      budgetAllocated = true;
    }

    // Update last_posted_period
    const updatedSettings: PayrollSettings = {
      ...payrollSettings,
      last_posted_period: targetPeriod,
    };
    setPayrollSettings(updatedSettings);

    try {
      localStorage.setItem("ninetally_payroll_settings", JSON.stringify(updatedSettings));
    } catch (e) {
      console.error("Failed to save payroll settings", e);
    }

    if (isSupabaseConfigured) {
      supabase
        .from("payroll_settings")
        .upsert({
          id: "default",
          monthly_salary: updatedSettings.monthly_salary,
          payday_day: updatedSettings.payday_day,
          is_last_day: updatedSettings.is_last_day,
          target_bank: updatedSettings.target_bank,
          target_unit_id: updatedSettings.target_unit_id,
          auto_post_transaction: updatedSettings.auto_post_transaction,
          next_month_allocation: updatedSettings.next_month_allocation,
          last_posted_period: updatedSettings.last_posted_period,
          updated_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) console.warn("Supabase upsert payroll_settings skipped/error:", error.message);
        });
    }

    broadcastSync({
      type: "PAYROLL_SETTINGS_UPDATED",
      payrollSettings: updatedSettings,
      allocatedMonth: payrollSettings.next_month_allocation ? nextMonth : undefined,
      allocatedAmount: targetSalary,
    });

    const formatNominal = (val: number) => "Rp " + val.toLocaleString("id-ID");

    return {
      success: true,
      message: txAdded 
        ? `Gaji ${targetPeriod} (${formatNominal(targetSalary)}) berhasil dicatat ke ${payrollSettings.target_bank}${budgetAllocated ? ` & dialokasikan jadi budget ${nextMonth}!` : '!'}`
        : `Gaji ${targetPeriod} sudah pernah dicatat di transaksi. Alokasi budget ${nextMonth} dipastikan tersinkronisasi (${formatNominal(targetSalary)}).`,
      txAdded,
      budgetAllocated,
    };
  };

  // Auto-Payday Engine execution check
  const hasCheckedPaydayRef = useRef(false);
  useEffect(() => {
    if (!isLoaded || hasCheckedPaydayRef.current) return;
    if (!payrollSettings.auto_post_transaction) return;

    const currentMonthKey = getCurrentMonthKey();
    if (isPaydayReached(payrollSettings)) {
      if (payrollSettings.last_posted_period !== currentMonthKey) {
        hasCheckedPaydayRef.current = true;
        const timer = setTimeout(() => {
          console.log(`[NineTally Payday Engine] Hari gajian tiba (${currentMonthKey})! Mengeksekusi auto-payroll...`);
          triggerPaydayExecution(currentMonthKey);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoaded, payrollSettings]);

  // Cloud Sync Manual Retry Action
  const retryCloudSync = async (): Promise<{ success: boolean; message?: string }> => {
    if (!isSupabaseConfigured) {
      setCloudSyncStatus("OFFLINE");
      return { success: false, message: "Kredensial database Supabase belum terkonfigurasi." };
    }
    setCloudSyncStatus("CONNECTING");
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
      if (catRes.data) setCategories(catRes.data);
      if (unitRes.data) setCashflowUnits(unitRes.data);
      if (assetRes.data) {
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
      setCloudSyncStatus("CONNECTED");
      return { success: true };
    } catch (e: any) {
      setCloudSyncStatus("ERROR");
      return { success: false, message: e.message || "Gagal menghubungi database." };
    }
  };

  // Master Data: Create Cashflow Unit (With Strict Database Error Handling)
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

    // Sanitize foreign key references:
    // Postgres enforces category foreign key ONLY when unit_type === 'EXPENSE'
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

    // Only update local state if DB successfully saved
    setCashflowUnits((prev) => [...prev, newUnit]);
    broadcastSync({ type: "MASTER_DATA_CHANGED" });
    return { success: true };
  };

  // Master Data: Update Cashflow Unit (With Strict Database Error Handling)
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

    // Update local state only after DB success
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

  // Master Data: Delete Cashflow Unit with strict validation & DB sync
  const deleteCashflowUnit = async (id: string): Promise<{ success: boolean; message?: string }> => {
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

  // Master Data: Categories / Labels CRUD with DB Error Handling
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

  // Master Data: Delete Category with validation check & DB sync
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

  // Master Data: Create Asset with DB Error Handling
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

  // Master Data: Update Asset with DB Error Handling
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

  // Master Data: Delete Asset with validation check & DB sync
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
        updateBankBalance,
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
        cloudSyncStatus,
        retryCloudSync,
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
        payrollSettings,
        updatePayrollSettings,
        triggerPaydayExecution,
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
