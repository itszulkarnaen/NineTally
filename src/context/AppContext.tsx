"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { AppContextType } from "./types";
import { availableMonths } from "./constants";
import { isUnitBasedAsset } from "@/lib/utils";
import { useMasterData } from "./hooks/useMasterData";
import { useBudgetPeriods } from "./hooks/useBudgetPeriods";
import { useTransactions } from "./hooks/useTransactions";
import { usePayrollEngine } from "./hooks/usePayrollEngine";
import { useSelfLoans } from "./hooks/useSelfLoans";
import { useCloudSync } from "./hooks/useCloudSync";

// Re-export types and constants for 100% backwards compatibility
export * from "./types";
export * from "./constants";

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Stable ref for broadcastSync to break circular dependency between cloudSync and other hooks
  const broadcastSyncRef = useRef<(payload: any) => void>(() => {});

  // 1. Master Data Hook (Assets, Cashflow Units, Categories, Wishlists)
  const masterData = useMasterData({
    broadcastSync: (payload) => broadcastSyncRef.current(payload),
    getPeriodsMap: () => budgetPeriods.periodsMap,
    getTransactions: () => transactionsHook.transactions,
  });

  // 2. Budget Periods Hook (Periods Map, Active Month, Budget Plan, Lock/Unlock)
  const budgetPeriods = useBudgetPeriods({
    cashflowUnits: masterData.cashflowUnits,
    setAssets: masterData.setAssets,
    broadcastSync: (payload) => broadcastSyncRef.current(payload),
  });

  // 3. Transactions Hook (Transaction Logging, Balance & Asset mutations)
  const transactionsHook = useTransactions({
    isCurrentMonthLocked: budgetPeriods.isCurrentMonthLocked,
    cashflowUnits: masterData.cashflowUnits,
    assets: masterData.assets,
    setAssets: masterData.setAssets,
    periodsMap: budgetPeriods.periodsMap,
    setPeriodsMap: budgetPeriods.setPeriodsMap,
    currentMonthData: budgetPeriods.currentMonthData,
    broadcastSync: (payload) => broadcastSyncRef.current(payload),
  });

  // 4. Payroll Engine Hook (Payday Scheduler & Auto-budgeting)
  const payroll = usePayrollEngine({
    selectedMonth: budgetPeriods.selectedMonth,
    cashflowUnits: masterData.cashflowUnits,
    transactions: transactionsHook.transactions,
    addTransaction: transactionsHook.addTransaction,
    setPeriodsMap: budgetPeriods.setPeriodsMap,
    broadcastSync: (payload) => broadcastSyncRef.current(payload),
    isLoaded: false, // Updated dynamically by cloudSync below
  });

  // 4b. Self-Loan Hook (Pinjam ke Diri Sendiri & Cicil Balik ke Aset)
  const selfLoansHook = useSelfLoans({
    assets: masterData.assets,
    updateAsset: masterData.updateAsset,
    currentMonthData: budgetPeriods.currentMonthData,
    updateBankBalance: budgetPeriods.updateBankBalance,
    broadcastSync: (payload) => broadcastSyncRef.current(payload),
  });

  // 5. Cloud Sync Hook (Supabase Realtime, Postgres CDC, LocalStorage persistence)
  const cloudSync = useCloudSync({
    assets: masterData.assets,
    setAssets: masterData.setAssets,
    cashflowUnits: masterData.cashflowUnits,
    setCashflowUnits: masterData.setCashflowUnits,
    categories: masterData.categories,
    setCategories: masterData.setCategories,
    wishlists: masterData.wishlists,
    setWishlists: masterData.setWishlists,
    transactions: transactionsHook.transactions,
    setTransactions: transactionsHook.setTransactions,
    periodsMap: budgetPeriods.periodsMap,
    setPeriodsMap: budgetPeriods.setPeriodsMap,
    selectedMonth: budgetPeriods.selectedMonth,
    setSelectedMonth: budgetPeriods.setSelectedMonth,
    setPayrollSettings: payroll.setPayrollSettings,
    selfLoans: selfLoansHook.selfLoans,
    setSelfLoans: selfLoansHook.setSelfLoans,
    selfLoanPayments: selfLoansHook.selfLoanPayments,
    setSelfLoanPayments: selfLoansHook.setSelfLoanPayments,
  });

  // Connect broadcastSync to cloudSync
  broadcastSyncRef.current = cloudSync.broadcastSync;

  // Keep latest assets & updateAsset in refs so background gold auto-sync never cancels on unrelated re-renders
  const latestAssetsRef = useRef(masterData.assets);
  const updateAssetRef = useRef(masterData.updateAsset);
  useEffect(() => {
    latestAssetsRef.current = masterData.assets;
    updateAssetRef.current = masterData.updateAsset;
  }, [masterData.assets, masterData.updateAsset]);

  // Auto-sync live gold price once cloud/local assets are loaded (throttled every 15 mins)
  const hasAutoSyncedGoldRef = useRef(false);
  useEffect(() => {
    if (!cloudSync.isLoaded || cloudSync.cloudSyncStatus === "CONNECTING") return;
    if (hasAutoSyncedGoldRef.current) return;

    const gramAssets = latestAssetsRef.current.filter(
      (a) => isUnitBasedAsset(a) && a.unit_name?.toLowerCase() === "gram"
    );
    if (gramAssets.length === 0) return;

    const GOLD_SYNC_INTERVAL_MS = 15 * 60 * 1000;
    let lastSyncedAt = 0;
    try {
      lastSyncedAt = Number(localStorage.getItem("scf_gold_last_sync_at") || 0);
    } catch {
      lastSyncedAt = 0;
    }

    const needsInitialPrice = gramAssets.some((a) => !a.price_per_unit || a.price_per_unit <= 0);
    if (!needsInitialPrice && Date.now() - lastSyncedAt < GOLD_SYNC_INTERVAL_MS) {
      hasAutoSyncedGoldRef.current = true;
      return;
    }

    hasAutoSyncedGoldRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/gold-price");
        if (!res.ok) return;
        const data = await res.json();
        const pricePerGram = Number(data?.pricePerGramIdr);
        if (!pricePerGram || pricePerGram <= 0) return;

        try {
          localStorage.setItem("scf_gold_last_sync_at", String(Date.now()));
        } catch {
          // ignore localStorage write failures
        }

        const currentGramAssets = latestAssetsRef.current.filter(
          (a) => isUnitBasedAsset(a) && a.unit_name?.toLowerCase() === "gram"
        );
        for (const ast of currentGramAssets) {
          if (ast.price_per_unit !== pricePerGram) {
            await updateAssetRef.current(ast.id, { price_per_unit: pricePerGram });
          }
        }
      } catch {
        // Silent background failure when offline or endpoint temporarily unavailable
      }
    })();
  }, [cloudSync.isLoaded, cloudSync.cloudSyncStatus]);

  const value: AppContextType = {
    // Data
    assets: masterData.assets,
    cashflowUnits: masterData.cashflowUnits,
    categories: masterData.categories,
    wishlists: masterData.wishlists,
    transactions: transactionsHook.transactions,
    selfLoans: selfLoansHook.selfLoans,
    selfLoanPayments: selfLoansHook.selfLoanPayments,

    // Cloud Sync
    cloudSyncStatus: cloudSync.cloudSyncStatus,
    retryCloudSync: cloudSync.retryCloudSync,

    // Payroll Engine
    payrollSettings: payroll.payrollSettings,
    updatePayrollSettings: payroll.updatePayrollSettings,
    triggerPaydayExecution: payroll.triggerPaydayExecution,

    // Multi-month State
    selectedMonth: budgetPeriods.selectedMonth,
    setSelectedMonth: budgetPeriods.setSelectedMonth,
    availableMonths,
    currentMonthData: budgetPeriods.currentMonthData,

    // Budget Actions
    addItemToCurrentMonth: budgetPeriods.addItemToCurrentMonth,
    removeItemFromCurrentMonth: budgetPeriods.removeItemFromCurrentMonth,
    updateItemBudgetAmount: budgetPeriods.updateItemBudgetAmount,
    updateMonthIncome: budgetPeriods.updateMonthIncome,
    updateBankBalance: budgetPeriods.updateBankBalance,
    saveCurrentMonthBudget: budgetPeriods.saveCurrentMonthBudget,
    copyPreviousMonthBudget: budgetPeriods.copyPreviousMonthBudget,
    getPreviousMonthUnitNominal: budgetPeriods.getPreviousMonthUnitNominal,

    // Governance
    lockCurrentMonth: budgetPeriods.lockCurrentMonth,
    unlockCurrentMonth: budgetPeriods.unlockCurrentMonth,

    // Realization & Mobile
    toggleItemRealized: budgetPeriods.toggleItemRealized,
    updateItemRealization: budgetPeriods.updateItemRealization,
    updateItemProjection: budgetPeriods.updateItemProjection,
    addTransaction: transactionsHook.addTransaction,
    updateTransaction: transactionsHook.updateTransaction,
    deleteTransaction: transactionsHook.deleteTransaction,

    // Master Data Actions
    createCashflowUnit: masterData.createCashflowUnit,
    updateCashflowUnit: masterData.updateCashflowUnit,
    deleteCashflowUnit: masterData.deleteCashflowUnit,
    createCategory: masterData.createCategory,
    updateCategory: masterData.updateCategory,
    deleteCategory: masterData.deleteCategory,
    createAsset: masterData.createAsset,
    updateAsset: masterData.updateAsset,
    deleteAsset: masterData.deleteAsset,
    toggleWishlistBought: masterData.toggleWishlistBought,

    // Self-Loan Actions
    createSelfLoan: selfLoansHook.createSelfLoan,
    repaySelfLoan: selfLoansHook.repaySelfLoan,
    deleteSelfLoan: selfLoansHook.deleteSelfLoan,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
