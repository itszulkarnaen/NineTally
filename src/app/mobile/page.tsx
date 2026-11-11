"use client";

import { useState, useMemo, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { MonthPicker } from "@/components/common/MonthPicker";
import { formatRupiah } from "@/lib/utils";
import { Plus, Check } from "lucide-react";
import { CashflowTransaction } from "@/types";

import { MobileTab } from "@/components/mobile/types";
import { MobileTopBar } from "@/components/mobile/MobileTopBar";
import { MobileBalanceCarousel } from "@/components/mobile/MobileBalanceCarousel";
import { MobileNavTabs } from "@/components/mobile/MobileNavTabs";
import { TransactionsTab } from "@/components/mobile/tabs/TransactionsTab";
import { ChartTab } from "@/components/mobile/tabs/ChartTab";
import { AssetsMobileTab } from "@/components/mobile/tabs/AssetsMobileTab";
import { SelfLoanMobileTab } from "@/components/mobile/tabs/SelfLoanMobileTab";
import { WishlistTab } from "@/components/mobile/tabs/WishlistTab";
import { RecordTransactionModal } from "@/components/mobile/modals/RecordTransactionModal";
import { BankBalanceModal } from "@/components/mobile/modals/BankBalanceModal";

export default function MobilePage() {
  const {
    assets,
    cashflowUnits,
    categories,
    currentMonthData,
    wishlists,
    transactions,
    selectedMonth,
    setSelectedMonth,
    updateBankBalance,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    toggleWishlistBought,
  } = useApp();

  const [activeTab, setActiveTab] = useState<MobileTab>("transactions");

  // Privacy feature: Hide/Show Balance
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<CashflowTransaction | null>(null);
  const [txModalPreselectedUnitId, setTxModalPreselectedUnitId] = useState<string | undefined>();
  const [txModalDefaultType, setTxModalDefaultType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isSuccessToast, setIsSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("Transaksi berhasil dicatat!");

  const budgetItems = currentMonthData.items;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("scf_hide_balance");
      if (saved !== null) {
        setIsBalanceHidden(saved === "true");
      }
    } catch {}
  }, []);

  const toggleHideBalance = () => {
    setIsBalanceHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("scf_hide_balance", String(next));
      } catch {}
      return next;
    });
  };

  const maskNominal = (amount: number, hideSymbol = false) => {
    if (isBalanceHidden) {
      return hideSymbol ? "••••••••" : "Rp ••••••••";
    }
    return formatRupiah(amount);
  };

  const handleLogout = async () => {
    if (window.confirm("Yakin mau keluar dari NineTally?")) {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    }
  };

  // Net Worth Tiers Calculation
  const netWorthSummary = useMemo(() => {
    let liquid = 0;
    let semiLiquid = 0;
    let illiquid = 0;

    assets.forEach((a) => {
      if (a.liquidity_tier === "LIQUID") liquid += a.total_value;
      else if (a.liquidity_tier === "SEMI_LIQUID") semiLiquid += a.total_value;
      else if (a.liquidity_tier === "ILLIQUID") illiquid += a.total_value;
    });

    const totalDuitCok = liquid + semiLiquid + illiquid;
    return { totalDuitCok, liquid, semiLiquid, illiquid };
  }, [assets]);

  // Transactions for the currently selected month
  const monthTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.period_id === selectedMonth)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedMonth]);

  // Cashflow Metrics based on actual transactions
  const cashflowMetrics = useMemo(() => {
    const targetIncome = currentMonthData.salary_budget + currentMonthData.additional_budget;

    let realizedExpenses = 0;
    let realizedIncome = 0;
    let outcomeCount = 0;
    let incomeCount = 0;

    monthTransactions.forEach((t) => {
      const unit = cashflowUnits.find((u) => u.id === t.cashflow_unit_id);
      if (unit?.unit_type === "INCOME") {
        realizedIncome += t.amount;
        incomeCount++;
      } else {
        realizedExpenses += t.amount;
        outcomeCount++;
      }
    });

    const sisaAnggaran = targetIncome - realizedExpenses;
    const netCashflow = realizedIncome - realizedExpenses;
    const realTotalCash = currentMonthData.real_bca_balance + currentMonthData.real_jago_balance;

    return {
      totalIncome: targetIncome,
      realizedSum: realizedExpenses,
      realizedIncome,
      netCashflow,
      outcomeCount,
      incomeCount,
      sisaAnggaran,
      realTotalCash,
    };
  }, [monthTransactions, currentMonthData, cashflowUnits]);

  // Chart Data dynamically sourced from master categories (expenses only)
  const chartData = useMemo(() => {
    const catMap = new Map(categories.map((c) => [c.code, c]));
    const categoryTotals: Record<string, number> = {};

    monthTransactions.forEach((tx) => {
      const unit = cashflowUnits.find((u) => u.id === tx.cashflow_unit_id);
      if (unit?.unit_type === "INCOME") return;
      if (unit?.category) {
        categoryTotals[unit.category] = (categoryTotals[unit.category] || 0) + tx.amount;
      }
    });

    return Object.entries(categoryTotals)
      .filter(([, val]) => val > 0)
      .map(([code, val]) => {
        const cat = catMap.get(code);
        return {
          name: cat?.name || code,
          value: val,
          color: cat?.color || "#2196F3",
        };
      });
  }, [monthTransactions, cashflowUnits, categories]);

  const openTxModal = (preselectedUnitId?: string, defaultType: "EXPENSE" | "INCOME" = "EXPENSE") => {
    setEditingTx(null);
    setTxModalPreselectedUnitId(preselectedUnitId);
    setTxModalDefaultType(defaultType);
    setIsTxModalOpen(true);
  };

  const handleEditTransaction = (tx: CashflowTransaction) => {
    setEditingTx(tx);
    setTxModalPreselectedUnitId(undefined);
    setIsTxModalOpen(true);
  };

  const handleSaveTransaction = (
    data: {
      period_id: string;
      cashflow_unit_id: string;
      amount: number;
      date: string;
      notes?: string;
    },
    options?: { markSettled?: boolean },
    editingTxId?: string
  ) => {
    if (editingTxId) {
      updateTransaction(editingTxId, data, options);
      setToastMessage(
        options?.markSettled
          ? "Transaksi diperbarui & pos ditandai selesai!"
          : "Transaksi berhasil diperbarui!"
      );
    } else {
      addTransaction(data, options);
      setToastMessage(
        options?.markSettled
          ? "Transaksi dicatat & pos ditandai selesai!"
          : "Transaksi berhasil dicatat!"
      );
    }
    setEditingTx(null);
    setIsTxModalOpen(false);
    setIsSuccessToast(true);
    setTimeout(() => setIsSuccessToast(false), 2500);
  };

  const handleSaveBankBalance = (bca: number, jago: number) => {
    updateBankBalance(bca, jago);
    setIsBankModalOpen(false);
    setToastMessage("Saldo bank berhasil disimpan!");
    setIsSuccessToast(true);
    setTimeout(() => setIsSuccessToast(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#E3F2FD] pb-24 text-[#242921]">
      {/* Top Mobile Bar */}
      <MobileTopBar onLogout={handleLogout} />

      <div className="max-w-md mx-auto px-4 pt-3 space-y-4">
        {/* Month Picker */}
        <div className="flex justify-center">
          <MonthPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            className="w-full justify-center"
          />
        </div>

        {/* 1. Header Balance Cards Carousel & Monthly Cashflow Card */}
        <MobileBalanceCarousel
          bcaBalance={currentMonthData.real_bca_balance}
          onOpenBankModal={() => setIsBankModalOpen(true)}
          isBalanceHidden={isBalanceHidden}
          toggleHideBalance={toggleHideBalance}
          maskNominal={maskNominal}
          cashflowMetrics={cashflowMetrics}
          netWorthSummary={netWorthSummary}
        />

        {/* 2. Sub Tabs Navigation */}
        <MobileNavTabs activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* 3. Tab Contents */}
        {activeTab === "transactions" && (
          <TransactionsTab
            budgetItems={budgetItems}
            cashflowUnits={cashflowUnits}
            monthTransactions={monthTransactions}
            selectedMonth={selectedMonth}
            onOpenTxModal={openTxModal}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={deleteTransaction}
          />
        )}

        {activeTab === "chart" && (
          <ChartTab
            chartData={chartData}
            monthTransactionsCount={monthTransactions.length}
          />
        )}

        {activeTab === "assets" && <AssetsMobileTab assets={assets} />}

        {activeTab === "loan" && (
          <SelfLoanMobileTab
            onShowToast={(msg) => {
              setToastMessage(msg);
              setIsSuccessToast(true);
              setTimeout(() => setIsSuccessToast(false), 3000);
            }}
          />
        )}

        {activeTab === "wishlist" && (
          <WishlistTab
            wishlists={wishlists}
            toggleWishlistBought={toggleWishlistBought}
          />
        )}
      </div>

      {/* Floating Action Button (FAB) for quick logging */}
      {activeTab === "transactions" && (
        <button
          onClick={() => openTxModal()}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#2196F3] hover:bg-[#1E88E5] text-white rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-90 z-30 cursor-pointer"
          title="Catat Transaksi"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>
      )}

      {/* Success Feedback Toast */}
      {isSuccessToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#2196F3] text-white px-4 py-2 rounded-2xl shadow-lg text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal: Catat & Edit Transaksi */}
      <RecordTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        budgetItems={budgetItems}
        cashflowUnits={cashflowUnits}
        preselectedUnitId={txModalPreselectedUnitId}
        defaultType={txModalDefaultType}
        selectedMonth={selectedMonth}
        editingTransaction={editingTx}
        onSaveTransaction={handleSaveTransaction}
      />

      {/* Modal: Update Saldo Bank */}
      <BankBalanceModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        selectedMonth={selectedMonth}
        currentBca={currentMonthData.real_bca_balance || 0}
        currentJago={currentMonthData.real_jago_balance || 0}
        onSaveBankBalance={handleSaveBankBalance}
      />
    </div>
  );
}
