"use client";

import { useState, useEffect, useRef } from "react";
import { PayrollSettings, CashflowUnit, CashflowTransaction } from "@/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { MonthPeriodData } from "../types";
import { defaultPayrollSettings, getCurrentMonthKey, getNextMonthKey, getPreviousMonthKey, isPaydayReached } from "../constants";

interface UsePayrollEngineOptions {
  selectedMonth: string;
  cashflowUnits: CashflowUnit[];
  transactions: CashflowTransaction[];
  addTransaction: (tx: Omit<CashflowTransaction, "id" | "created_at">) => void;
  setPeriodsMap: React.Dispatch<React.SetStateAction<Record<string, MonthPeriodData>>>;
  broadcastSync: (payload: any) => void;
  isLoaded: boolean;
}

export function usePayrollEngine({
  selectedMonth,
  cashflowUnits,
  transactions,
  addTransaction,
  setPeriodsMap,
  broadcastSync,
  isLoaded,
}: UsePayrollEngineOptions) {
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings>(defaultPayrollSettings);

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

      // Sync target CF Unit Gaji in current selectedMonth & rollover salary_budget
      const targetUnit =
        cashflowUnits.find((u) => u.id === updated.target_unit_id) ||
        cashflowUnits.find((u) => u.unit_type === "INCOME");
      const actualUnitId = targetUnit ? targetUnit.id : updated.target_unit_id;
      const prevMonth = getPreviousMonthKey(selectedMonth);
      const nextMonth = getNextMonthKey(selectedMonth);

      setPeriodsMap((prevMap) => {
        const currentPeriod = prevMap[selectedMonth];
        if (!currentPeriod || currentPeriod.status === "LOCKED") return prevMap;

        // Check if previous month had a specific salary item nominal
        const prevPeriod = prevMap[prevMonth];
        const prevSalaryItem = prevPeriod?.items.find((i) => i.cashflow_unit_id === actualUnitId);
        const modalForCurrentMonth =
          updated.next_month_allocation && prevSalaryItem && prevSalaryItem.budget_amount > 0
            ? prevSalaryItem.budget_amount
            : updated.monthly_salary;

        const hasIncomeItem = currentPeriod.items.some((i) => i.cashflow_unit_id === actualUnitId);
        const updatedItems = hasIncomeItem
          ? currentPeriod.items.map((i) =>
              i.cashflow_unit_id === actualUnitId
                ? {
                    ...i,
                    budget_amount: updated.monthly_salary,
                    projection_amount: updated.monthly_salary,
                    actual_amount: i.is_realized ? i.actual_amount : updated.monthly_salary,
                  }
                : i
            )
          : targetUnit
          ? [
              {
                id: `bi-${selectedMonth}-${Date.now()}`,
                period_id: selectedMonth,
                cashflow_unit_id: actualUnitId,
                budget_amount: updated.monthly_salary,
                realization_amount: 0,
                projection_amount: updated.monthly_salary,
                actual_amount: updated.monthly_salary,
                urgency: targetUnit.default_urgency || "HIGHEST",
                is_realized: false,
                sort_order: 0,
              },
              ...currentPeriod.items,
            ]
          : currentPeriod.items;

        const nextPeriod = prevMap[nextMonth] || {
          period_month: nextMonth,
          status: "PLANNING" as const,
          salary_budget: updated.monthly_salary,
          additional_budget: 0,
          real_bca_balance: 0,
          real_jago_balance: 0,
          items: [],
        };

        return {
          ...prevMap,
          [selectedMonth]: {
            ...currentPeriod,
            salary_budget: modalForCurrentMonth,
            items: updatedItems,
          },
          ...(updated.next_month_allocation
            ? {
                [nextMonth]: {
                  ...nextPeriod,
                  salary_budget: updated.monthly_salary,
                },
              }
            : {}),
        };
      });

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
    const targetUnit =
      cashflowUnits.find((u) => u.id === targetUnitId) ||
      cashflowUnits.find((u) => u.unit_type === "INCOME");
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

  return {
    payrollSettings,
    setPayrollSettings,
    updatePayrollSettings,
    triggerPaydayExecution,
  };
}
