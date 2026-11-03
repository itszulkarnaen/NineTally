"use client";

import { useState, useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  Asset,
  BudgetPeriodItem,
  CashflowCategory,
  CashflowTransaction,
  CashflowUnit,
  WishlistItem,
  PayrollSettings,
} from "@/types";
import { MonthPeriodData, CloudSyncStatus } from "../types";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

interface UseCloudSyncOptions {
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  cashflowUnits: CashflowUnit[];
  setCashflowUnits: React.Dispatch<React.SetStateAction<CashflowUnit[]>>;
  categories: CashflowCategory[];
  setCategories: React.Dispatch<React.SetStateAction<CashflowCategory[]>>;
  wishlists: WishlistItem[];
  setWishlists: React.Dispatch<React.SetStateAction<WishlistItem[]>>;
  transactions: CashflowTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<CashflowTransaction[]>>;
  periodsMap: Record<string, MonthPeriodData>;
  setPeriodsMap: React.Dispatch<React.SetStateAction<Record<string, MonthPeriodData>>>;
  selectedMonth: string;
  setSelectedMonth: React.Dispatch<React.SetStateAction<string>>;
  setPayrollSettings: React.Dispatch<React.SetStateAction<PayrollSettings>>;
}

export function useCloudSync({
  assets,
  setAssets,
  cashflowUnits,
  setCashflowUnits,
  categories,
  setCategories,
  wishlists,
  setWishlists,
  transactions,
  setTransactions,
  periodsMap,
  setPeriodsMap,
  selectedMonth,
  setSelectedMonth,
  setPayrollSettings,
}: UseCloudSyncOptions) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>(
    !isSupabaseConfigured
      ? "OFFLINE"
      : typeof navigator !== "undefined" && !navigator.onLine
      ? "OFFLINE"
      : "CONNECTING"
  );

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
                        : Number(item.budget_amount) > 0
                        ? txSum >= Number(item.budget_amount)
                        : txSum > 0,
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

  // Save to localStorage on change
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

  // Realtime WebSocket Sync
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase.channel("ninetally-realtime-sync", {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "NINETALLY_SYNC" }, (msg) => {
      const payload = msg.payload;
      if (!payload || !payload.type) return;

      if (payload.type === "TX_ADDED") {
        const { newTx, unitTotal, newBcaBalance, linkedAssetUpdate, isTargetItemRealized } = payload;
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
                      is_realized:
                        isTargetItemRealized !== undefined
                          ? isTargetItemRealized
                          : i.budget_amount > 0
                          ? unitTotal >= i.budget_amount
                          : true,
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

      if (payload.type === "TX_UPDATED") {
        const {
          updatedTx,
          periodId,
          cashflowUnitId,
          unitTotal,
          oldCashflowUnitId,
          oldUnitTotal,
          newBcaBalance,
          linkedAssetUpdate,
          isTargetItemRealized,
        } = payload;

        setTransactions((prev) =>
          prev.map((t) => (t.id === updatedTx.id ? updatedTx : t))
        );

        setPeriodsMap((prev) => {
          const period = prev[periodId];
          if (!period) return prev;
          return {
            ...prev,
            [periodId]: {
              ...period,
              real_bca_balance: newBcaBalance !== undefined ? newBcaBalance : period.real_bca_balance,
              items: period.items.map((i) => {
                if (i.cashflow_unit_id === cashflowUnitId) {
                  return {
                    ...i,
                    realization_amount: unitTotal,
                    projection_amount: unitTotal,
                    actual_amount: unitTotal,
                    is_realized:
                      isTargetItemRealized !== undefined
                        ? isTargetItemRealized
                        : i.budget_amount > 0
                        ? unitTotal >= i.budget_amount
                        : true,
                  };
                }
                if (oldCashflowUnitId && i.cashflow_unit_id === oldCashflowUnitId) {
                  return {
                    ...i,
                    realization_amount: oldUnitTotal,
                    projection_amount: oldUnitTotal,
                    actual_amount: oldUnitTotal,
                    is_realized: i.budget_amount > 0 ? oldUnitTotal >= i.budget_amount : oldUnitTotal > 0,
                  };
                }
                return i;
              }),
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

  const retryCloudSync = async (): Promise<{ success: boolean; message?: string }> => {
    if (!isSupabaseConfigured) {
      setCloudSyncStatus("OFFLINE");
      return { success: false, message: "Kredensial Supabase (.env.local) belum dikonfigurasi." };
    }
    setCloudSyncStatus("CONNECTING");

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

      if (catRes.data) setCategories(catRes.data);
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
      if (unitRes.data) setCashflowUnits(unitRes.data);
      if (wlRes.data) {
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

      if (txRes.data) setTransactions(liveTransactions);

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
                    : Number(item.budget_amount) > 0
                    ? txSum >= Number(item.budget_amount)
                    : txSum > 0,
                  notes: item.notes || undefined,
                  sort_order: Number(item.sort_order) || 0,
                };
              }),
          };
        });
        setPeriodsMap((prev) => ({ ...prev, ...periodsDictionary }));
      }

      setCloudSyncStatus("CONNECTED");
      return { success: true, message: "Sinkronisasi cloud database berhasil!" };
    } catch (err: any) {
      setCloudSyncStatus("ERROR");
      return { success: false, message: `Gagal sinkronisasi: ${err.message || "Error tidak diketahui"}` };
    }
  };

  return {
    isLoaded,
    cloudSyncStatus,
    broadcastSync,
    retryCloudSync,
  };
}
