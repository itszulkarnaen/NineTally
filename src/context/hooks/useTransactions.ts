"use client";

import { useState } from "react";
import { CashflowTransaction, CashflowUnit, Asset } from "@/types";
import { initialTransactions } from "@/lib/mockData";
import { MonthPeriodData } from "../types";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

interface UseTransactionsOptions {
  isCurrentMonthLocked: boolean;
  cashflowUnits: CashflowUnit[];
  assets: Asset[];
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>;
  periodsMap: Record<string, MonthPeriodData>;
  setPeriodsMap: React.Dispatch<React.SetStateAction<Record<string, MonthPeriodData>>>;
  currentMonthData: MonthPeriodData;
  broadcastSync: (payload: any) => void;
}

export function useTransactions({
  isCurrentMonthLocked,
  cashflowUnits,
  assets,
  setAssets,
  periodsMap,
  setPeriodsMap,
  currentMonthData,
  broadcastSync,
}: UseTransactionsOptions) {
  const [transactions, setTransactions] = useState<CashflowTransaction[]>(initialTransactions);

  const addTransaction = (
    tx: Omit<CashflowTransaction, "id" | "created_at">,
    options?: { markSettled?: boolean }
  ) => {
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
    const wasAlreadyRealized = targetBudgetItem?.is_realized ?? false;
    const isTargetItemRealized =
      options?.markSettled !== undefined
        ? options.markSettled
        : wasAlreadyRealized ||
          (targetBudgetItem && targetBudgetItem.budget_amount > 0
            ? unitTotal >= targetBudgetItem.budget_amount
            : unitTotal > 0);

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
                  is_realized: isTargetItemRealized,
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

    broadcastSync({
      type: "TX_ADDED",
      newTx,
      periodId: tx.period_id,
      cashflowUnitId: tx.cashflow_unit_id,
      unitTotal,
      newBcaBalance,
      linkedAssetUpdate,
      isTargetItemRealized,
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
    const isTargetItemRealized =
      targetBudgetItem && targetBudgetItem.budget_amount > 0
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
          if (error) console.error("Supabase sync item realization on delete error:", error.message);
        });

      supabase
        .from("budget_periods")
        .update({
          real_bca_balance: newBcaBalance,
        })
        .eq("period_month", targetTx.period_id)
        .then(({ error }) => {
          if (error) console.error("Supabase update bank balance on delete error:", error.message);
        });
    }

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

  return {
    transactions,
    setTransactions,
    addTransaction,
    deleteTransaction,
  };
}
