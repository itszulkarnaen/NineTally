"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useApp } from "@/context/AppContext";
import { formatRupiah } from "@/lib/utils";
import { 
  Check, 
  Lock, 
  PieChart as PieChartIcon, 
  Wallet, 
  Layers, 
  Gift, 
  Sparkles,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  Receipt,
  Plus,
  Trash2,
  Calendar,
  X,
  FileText,
  AlertCircle,
  Search,
  Loader2,
  Eye,
  EyeOff,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  LogOut,
  Pencil,
  ChevronDown
} from "lucide-react";
import { MonthPicker } from "@/components/common/MonthPicker";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { ExpenseCategory, UrgencyLevel, CashflowTransaction } from "@/types";

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
    toggleItemRealized, 
    updateItemRealization,
    updateBankBalance,
    addTransaction,
    deleteTransaction,
    toggleWishlistBought
  } = useApp();

  const [activeTab, setActiveTab] = useState<"transactions" | "chart" | "assets" | "wishlist">("transactions");
  const [transactionView, setTransactionView] = useState<"items" | "history">("items");
  const [selectedPosFilter, setSelectedPosFilter] = useState<string>("ALL");

  // Search & Infinite Scroll pagination for Cashflow Items
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleItemLimit, setVisibleItemLimit] = useState(10);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  // Accordion expansion state for Cashflow Unit items (default collapsed = 1 baris)
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});
  const toggleItemExpand = (id: string) => {
    setExpandedItemIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Form modal state for recording transaction
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txType, setTxType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [txNominal, setTxNominal] = useState<number>(0);
  const [txUnitId, setTxUnitId] = useState<string>("");
  const [txUnitSearch, setTxUnitSearch] = useState<string>("");
  const [txNotes, setTxNotes] = useState<string>("");
  const [txDate, setTxDate] = useState<string>("");
  const [isSuccessToast, setIsSuccessToast] = useState(false);

  // Privacy feature: Hide/Show Balance
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  // Bank Balance Modal State
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [inputBcaBalance, setInputBcaBalance] = useState<number>(0);
  const [inputJagoBalance, setInputJagoBalance] = useState<number>(0);

  const openBankModal = () => {
    setInputBcaBalance(currentMonthData.real_bca_balance || 0);
    setInputJagoBalance(currentMonthData.real_jago_balance || 0);
    setIsBankModalOpen(true);
  };

  const handleSaveBankBalance = (e: React.FormEvent) => {
    e.preventDefault();
    updateBankBalance(inputBcaBalance, inputJagoBalance);
    setIsBankModalOpen(false);
    setIsSuccessToast(true);
    setTimeout(() => setIsSuccessToast(false), 2500);
  };

  React.useEffect(() => {
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

  // Initialize date on client mount
  React.useEffect(() => {
    setTxDate(new Date().toISOString().slice(0, 10));
  }, []);

  const isLocked = currentMonthData.status === "LOCKED";
  const budgetItems = currentMonthData.items;

  // Sort budget items by Priority (HIGHEST > HIGH > NORMAL), then sort_order, then name
  const sortedBudgetItems = useMemo(() => {
    const urgencyRank: Record<string, number> = {
      HIGHEST: 1,
      HIGH: 2,
      NORMAL: 3,
    };

    return [...budgetItems].sort((a, b) => {
      const rankA = a.urgency ? (urgencyRank[a.urgency] ?? 99) : 99;
      const rankB = b.urgency ? (urgencyRank[b.urgency] ?? 99) : 99;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      }
      const unitA = cashflowUnits.find((u) => u.id === a.cashflow_unit_id)?.name || "";
      const unitB = cashflowUnits.find((u) => u.id === b.cashflow_unit_id)?.name || "";
      return unitA.localeCompare(unitB);
    });
  }, [budgetItems, cashflowUnits]);

  // Filter and search Cashflow Items (inheriting priority sorting)
  const filteredBudgetItems = useMemo(() => {
    if (!searchQuery.trim()) return sortedBudgetItems;
    const q = searchQuery.toLowerCase().trim();
    return sortedBudgetItems.filter((item) => {
      const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
      return (
        unit?.name.toLowerCase().includes(q) ||
        unit?.code.toLowerCase().includes(q) ||
        unit?.category?.toLowerCase().includes(q)
      );
    });
  }, [sortedBudgetItems, cashflowUnits, searchQuery]);

  // Paginated visible Cashflow Items (starts with 10, loads 10 more on scroll)
  const displayedBudgetItems = useMemo(() => {
    return filteredBudgetItems.slice(0, visibleItemLimit);
  }, [filteredBudgetItems, visibleItemLimit]);

  // Reset pagination limit & accordion when search query or month changes
  React.useEffect(() => {
    setVisibleItemLimit(10);
  }, [searchQuery]);

  React.useEffect(() => {
    setVisibleItemLimit(10);
    setExpandedItemIds({});
  }, [selectedMonth]);

  // Infinite Scroll IntersectionObserver trigger
  React.useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleItemLimit((prev) => {
            if (prev < filteredBudgetItems.length) {
              return prev + 10;
            }
            return prev;
          });
        }
      },
      { threshold: 0.1, rootMargin: "150px" }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [filteredBudgetItems.length]);

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

  // Cashflow Metrics based on actual transactions (Separates Expenses & Dynamic Inflows)
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
      realTotalCash 
    };
  }, [monthTransactions, currentMonthData, cashflowUnits]);

  // Chart Data with Earth & Sage Palette - DYNAMICALLY SOURCED FROM MASTER CATEGORIES (EXPENSES ONLY)
  const chartData = useMemo(() => {
    const catMap = new Map(categories.map((c) => [c.code, c]));
    const categoryTotals: Record<string, number> = {};

    // Calculate distribution purely from EXPENSE transactions logged this month
    monthTransactions.forEach((tx) => {
      const unit = cashflowUnits.find((u) => u.id === tx.cashflow_unit_id);
      if (unit?.unit_type === "INCOME") return; // Skip income in outcome chart!
      if (unit?.category) {
        categoryTotals[unit.category] = (categoryTotals[unit.category] || 0) + tx.amount;
      }
    });

    return Object.entries(categoryTotals)
      .filter(([_, val]) => val > 0)
      .map(([code, val]) => {
        const cat = catMap.get(code);
        return {
          name: cat?.name || code,
          value: val,
          color: cat?.color || "#2196F3",
        };
      });
  }, [monthTransactions, cashflowUnits, categories]);

  // Filtered transactions if user filters by cashflow item
  const filteredTransactions = useMemo(() => {
    if (selectedPosFilter === "ALL") return monthTransactions;
    return monthTransactions.filter((t) => t.cashflow_unit_id === selectedPosFilter);
  }, [monthTransactions, selectedPosFilter]);

  // Search filter for modal Cashflow Unit selection (Expenses)
  const filteredModalBudgetItems = useMemo(() => {
    const isSearching = Boolean(txUnitSearch.trim());
    const q = txUnitSearch.toLowerCase().trim();

    return budgetItems.filter((item) => {
      const spent = item.realization_amount ?? item.projection_amount ?? 0;
      const isHundredPercent = (item.budget_amount > 0 && spent >= item.budget_amount) || item.is_realized;

      // 1. If NOT searching: hide items that have reached 100% budget!
      if (!isSearching && isHundredPercent) {
        return false;
      }

      // 2. If NOT searching and not 100%: include it
      if (!isSearching) return true;

      // 3. If searching: search across ALL items (including 100% ones)
      const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
      return (
        unit?.name.toLowerCase().includes(q) ||
        unit?.code.toLowerCase().includes(q)
      );
    });
  }, [budgetItems, cashflowUnits, txUnitSearch]);

  const selectedBudgetItem = useMemo(() => {
    return budgetItems.find((i) => i.cashflow_unit_id === txUnitId);
  }, [budgetItems, txUnitId]);

  // Search filter for modal Income Unit selection
  const filteredModalIncomeUnits = useMemo(() => {
    const incUnits = cashflowUnits.filter((u) => u.unit_type === "INCOME" && u.is_active);
    if (!txUnitSearch.trim()) return incUnits;
    const q = txUnitSearch.toLowerCase().trim();
    return incUnits.filter(
      (u) => u.name.toLowerCase().includes(q) || u.code.toLowerCase().includes(q)
    );
  }, [cashflowUnits, txUnitSearch]);

  const selectedIncomeUnit = useMemo(() => {
    return cashflowUnits.find((u) => u.id === txUnitId && u.unit_type === "INCOME");
  }, [cashflowUnits, txUnitId]);

  // Open transaction modal
  const openTxModal = (preselectedUnitId?: string, defaultType: "EXPENSE" | "INCOME" = "EXPENSE") => {
    if (isLocked) return;
    setTxType(defaultType);
    if (defaultType === "EXPENSE") {
      if (preselectedUnitId) {
        setTxUnitId(preselectedUnitId);
      } else if (budgetItems.length > 0) {
        // Find the first uncompleted item (not 100% reached yet)
        const uncompletedItem = budgetItems.find((item) => {
          const spent = item.realization_amount ?? item.projection_amount ?? 0;
          return !( (item.budget_amount > 0 && spent >= item.budget_amount) || item.is_realized );
        });
        setTxUnitId(uncompletedItem ? uncompletedItem.cashflow_unit_id : budgetItems[0].cashflow_unit_id);
      }
    } else {
      const incUnits = cashflowUnits.filter((u) => u.unit_type === "INCOME" && u.is_active);
      if (preselectedUnitId) {
        setTxUnitId(preselectedUnitId);
      } else if (incUnits.length > 0) {
        setTxUnitId(incUnits[0].id);
      }
    }
    setTxNominal(0);
    setTxNotes("");
    setTxUnitSearch("");
    setTxDate(new Date().toISOString().slice(0, 10));
    setIsTxModalOpen(true);
  };

  const handleLogout = async () => {
    if (window.confirm("Yakin mau keluar dari NineTally?")) {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    }
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (txNominal <= 0 || !txUnitId || isLocked) return;

    addTransaction({
      period_id: selectedMonth,
      cashflow_unit_id: txUnitId,
      amount: txNominal,
      date: txDate,
      notes: txNotes.trim() || undefined,
    });

    setIsTxModalOpen(false);
    setIsSuccessToast(true);
    setTimeout(() => setIsSuccessToast(false), 2500);
  };

  const getUrgencyPill = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case "HIGHEST":
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">HIGHEST</span>;
      case "HIGH":
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">HIGH</span>;
      case "NORMAL":
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#2196F3]/15 text-[#2196F3] border border-[#2196F3]/30">NORMAL</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#E3F2FD] pb-24 text-[#242921]">
      {/* Top Mobile Bar with Custom App Icon & Switch to Web */}
      <div className="sticky top-0 z-40 bg-[#FFFFFF]/90 backdrop-blur border-b border-[#EEEEEE] px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-xl overflow-hidden shadow-xs border border-[#EEEEEE] shrink-0">
            <Image
              src="/NineTally.png"
              alt="NineTally Icon"
              fill
              sizes="32px"
              className="object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-xs font-bold text-[#242921]">NineTally</h1>
            <p className="text-[10px] text-[#666E61]">Self Cash Flow</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
              isLocked
                ? "bg-amber-100 text-amber-800 border border-amber-200"
                : currentMonthData.status === "ACTIVE"
                ? "bg-[#2196F3]/15 text-[#2196F3] border border-[#2196F3]/30"
                : "bg-blue-100 text-blue-800 border border-blue-200"
            }`}
          >
            {isLocked ? <Lock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
            {currentMonthData.status}
          </span>
          <button
            onClick={handleLogout}
            title="Keluar / Logout"
            className="p-1.5 rounded-xl bg-[#E3F2FD] hover:bg-rose-100 hover:text-rose-700 transition text-[#666E61]"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-3 space-y-4">
        {/* Month Picker in Mobile Container */}
        <div className="flex justify-center">
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} className="w-full justify-center" />
        </div>

        {/* Immutability Banner if Locked */}
        {isLocked && (
          <div className="bg-amber-100/80 border border-amber-300 rounded-2xl p-3 flex items-center gap-2.5 text-amber-900 text-xs">
            <Lock className="w-4 h-4 shrink-0 text-amber-700" />
            <span>
              <strong>Periode Terkunci (Actual).</strong> Data bulan ini bersifat <em>Read-Only</em> di mobile.
            </span>
          </div>
        )}

        {/* 1. Header Carousel: 3 Professional Cards with Privacy Toggle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-bold text-[#666E61] uppercase tracking-wider text-[11px]">
              Ringkasan Finansial
            </span>
            <button
              onClick={toggleHideBalance}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#666E61] hover:text-[#242921] px-2 py-0.5 rounded-lg bg-[#FFFFFF] border border-[#EEEEEE] transition shadow-2xs"
            >
              {isBalanceHidden ? (
                <>
                  <EyeOff className="w-3 h-3 text-[#2196F3]" />
                  <span>Buka Saldo</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3 text-[#666E61]" />
                  <span>Tutup Saldo</span>
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto no-scrollbar flex gap-3 snap-x snap-mandatory -mx-4 px-4 pb-1">
            {/* Card 1: Bank Balance (BCA) */}
            <div className="w-[84vw] max-w-[320px] shrink-0 snap-center bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-[#666E61]">
                  <span className="font-bold tracking-wider text-[11px] uppercase text-[#2196F3] flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5" /> Bank Balance
                  </span>
                  <span className="text-[10px] bg-[#2196F3]/15 text-[#2196F3] px-2 py-0.5 rounded-full font-bold border border-[#2196F3]/20">
                    BCA Utama
                  </span>
                </div>
                <div className="my-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight text-[#242921]">
                      {maskNominal(currentMonthData.real_bca_balance)}
                    </h2>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={openBankModal}
                        className="p-1.5 text-[#2196F3] hover:bg-[#E3F2FD] transition rounded-md"
                        title="Update Saldo Rekening"
                        aria-label="Update Saldo Rekening"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={toggleHideBalance}
                        className="p-1 text-[#666E61] hover:text-[#242921] transition rounded-md"
                        title={isBalanceHidden ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
                        aria-label="Toggle Saldo"
                      >
                        {isBalanceHidden ? <EyeOff className="w-4 h-4 text-[#2196F3]" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-[#666E61] flex items-center justify-between border-t border-[#EEEEEE] pt-2 font-medium">
                <span>Saldo Rekening Operasional</span>
                <span className="text-[10px] bg-[#E3F2FD] px-1.5 py-0.5 rounded text-[#666E61] font-semibold">
                  Liquid Cash
                </span>
              </div>
            </div>

            {/* Card 2: Nominal Outcome */}
            <div className="w-[84vw] max-w-[320px] shrink-0 snap-center bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-[#666E61]">
                  <span className="font-bold tracking-wider text-[11px] uppercase text-rose-700 flex items-center gap-1.5">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600" /> Nominal Outcome
                  </span>
                  <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                    {cashflowMetrics.outcomeCount} Pengeluaran
                  </span>
                </div>
                <div className="my-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight text-[#242921]">
                      {maskNominal(cashflowMetrics.realizedSum)}
                    </h2>
                    <button
                      onClick={toggleHideBalance}
                      className="p-1 text-[#666E61] hover:text-[#242921] transition rounded-md"
                      title={isBalanceHidden ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
                      aria-label="Toggle Saldo"
                    >
                      {isBalanceHidden ? <EyeOff className="w-4 h-4 text-[#2196F3]" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-[#666E61] flex items-center justify-between border-t border-[#EEEEEE] pt-2 font-medium">
                <span>Total Realisasi Pengeluaran</span>
                <span className="text-[10px] text-[#2196F3] font-bold">
                  {cashflowMetrics.totalIncome > 0
                    ? `${Math.round((cashflowMetrics.realizedSum / cashflowMetrics.totalIncome) * 100)}% Budget`
                    : "0%"}
                </span>
              </div>
            </div>

            {/* Card 3: Assets */}
            <div className="w-[84vw] max-w-[320px] shrink-0 snap-center bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-[#666E61]">
                  <span className="font-bold tracking-wider text-[11px] uppercase text-[#2196F3] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Assets
                  </span>
                  <span className="text-[10px] bg-[#E3F2FD] px-2 py-0.5 rounded-full font-semibold text-[#666E61]">
                    Net Worth
                  </span>
                </div>
                <div className="my-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight text-[#242921]">
                      {maskNominal(netWorthSummary.totalDuitCok)}
                    </h2>
                    <button
                      onClick={toggleHideBalance}
                      className="p-1 text-[#666E61] hover:text-[#242921] transition rounded-md"
                      title={isBalanceHidden ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
                      aria-label="Toggle Saldo"
                    >
                      {isBalanceHidden ? <EyeOff className="w-4 h-4 text-[#2196F3]" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-[#666E61] flex justify-between border-t border-[#EEEEEE] pt-2 font-medium">
                <span>Cair: {maskNominal(netWorthSummary.liquid, true)}</span>
                <span>Beku: {maskNominal(netWorthSummary.illiquid, true)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Monthly Cashflow Summary Card (Option A: Target vs Real Inflow & Outflow) */}
        <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-[#666E61] font-medium block text-[11px]">Target Pemasukan</span>
              <span className="font-bold text-sm text-[#242921]">{maskNominal(cashflowMetrics.totalIncome)}</span>
            </div>
            <div className="text-right">
              <span className="text-[#666E61] font-medium block text-[11px]">Pemasukan Riil</span>
              <span className={`font-bold text-sm ${cashflowMetrics.realizedIncome > 0 ? "text-emerald-600" : "text-[#666E61]"}`}>
                {cashflowMetrics.realizedIncome > 0 ? `+${maskNominal(cashflowMetrics.realizedIncome)}` : "Rp 0"}
              </span>
            </div>
          </div>

          {/* Visual Progress Bar (Expense vs Target Budget) */}
          <div className="space-y-1.5">
            <div className="w-full bg-[#EEEEEE] h-2.5 rounded-full overflow-hidden flex">
              <div 
                className="bg-[#2196F3] h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (cashflowMetrics.realizedSum / (cashflowMetrics.totalIncome || 1)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-medium">
              <span className="text-rose-600">Terpakai: {maskNominal(cashflowMetrics.realizedSum)}</span>
              <span className="text-[#666E61]">Sisa Pagu: {maskNominal(cashflowMetrics.sisaAnggaran)}</span>
            </div>
          </div>

          {/* Net Cashflow Riil (Inflow - Outflow) */}
          {cashflowMetrics.realizedIncome > 0 && (
            <div className="pt-2 border-t border-[#EEEEEE] flex items-center justify-between text-[11px]">
              <span className="text-[#666E61]">Net Cashflow Riil (In - Out):</span>
              <span className={`font-bold px-2 py-0.5 rounded-md ${
                cashflowMetrics.netCashflow >= 0
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}>
                {cashflowMetrics.netCashflow >= 0 ? "+" : ""}{maskNominal(cashflowMetrics.netCashflow)}
              </span>
            </div>
          )}
        </div>

        {/* 3. Sub Tabs Navigation */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl shadow-xs">
          <button
            onClick={() => setActiveTab("transactions")}
            className={`py-2 text-xs font-semibold rounded-xl flex flex-col items-center gap-1 transition ${
              activeTab === "transactions" ? "bg-[#2196F3] text-white shadow-xs" : "text-[#666E61]"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Transaksi</span>
          </button>
          <button
            onClick={() => setActiveTab("chart")}
            className={`py-2 text-xs font-semibold rounded-xl flex flex-col items-center gap-1 transition ${
              activeTab === "chart" ? "bg-[#2196F3] text-white shadow-xs" : "text-[#666E61]"
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
            <span>Outcome</span>
          </button>
          <button
            onClick={() => setActiveTab("assets")}
            className={`py-2 text-xs font-semibold rounded-xl flex flex-col items-center gap-1 transition ${
              activeTab === "assets" ? "bg-[#2196F3] text-white shadow-xs" : "text-[#666E61]"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Aset</span>
          </button>
          <button
            onClick={() => setActiveTab("wishlist")}
            className={`py-2 text-xs font-semibold rounded-xl flex flex-col items-center gap-1 transition ${
              activeTab === "wishlist" ? "bg-[#2196F3] text-white shadow-xs" : "text-[#666E61]"
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>Wishlist</span>
          </button>
        </div>

        {/* 4. Tab Contents */}

        {/* TAB 1: TRANSAKSI (CATAT PENGELUARAN REALISASI) */}
        {activeTab === "transactions" && (
          <div className="space-y-3">
            {/* View Mode Switcher: Cashflow Items vs Riwayat Log */}
            <div className="flex items-center justify-between p-1 bg-[#FFFFFF] border border-[#EEEEEE] rounded-xl text-xs">
              <button
                onClick={() => setTransactionView("items")}
                className={`flex-1 py-1.5 rounded-lg font-bold transition text-center ${
                  transactionView === "items"
                    ? "bg-[#E3F2FD] text-[#242921] shadow-2xs"
                    : "text-[#666E61] hover:text-[#242921]"
                }`}
              >
                Cashflow Unit ({budgetItems.length})
              </button>
              <button
                onClick={() => setTransactionView("history")}
                className={`flex-1 py-1.5 rounded-lg font-bold transition text-center ${
                  transactionView === "history"
                    ? "bg-[#E3F2FD] text-[#242921] shadow-2xs"
                    : "text-[#666E61] hover:text-[#242921]"
                }`}
              >
                Riwayat Transaksi ({monthTransactions.length})
              </button>
            </div>

            {/* VIEW A: CASHFLOW ITEMS CARDS WITH SEARCH & INFINITE SCROLL */}
            {transactionView === "items" && (
              <div className="space-y-2.5">
                {/* Search Bar for Cashflow Items */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[#666E61] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari cashflow item... (e.g. Makan, Kos, Bensin)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl pl-10 pr-9 py-2.5 text-xs text-[#242921] placeholder:text-[#666E61]/60 shadow-xs focus:outline-none focus:border-[#2196F3]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#242921] p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {budgetItems.length === 0 ? (
                  <div className="p-8 text-center bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl space-y-2">
                    <p className="text-xs font-bold text-[#242921]">Belum Ada Cashflow Item</p>
                    <p className="text-[11px] text-[#666E61]">Bulan ini belum diisi. Setup anggaran di Web Console terlebih dahulu.</p>
                  </div>
                ) : filteredBudgetItems.length === 0 ? (
                  <div className="p-8 text-center bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl space-y-2">
                    <p className="text-xs font-bold text-[#242921]">Cashflow Item Tidak Ditemukan</p>
                    <p className="text-[11px] text-[#666E61]">
                      Tidak ada hasil yang cocok dengan kata kunci &ldquo;{searchQuery}&rdquo;.
                    </p>
                    <button
                      onClick={() => setSearchQuery("")}
                      className="text-xs font-bold text-[#2196F3] underline"
                    >
                      Reset Pencarian
                    </button>
                  </div>
                ) : (
                  <>
                    {displayedBudgetItems.map((item) => {
                      const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
                      const itemTx = monthTransactions.filter((t) => t.cashflow_unit_id === item.cashflow_unit_id);
                      const spent = item.realization_amount ?? item.projection_amount ?? 0;
                      const budget = item.budget_amount;
                      const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                      const isOver = spent > budget;
                      const isExpanded = Boolean(expandedItemIds[item.id]);

                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl border bg-[#FFFFFF] shadow-2xs transition overflow-hidden ${
                            isOver ? "border-rose-200" : "border-[#EEEEEE]"
                          } ${isLocked ? "opacity-75" : ""}`}
                        >
                          {/* 1 BARIS DEFAULT SUMMARY (NAMA, PROGRES BAR, ICON EXPAND) */}
                          <button
                            type="button"
                            onClick={() => toggleItemExpand(item.id)}
                            className="w-full flex items-center justify-between gap-3 p-3.5 text-left select-none active:bg-[#E3F2FD]/30 transition"
                          >
                            {/* 1. Nama */}
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-xs text-[#242921] truncate block">
                                {unit?.name || "Cashflow Unit"}
                              </span>
                            </div>

                            {/* 2. Progres Bar */}
                            <div className="flex items-center gap-2 shrink-0 w-28 sm:w-36">
                              <div className="flex-1 bg-[#EEEEEE] h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    isOver ? "bg-rose-500" : "bg-[#2196F3]"
                                  }`}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              <span
                                className={`text-[10px] font-bold w-7 text-right shrink-0 ${
                                  isOver ? "text-rose-600" : "text-[#666E61]"
                                }`}
                              >
                                {pct}%
                              </span>
                            </div>

                            {/* 3. Icon Expand */}
                            <div className="text-[#666E61] shrink-0">
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isExpanded ? "rotate-180 text-[#2196F3]" : ""
                                }`}
                              />
                            </div>
                          </button>

                          {/* EXPANDED VIEW: PAS DI-EXPAND BARU KAYA SEKARANG */}
                          {isExpanded && (
                            <div className="px-3.5 pb-3.5 pt-1 space-y-3 border-t border-[#EEEEEE]/80 animate-in fade-in-50 duration-150">
                              {/* Category, Urgency & Status Badge */}
                              <div className="flex items-start justify-between gap-2 pt-1">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] text-[#666E61]">
                                      {unit?.category || unit?.unit_type}
                                    </span>
                                    {getUrgencyPill(item.urgency)}
                                  </div>
                                </div>

                                {/* Status Badge */}
                                <div className="text-right shrink-0">
                                  {isOver ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                                      Overbudget
                                    </span>
                                  ) : spent >= budget && budget > 0 ? (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2196F3]/15 text-[#2196F3] border border-[#2196F3]/30">
                                      100% Tercapai
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E3F2FD] text-[#666E61]">
                                      {pct}% Terpakai
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Progress Detail: Realisasi vs Plafon */}
                              <div className="flex items-center justify-between text-[11px] bg-[#E3F2FD]/30 p-2 rounded-xl border border-[#EEEEEE]">
                                <span className="text-[#666E61]">
                                  Realisasi: <strong className={isOver ? "text-rose-600" : "text-[#242921]"}>{formatRupiah(spent)}</strong>
                                </span>
                                <span className="text-[#666E61]">
                                  Plafon: <strong>{formatRupiah(budget)}</strong>
                                </span>
                              </div>

                              {/* Footer: Count & Quick Catat Button */}
                              <div className="flex items-center justify-between pt-2 border-t border-[#EEEEEE] text-[11px]">
                                <span className="text-[#666E61]">
                                  {itemTx.length > 0 ? (
                                    <span><strong>{itemTx.length}</strong> transaksi tercatat</span>
                                  ) : (
                                    <span className="italic">Belum ada transaksi</span>
                                  )}
                                </span>

                                {!isLocked && (
                                  <button
                                    type="button"
                                    onClick={() => openTxModal(item.cashflow_unit_id)}
                                    className="px-3 py-1 rounded-xl bg-[#2196F3]/15 hover:bg-[#2196F3]/25 text-[#2196F3] font-bold text-[11px] transition flex items-center gap-1 border border-[#2196F3]/30 active:scale-95"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Catat</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Infinite Scroll Sentinel / Load More */}
                    {visibleItemLimit < filteredBudgetItems.length ? (
                      <div className="space-y-2 pt-1 pb-2">
                        <div ref={sentinelRef} className="py-2 flex items-center justify-center gap-2 text-xs text-[#666E61]">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2196F3]" />
                          <span>Scroll untuk memuat 10 item lagi...</span>
                        </div>
                        <button
                          onClick={() => setVisibleItemLimit((prev) => prev + 10)}
                          className="w-full py-2 bg-[#FFFFFF] hover:bg-[#EEEEEE] border border-[#EEEEEE] rounded-2xl text-xs font-semibold text-[#666E61] transition shadow-2xs"
                        >
                          Muat 10 Cashflow Item Lagi ({displayedBudgetItems.length}/{filteredBudgetItems.length})
                        </button>
                      </div>
                    ) : (
                      filteredBudgetItems.length > 10 && (
                        <div className="text-center text-[10px] text-[#666E61] py-2">
                          Menampilkan seluruh {filteredBudgetItems.length} cashflow items
                        </div>
                      )
                    )}
                  </>
                )}
              </div>
            )}

            {/* VIEW B: RIWAYAT TRANSAKSI FEED */}
            {transactionView === "history" && (
              <div className="space-y-2.5">
                {/* Cashflow Item Filter Dropdown */}
                <div className="flex items-center justify-between gap-2 bg-[#FFFFFF] p-2.5 rounded-2xl border border-[#EEEEEE] text-xs">
                  <span className="text-[#666E61] font-semibold shrink-0">Filter Item:</span>
                  <select
                    value={selectedPosFilter}
                    onChange={(e) => setSelectedPosFilter(e.target.value)}
                    className="flex-1 bg-[#E3F2FD]/40 border border-[#EEEEEE] rounded-xl px-2.5 py-1 text-xs text-[#242921] font-medium"
                  >
                    <option value="ALL">Semua Transaksi ({monthTransactions.length})</option>
                    <optgroup label="Pengeluaran (Expense)">
                      {budgetItems.map((item) => {
                        const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
                        const count = monthTransactions.filter((t) => t.cashflow_unit_id === item.cashflow_unit_id).length;
                        return (
                          <option key={item.id} value={item.cashflow_unit_id}>
                            {unit?.name} ({count})
                          </option>
                        );
                      })}
                    </optgroup>
                    <optgroup label="Pemasukan (Income)">
                      {cashflowUnits
                        .filter((u) => u.unit_type === "INCOME")
                        .map((u) => {
                          const count = monthTransactions.filter((t) => t.cashflow_unit_id === u.id).length;
                          return (
                            <option key={u.id} value={u.id}>
                              {u.name} ({count})
                            </option>
                          );
                        })}
                    </optgroup>
                  </select>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="p-8 text-center bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl space-y-2">
                    <p className="text-xs font-bold text-[#242921]">Belum Ada Transaksi</p>
                    <p className="text-[11px] text-[#666E61]">
                      {selectedPosFilter === "ALL" 
                        ? "Klik tombol di atas untuk mencatat transaksi perdana."
                        : "Belum ada transaksi pada pos yang dipilih."}
                    </p>
                  </div>
                ) : (
                  filteredTransactions.map((tx) => {
                    const unit = cashflowUnits.find((u) => u.id === tx.cashflow_unit_id);
                    const isIncome = unit?.unit_type === "INCOME";

                    return (
                      <div
                        key={tx.id}
                        className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isIncome 
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                              : "bg-[#2196F3]/15 text-[#2196F3]"
                          }`}>
                            {isIncome ? <ArrowDownLeft className="w-4 h-4 text-emerald-600" /> : <Receipt className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-[#242921] truncate">{unit?.name || "Transaksi"}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                isIncome 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                  : "bg-[#E3F2FD] text-[#666E61]"
                              }`}>
                                {isIncome ? "INCOME" : unit?.category || unit?.unit_type}
                              </span>
                            </div>
                            {tx.notes && (
                              <p className="text-[11px] text-[#666E61] mt-0.5 truncate">{tx.notes}</p>
                            )}
                            <span className="text-[10px] text-slate-400 block mt-0.5">{tx.date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`font-bold text-xs ${isIncome ? "text-emerald-600" : "text-[#242921]"}`}>
                            {isIncome ? `+${formatRupiah(tx.amount)}` : `-${formatRupiah(tx.amount)}`}
                          </span>

                          {!isLocked && (
                            <button
                              onClick={() => deleteTransaction(tx.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Hapus transaksi ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OUTCOME CHART (SOLID PIE CHART BASED ON REALIZATION TRANSACTIONS) */}
        {activeTab === "chart" && (
          <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#242921]">Outcome Distribution</h3>
                <p className="text-xs text-[#666E61]">
                  Berdasarkan transaksi riil yang dicatat ({monthTransactions.length} transaksi)
                </p>
              </div>
              {chartData.length > 0 && (
                <div className="text-right">
                  <span className="text-[10px] text-[#666E61] block">Total Realisasi</span>
                  <span className="text-xs font-bold text-[#2196F3]">
                    {formatRupiah(chartData.reduce((acc, curr) => acc + curr.value, 0))}
                  </span>
                </div>
              )}
            </div>

            {chartData.length === 0 ? (
              <div className="p-8 text-center bg-[#E3F2FD]/20 border border-dashed border-[#EEEEEE] rounded-2xl space-y-2">
                <PieChartIcon className="w-8 h-8 text-[#666E61] mx-auto opacity-50" />
                <p className="text-xs font-bold text-[#242921]">Belum Ada Transaksi Riil</p>
                <p className="text-[11px] text-[#666E61]">
                  Grafik ini dihitung murni dari transaksi riil yang lu catat (Realisasi), bukan dari angka plafon budget.
                </p>
              </div>
            ) : (
              <>
                {/* Full Solid Pie Chart (innerRadius={0} - bukan donut) */}
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={0}
                        outerRadius={90}
                        paddingAngle={1}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#FFFFFF" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [formatRupiah(Number(val) || 0), "Nominal Realisasi"]}
                        contentStyle={{ backgroundColor: "#FFFFFF", borderColor: "#EEEEEE", borderRadius: "12px", fontSize: "11px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Category Breakdown Breakdown List */}
                <div className="space-y-2 border-t border-[#EEEEEE] pt-3">
                  {chartData.map((item) => {
                    const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
                    const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;

                    return (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-medium text-[#242921]">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#666E61] font-semibold">{percent}%</span>
                          <span className="font-bold text-[#242921]">{formatRupiah(item.value)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: ASSETS */}
        {activeTab === "assets" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#666E61] px-1 font-medium">
              <span>Portofolio Aset & Investasi</span>
              <span>Yield Generating</span>
            </div>

            {assets.map((asset) => (
              <div key={asset.id} className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-[#242921]">{asset.name}</h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        asset.liquidity_tier === "LIQUID"
                          ? "bg-[#2196F3]/15 text-[#2196F3]"
                          : asset.liquidity_tier === "SEMI_LIQUID"
                          ? "bg-[#90CAF9]/40 text-[#1565C0]"
                          : "bg-[#E3F2FD] text-[#666E61]"
                      }`}>
                        {asset.liquidity_tier}
                      </span>
                      {asset.goal_bucket && (
                        <span className="text-[10px] text-[#666E61] bg-[#EEEEEE] px-1.5 py-0.5 rounded font-medium">
                          {asset.goal_bucket}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-xs text-[#242921] block">{formatRupiah(asset.total_value)}</span>
                    {asset.generating_rate > 0 && (
                      <span className="text-[10px] text-[#2196F3] font-bold">+{asset.generating_rate}% Yield</span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-[#666E61] flex justify-between border-t border-[#EEEEEE] pt-2 font-medium">
                  <span>Pokok: {formatRupiah(asset.main_value)}</span>
                  <span>Return: {formatRupiah(asset.income_generated)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: WISHLIST */}
        {activeTab === "wishlist" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#666E61] px-1 font-medium">
              <span>Target Belanja / Impian</span>
              <span>Total: {wishlists.length} Item</span>
            </div>

            {wishlists.map((wl) => (
              <div
                key={wl.id}
                className={`rounded-2xl border p-3.5 flex items-center justify-between gap-3 shadow-xs transition ${
                  wl.is_bought ? "bg-[#FFFFFF] border-[#2196F3] line-through opacity-70" : "bg-[#FFFFFF] border-[#EEEEEE]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleWishlistBought(wl.id)}
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition ${
                      wl.is_bought ? "bg-[#2196F3] text-white shadow-xs" : "border border-[#EEEEEE] text-slate-300 hover:border-[#2196F3]"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <div>
                    <span className="text-xs font-bold text-[#242921]">{wl.item_name}</span>
                    <span className="text-[10px] text-[#666E61] block">Prioritas #{wl.priority}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#242921]">{formatRupiah(wl.target_amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) for quick logging */}
      {!isLocked && activeTab === "transactions" && (
        <button
          onClick={() => openTxModal()}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#2196F3] hover:bg-[#1E88E5] text-white rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-90 z-30"
          title="Catat Transaksi"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>
      )}

      {/* Success Feedback Toast */}
      {isSuccessToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#2196F3] text-white px-4 py-2 rounded-2xl shadow-lg text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Transaksi berhasil dicatat!</span>
        </div>
      )}

      {/* Slide-Up Bottom Sheet Modal: Form Catat Transaksi (Expense / Income) */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
              <div>
                <h3 className="text-sm font-bold text-[#242921]">
                  {txType === "EXPENSE" ? "Catat Pengeluaran Baru" : "Catat Pemasukan Baru"}
                </h3>
                <p className="text-[11px] text-[#666E61]">
                  {txType === "EXPENSE" ? "Input mutasi transaksi ke dalam pos anggaran" : "Input pemasukan uang ke dalam rekening"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTxModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#EEEEEE] text-[#666E61] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type Switcher: Pengeluaran vs Pemasukan */}
            <div className="flex items-center p-1 bg-[#E3F2FD]/50 rounded-xl border border-[#EEEEEE]">
              <button
                type="button"
                onClick={() => {
                  setTxType("EXPENSE");
                  if (budgetItems.length > 0) {
                    const uncompletedItem = budgetItems.find((item) => {
                      const spent = item.realization_amount ?? item.projection_amount ?? 0;
                      return !( (item.budget_amount > 0 && spent >= item.budget_amount) || item.is_realized );
                    });
                    setTxUnitId(uncompletedItem ? uncompletedItem.cashflow_unit_id : budgetItems[0].cashflow_unit_id);
                  }
                  setTxNominal(0);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  txType === "EXPENSE"
                    ? "bg-white text-rose-600 shadow-xs border border-rose-100"
                    : "text-[#666E61] hover:text-[#242921]"
                }`}
              >
                <Receipt className="w-3.5 h-3.5 text-rose-500" />
                <span>Pengeluaran</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTxType("INCOME");
                  const incUnits = cashflowUnits.filter((u) => u.unit_type === "INCOME" && u.is_active);
                  if (incUnits.length > 0) {
                    setTxUnitId(incUnits[0].id);
                  }
                  setTxNominal(0);
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  txType === "INCOME"
                    ? "bg-white text-emerald-600 shadow-xs border border-emerald-100"
                    : "text-[#666E61] hover:text-[#242921]"
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
                <span>Pemasukan</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveTransaction} className="space-y-4">
              {/* Field 1: Pilih Pos Pengeluaran / Sumber Pemasukan */}
              {txType === "EXPENSE" ? (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-[#666E61]">
                      Pilih Cashflow Item <span className="text-rose-500">*</span>
                    </label>
                    {selectedBudgetItem && (
                      <span className="text-[10px] font-bold text-[#2196F3] bg-[#2196F3]/10 px-2 py-0.5 rounded-md">
                        Budget: {formatRupiah(selectedBudgetItem.budget_amount)}
                      </span>
                    )}
                  </div>

                  {/* Search Bar for CF Units */}
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666E61]" />
                    <input
                      type="text"
                      placeholder="Cari pos pengeluaran..."
                      value={txUnitSearch}
                      onChange={(e) => setTxUnitSearch(e.target.value)}
                      className="w-full pl-8 pr-8 py-2 text-xs bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl text-[#242921] placeholder:text-[#666E61]/60 focus:border-[#2196F3] focus:outline-hidden"
                    />
                    {txUnitSearch && (
                      <button
                        type="button"
                        onClick={() => setTxUnitSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666E61] hover:text-[#242921] p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Clean Scrollable List: Nama & Nominal Only */}
                  <div className="max-h-40 overflow-y-auto border border-[#EEEEEE] rounded-xl divide-y divide-[#EEEEEE] bg-[#FFFFFF] shadow-2xs">
                    {filteredModalBudgetItems.length === 0 ? (
                      <div className="p-3 text-center text-xs text-[#666E61]">
                        {budgetItems.length === 0 
                          ? "Belum ada item anggaran di bulan ini"
                          : txUnitSearch.trim()
                          ? "Tidak ada pos yang cocok"
                          : "Semua pos anggaran sudah 100% tercapai. Cari nama item di atas jika ingin catat pengeluaran tambahan."}
                      </div>
                    ) : (
                      filteredModalBudgetItems.map((item) => {
                        const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
                        const isSelected = txUnitId === item.cashflow_unit_id;
                        const spent = item.realization_amount ?? item.projection_amount ?? 0;
                        const isCompleted = (item.budget_amount > 0 && spent >= item.budget_amount) || item.is_realized;

                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => setTxUnitId(item.cashflow_unit_id)}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left transition ${
                              isSelected
                                ? "bg-[#2196F3] text-white font-bold"
                                : "hover:bg-[#E3F2FD]/40 text-[#242921]"
                            }`}
                          >
                            <span className="text-xs truncate font-medium flex items-center gap-1.5">
                              <span>{unit?.name || "Cashflow Item"}</span>
                              {isCompleted && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                    isSelected
                                      ? "bg-white/20 text-white"
                                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  }`}
                                >
                                  100%
                                </span>
                              )}
                            </span>
                            <span
                              className={`text-xs shrink-0 ml-3 font-semibold ${
                                isSelected ? "text-white" : "text-[#2196F3]"
                              }`}
                            >
                              {formatRupiah(item.budget_amount)}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* INCOME: Sumber Pemasukan */
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-[#666E61]">
                      Pilih Sumber Pemasukan <span className="text-rose-500">*</span>
                    </label>
                    {selectedIncomeUnit && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        {selectedIncomeUnit.name}
                      </span>
                    )}
                  </div>

                  {/* Search Bar for Income Units */}
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#666E61]" />
                    <input
                      type="text"
                      placeholder="Cari sumber pemasukan..."
                      value={txUnitSearch}
                      onChange={(e) => setTxUnitSearch(e.target.value)}
                      className="w-full pl-8 pr-8 py-2 text-xs bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl text-[#242921] placeholder:text-[#666E61]/60 focus:border-[#2196F3] focus:outline-hidden"
                    />
                    {txUnitSearch && (
                      <button
                        type="button"
                        onClick={() => setTxUnitSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666E61] hover:text-[#242921] p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* List Income Units */}
                  <div className="max-h-40 overflow-y-auto border border-[#EEEEEE] rounded-xl divide-y divide-[#EEEEEE] bg-[#FFFFFF] shadow-2xs">
                    {filteredModalIncomeUnits.length === 0 ? (
                      <div className="p-3 text-center text-xs text-[#666E61]">
                        Belum ada sumber pemasukan yang cocok.
                      </div>
                    ) : (
                      filteredModalIncomeUnits.map((u) => {
                        const isSelected = txUnitId === u.id;
                        return (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() => setTxUnitId(u.id)}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left transition ${
                              isSelected
                                ? "bg-emerald-600 text-white font-bold"
                                : "hover:bg-emerald-50/50 text-[#242921]"
                            }`}
                          >
                            <span className="text-xs truncate font-medium">
                              {u.name}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                isSelected ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              Income
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Field 2: Nominal Transaksi & Actions */}
              <div>
                <label className="text-[11px] font-semibold text-[#666E61] block mb-1">
                  Nominal {txType === "EXPENSE" ? "Pengeluaran" : "Pemasukan"} (Rp) <span className="text-rose-500">*</span>
                </label>
                <CurrencyInput
                  value={txNominal}
                  onChange={setTxNominal}
                  textAlign="left"
                  placeholder="0"
                />

                {/* Quick Actions: Complete Button (only for Expense) & Reset */}
                <div className="flex items-center justify-between mt-2">
                  {txType === "EXPENSE" ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedBudgetItem) {
                          setTxNominal(selectedBudgetItem.budget_amount);
                        }
                      }}
                      disabled={!selectedBudgetItem || selectedBudgetItem.budget_amount <= 0}
                      className="px-3 py-1.5 text-xs font-bold bg-[#2196F3] text-white hover:bg-[#1E88E5] active:scale-95 transition rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Isi otomatis sama dengan nominal budget item"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Complete {selectedBudgetItem ? `(${formatRupiah(selectedBudgetItem.budget_amount)})` : ""}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                      <ArrowDownLeft className="w-3.5 h-3.5" /> Otomatis menambah saldo bank BCA
                    </span>
                  )}

                  {txNominal > 0 && (
                    <button
                      type="button"
                      onClick={() => setTxNominal(0)}
                      className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Field 3: Catatan / Keterangan */}
              <div>
                <label className="text-[11px] font-semibold text-[#666E61] block mb-1">
                  Catatan / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder={txType === "EXPENSE" ? "misal: Makan siang sate, beli bensin..." : "misal: Gaji bulan ini, freelance website..."}
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921] focus:border-[#2196F3] focus:outline-hidden"
                />
              </div>

              {/* Field 4: Tanggal Transaksi */}
              <div>
                <label className="text-[11px] font-semibold text-[#666E61] block mb-1">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921] focus:border-[#2196F3] focus:outline-hidden"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={txNominal <= 0 || !txUnitId}
                className={`w-full py-3 rounded-2xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 ${
                  txNominal <= 0 || !txUnitId
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : txType === "INCOME"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-[0.99]"
                    : "bg-[#2196F3] hover:bg-[#1E88E5] text-white active:scale-[0.99]"
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>
                  {txType === "INCOME" ? "Simpan Pemasukan" : "Simpan Pengeluaran"} {txNominal > 0 ? `(${formatRupiah(txNominal)})` : ""}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE REAL BANK BALANCE */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-xl border border-[#EEEEEE] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#2196F3]/15 text-[#2196F3]">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#242921]">Update Saldo Rekening Bank</h3>
                  <p className="text-[10px] text-[#666E61]">Periode: {selectedMonth}</p>
                </div>
              </div>
              <button
                onClick={() => setIsBankModalOpen(false)}
                className="p-1 text-[#666E61] hover:text-[#242921] transition rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBankBalance} className="space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-[#666E61] block mb-1">
                  Saldo Riil BCA Utama
                </label>
                <CurrencyInput
                  value={inputBcaBalance}
                  onChange={(val) => setInputBcaBalance(val)}
                  placeholder="0"
                  className="w-full text-base font-bold bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2.5 text-[#242921] focus:border-[#2196F3] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#666E61] block mb-1">
                  Saldo Riil Bank Jago (Opsional)
                </label>
                <CurrencyInput
                  value={inputJagoBalance}
                  onChange={(val) => setInputJagoBalance(val)}
                  placeholder="0"
                  className="w-full text-base font-bold bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2.5 text-[#242921] focus:border-[#2196F3] focus:outline-hidden"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#E3F2FD] border border-[#2196F3]/30 text-[11px] text-[#242921] space-y-1">
                <span className="font-bold text-[#2196F3] block">Total Liquid Cash Riil:</span>
                <span className="text-base font-extrabold text-[#242921]">
                  {formatRupiah(inputBcaBalance + inputJagoBalance)}
                </span>
                <p className="text-[10px] text-[#666E61]">
                  Nilai ini akan tersinkronisasi otomatis ke Web Console dan laporan historical bulanan.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 bg-[#2196F3] hover:bg-[#1E88E5] text-white active:scale-[0.99]"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Simpan Saldo Bank</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
