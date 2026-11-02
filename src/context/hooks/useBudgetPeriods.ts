"use client";

import { useState } from "react";
import { CashflowUnit, BudgetPeriodItem, Asset } from "@/types";
import { MonthPeriodData } from "../types";
import { initialMonthsData } from "../constants";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

interface UseBudgetPeriodsOptions {
  cashflowUnits: CashflowUnit[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  broadcastSync: (payload: any) => void;
}

export function useBudgetPeriods({
  cashflowUnits,
  setAssets,
  broadcastSync,
}: UseBudgetPeriodsOptions) {
  const [periodsMap, setPeriodsMap] = useState<Record<string, MonthPeriodData>>(initialMonthsData);
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-11");

  // Read current month's structured budget data
  const currentMonthData: MonthPeriodData = periodsMap[selectedMonth] || {
    period_month: selectedMonth,
    status: "PLANNING",
    salary_budget: 10000000,
    additional_budget: 0,
    real_bca_balance: 0,
    real_jago_balance: 0,
    items: [],
  };

  const isCurrentMonthLocked = currentMonthData.status === "LOCKED";

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

  const addItemToCurrentMonth = (unitId: string, customAmount?: number) => {
    if (isCurrentMonthLocked) return;

    const unit = cashflowUnits.find((u) => u.id === unitId);
    if (!unit) return;

    let finalAmount = customAmount;
    if (finalAmount === undefined) {
      const prevNominal = getPreviousMonthUnitNominal(unitId);
      finalAmount = prevNominal !== null ? prevNominal : 100000;
    }

    setPeriodsMap((prev) => {
      const current = prev[selectedMonth] || currentMonthData;
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
                  actual_amount: newBudget,
                }
              : i
          ),
        },
      };
    });
  };

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
            actual_amount: i.realization_amount ?? i.projection_amount ?? i.budget_amount,
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

  const updateItemRealization = (itemId: string, newRealization: number) => {
    if (isCurrentMonthLocked) return;

    setPeriodsMap((prev) => {
      const current = prev[selectedMonth] || currentMonthData;
      const target = current.items.find((i) => i.id === itemId);
      if (!target) return prev;

      const currentAmount = target.realization_amount ?? target.projection_amount ?? 0;
      const diff = newRealization - currentAmount;

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
                  actual_amount: newRealization,
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

  const updateItemProjection = updateItemRealization;

  return {
    periodsMap,
    setPeriodsMap,
    selectedMonth,
    setSelectedMonth,
    currentMonthData,
    isCurrentMonthLocked,
    addItemToCurrentMonth,
    copyPreviousMonthBudget,
    removeItemFromCurrentMonth,
    updateItemBudgetAmount,
    updateMonthIncome,
    updateBankBalance,
    saveCurrentMonthBudget,
    lockCurrentMonth,
    unlockCurrentMonth,
    getPreviousMonthUnitNominal,
    toggleItemRealized,
    updateItemRealization,
    updateItemProjection,
  };
}
