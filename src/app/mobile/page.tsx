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
  LogOut
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
    addTransaction,
    deleteTransaction,
    toggleWishlistBought
  } = useApp();

  const [activeTab, setActiveTab] = useState<"transactions" | "chart" | "assets" | "wishlist">("transactions");
  const [transactionView, setTransactionView] = useState<"items" | "history">("items");
  const [selectedPosFilter, setSelectedPosFilter] = useState<string>("ALL");

  // Search & Infinite Scroll pagination for Cashflow Items
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleItemLimit, setVisibleItemLimit] = useState(5);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  // Form modal state for recording transaction
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txNominal, setTxNominal] = useState<number>(0);
  const [txUnitId, setTxUnitId] = useState<string>("");
  const [txNotes, setTxNotes] = useState<string>("");
  const [txDate, setTxDate] = useState<string>("");
  const [isSuccessToast, setIsSuccessToast] = useState(false);

  // Privacy feature: Hide/Show Balance
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

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

  // Filter and search Cashflow Items
  const filteredBudgetItems = useMemo(() => {
    if (!searchQuery.trim()) return budgetItems;
    const q = searchQuery.toLowerCase().trim();
    return budgetItems.filter((item) => {
      const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
      return (
        unit?.name.toLowerCase().includes(q) ||
        unit?.code.toLowerCase().includes(q) ||
        unit?.category?.toLowerCase().includes(q)
      );
    });
  }, [budgetItems, cashflowUnits, searchQuery]);

  // Paginated visible Cashflow Items (starts with 5, loads 5 more on scroll)
  const displayedBudgetItems = useMemo(() => {
    return filteredBudgetItems.slice(0, visibleItemLimit);
  }, [filteredBudgetItems, visibleItemLimit]);

  // Reset pagination limit when search query or month changes
  React.useEffect(() => {
    setVisibleItemLimit(5);
  }, [searchQuery, selectedMonth]);

  // Infinite Scroll IntersectionObserver trigger
  React.useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleItemLimit((prev) => {
            if (prev < filteredBudgetItems.length) {
              return prev + 5;
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

  // Cashflow Metrics based on actual transactions
  const cashflowMetrics = useMemo(() => {
    const totalIncome = currentMonthData.salary_budget + currentMonthData.additional_budget;
    const realizedSum = monthTransactions.reduce((acc, t) => acc + t.amount, 0);
    const sisaAnggaran = totalIncome - realizedSum;
    const realTotalCash = currentMonthData.real_bca_balance + currentMonthData.real_jago_balance;

    return { totalIncome, realizedSum, sisaAnggaran, realTotalCash };
  }, [monthTransactions, currentMonthData]);

  // Chart Data with Earth & Sage Palette - DYNAMICALLY SOURCED FROM MASTER CATEGORIES
  const chartData = useMemo(() => {
    const catMap = new Map(categories.map((c) => [c.code, c]));
    const categoryTotals: Record<string, number> = {};

    // Calculate distribution purely from transactions logged this month
    monthTransactions.forEach((tx) => {
      const unit = cashflowUnits.find((u) => u.id === tx.cashflow_unit_id);
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
          color: cat?.color || "#8B9A6E",
        };
      });
  }, [monthTransactions, cashflowUnits, categories]);

  // Filtered transactions if user filters by cashflow item
  const filteredTransactions = useMemo(() => {
    if (selectedPosFilter === "ALL") return monthTransactions;
    return monthTransactions.filter((t) => t.cashflow_unit_id === selectedPosFilter);
  }, [monthTransactions, selectedPosFilter]);

  // Open transaction modal
  const openTxModal = (preselectedUnitId?: string) => {
    if (isLocked) return;
    if (preselectedUnitId) {
      setTxUnitId(preselectedUnitId);
    } else if (budgetItems.length > 0 && (!txUnitId || !budgetItems.some((i) => i.cashflow_unit_id === txUnitId))) {
      setTxUnitId(budgetItems[0].cashflow_unit_id);
    }
    setTxNominal(0);
    setTxNotes("");
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

  const addQuickNominal = (amt: number) => {
    setTxNominal((prev) => prev + amt);
  };

  const getUrgencyPill = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case "HIGHEST":
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">HIGHEST</span>;
      case "HIGH":
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">HIGH</span>;
      case "NORMAL":
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#8B9A6E]/15 text-[#8B9A6E] border border-[#8B9A6E]/30">NORMAL</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#EAE2D6] pb-24 text-[#242921]">
      {/* Top Mobile Bar with Custom App Icon & Switch to Web */}
      <div className="sticky top-0 z-40 bg-[#FFFFFF]/90 backdrop-blur border-b border-[#EEEEEE] px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-xl overflow-hidden shadow-xs border border-[#EEEEEE] shrink-0">
            <Image
              src="/app-icon.png"
              alt="Self Cash Flow Icon"
              fill
              sizes="32px"
              className="object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-xs font-bold text-[#242921]">NineTally</h1>
            <p className="text-[10px] text-[#666E61]">Mobile PWA</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
              isLocked
                ? "bg-amber-100 text-amber-800 border border-amber-200"
                : currentMonthData.status === "ACTIVE"
                ? "bg-[#8B9A6E]/15 text-[#8B9A6E] border border-[#8B9A6E]/30"
                : "bg-blue-100 text-blue-800 border border-blue-200"
            }`}
          >
            {isLocked ? <Lock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
            {currentMonthData.status}
          </span>
          <button
            onClick={handleLogout}
            title="Keluar / Logout"
            className="p-1.5 rounded-xl bg-[#EAE2D6] hover:bg-rose-100 hover:text-rose-700 transition text-[#666E61]"
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
                  <EyeOff className="w-3 h-3 text-[#8B9A6E]" />
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
                  <span className="font-bold tracking-wider text-[11px] uppercase text-[#8B9A6E] flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5" /> Bank Balance
                  </span>
                  <span className="text-[10px] bg-[#8B9A6E]/15 text-[#8B9A6E] px-2 py-0.5 rounded-full font-bold border border-[#8B9A6E]/20">
                    BCA Utama
                  </span>
                </div>
                <div className="my-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight text-[#242921]">
                      {maskNominal(currentMonthData.real_bca_balance)}
                    </h2>
                    <button
                      onClick={toggleHideBalance}
                      className="p-1 text-[#666E61] hover:text-[#242921] transition rounded-md"
                      title={isBalanceHidden ? "Tampilkan Saldo" : "Sembunyikan Saldo"}
                      aria-label="Toggle Saldo"
                    >
                      {isBalanceHidden ? <EyeOff className="w-4 h-4 text-[#8B9A6E]" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-[#666E61] flex items-center justify-between border-t border-[#EEEEEE] pt-2 font-medium">
                <span>Saldo Rekening Operasional</span>
                <span className="text-[10px] bg-[#EAE2D6] px-1.5 py-0.5 rounded text-[#666E61] font-semibold">
                  Liquid Cash
                </span>
              </div>
            </div>

            {/* Card 2: Nominal Outcome */}
            <div className="w-[84vw] max-w-[320px] shrink-0 snap-center bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-[#666E61]">
                  <span className="font-bold tracking-wider text-[11px] uppercase text-rose-700 flex items-center gap-1.5">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Nominal Outcome
                  </span>
                  <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                    {monthTransactions.length} Transaksi
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
                      {isBalanceHidden ? <EyeOff className="w-4 h-4 text-[#8B9A6E]" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-[#666E61] flex items-center justify-between border-t border-[#EEEEEE] pt-2 font-medium">
                <span>Total Realisasi Bulan Ini</span>
                <span className="text-[10px] text-[#8B9A6E] font-bold">
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
                  <span className="font-bold tracking-wider text-[11px] uppercase text-[#8B9A6E] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Assets
                  </span>
                  <span className="text-[10px] bg-[#EAE2D6] px-2 py-0.5 rounded-full font-semibold text-[#666E61]">
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
                      {isBalanceHidden ? <EyeOff className="w-4 h-4 text-[#8B9A6E]" /> : <Eye className="w-4 h-4" />}
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

        {/* 2. Monthly Cashflow Summary Card */}
        <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#666E61] font-medium">Anggaran Gaji Masuk</span>
            <span className="font-bold text-sm text-[#242921]">{maskNominal(cashflowMetrics.totalIncome)}</span>
          </div>

          {/* Visual Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-[#EEEEEE] h-2.5 rounded-full overflow-hidden flex">
              <div 
                className="bg-[#8B9A6E] h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (cashflowMetrics.realizedSum / (cashflowMetrics.totalIncome || 1)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-medium">
              <span className="text-[#8B9A6E]">Terlaksana: {maskNominal(cashflowMetrics.realizedSum)}</span>
              <span className="text-[#666E61]">Sisa: {maskNominal(cashflowMetrics.sisaAnggaran)}</span>
            </div>
          </div>
        </div>

        {/* 3. Sub Tabs Navigation */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl shadow-xs">
          <button
            onClick={() => setActiveTab("transactions")}
            className={`py-2 text-xs font-semibold rounded-xl flex flex-col items-center gap-1 transition ${
              activeTab === "transactions" ? "bg-[#8B9A6E] text-white shadow-xs" : "text-[#666E61]"
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Transaksi</span>
          </button>
          <button
            onClick={() => setActiveTab("chart")}
            className={`py-2 text-xs font-semibold rounded-xl flex flex-col items-center gap-1 transition ${
              activeTab === "chart" ? "bg-[#8B9A6E] text-white shadow-xs" : "text-[#666E61]"
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
            <span>Outcome</span>
          </button>
          <button
            onClick={() => setActiveTab("assets")}
            className={`py-2 text-xs font-semibold rounded-xl flex flex-col items-center gap-1 transition ${
              activeTab === "assets" ? "bg-[#8B9A6E] text-white shadow-xs" : "text-[#666E61]"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Aset</span>
          </button>
          <button
            onClick={() => setActiveTab("wishlist")}
            className={`py-2 text-xs font-semibold rounded-xl flex flex-col items-center gap-1 transition ${
              activeTab === "wishlist" ? "bg-[#8B9A6E] text-white shadow-xs" : "text-[#666E61]"
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
                    ? "bg-[#EAE2D6] text-[#242921] shadow-2xs"
                    : "text-[#666E61] hover:text-[#242921]"
                }`}
              >
                Cashflow Items ({budgetItems.length})
              </button>
              <button
                onClick={() => setTransactionView("history")}
                className={`flex-1 py-1.5 rounded-lg font-bold transition text-center ${
                  transactionView === "history"
                    ? "bg-[#EAE2D6] text-[#242921] shadow-2xs"
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
                    className="w-full bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl pl-10 pr-9 py-2.5 text-xs text-[#242921] placeholder:text-[#666E61]/60 shadow-xs focus:outline-none focus:border-[#8B9A6E]"
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
                      className="text-xs font-bold text-[#8B9A6E] underline"
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

                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl border p-4 bg-[#FFFFFF] shadow-xs space-y-3 transition ${
                            isOver ? "border-rose-200" : "border-[#EEEEEE]"
                          } ${isLocked ? "opacity-75" : ""}`}
                        >
                          {/* Header: Title, Category, Urgency */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-[#242921]">
                                  {unit?.name}
                                </span>
                                {getUrgencyPill(item.urgency)}
                              </div>
                              <span className="text-[10px] text-[#666E61] block mt-0.5">
                                {unit?.category || unit?.unit_type}
                              </span>
                            </div>

                            {/* Status Badge */}
                            <div className="text-right shrink-0">
                              {isOver ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                                  Overbudget
                                </span>
                              ) : spent >= budget && budget > 0 ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8B9A6E]/15 text-[#8B9A6E] border border-[#8B9A6E]/30">
                                  100% Tercapai
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EAE2D6] text-[#666E61]">
                                  {pct}% Terpakai
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1">
                            <div className="w-full bg-[#EEEEEE] h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isOver ? "bg-rose-500" : "bg-[#8B9A6E]"
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-[#666E61]">
                                Realisasi: <strong className={isOver ? "text-rose-600" : "text-[#242921]"}>{formatRupiah(spent)}</strong>
                              </span>
                              <span className="text-[#666E61]">
                                Plafon: <strong>{formatRupiah(budget)}</strong>
                              </span>
                            </div>
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
                                onClick={() => openTxModal(item.cashflow_unit_id)}
                                className="px-3 py-1 rounded-xl bg-[#8B9A6E]/15 hover:bg-[#8B9A6E]/25 text-[#8B9A6E] font-bold text-[11px] transition flex items-center gap-1 border border-[#8B9A6E]/30"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Catat</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Infinite Scroll Sentinel / Load More */}
                    {visibleItemLimit < filteredBudgetItems.length ? (
                      <div className="space-y-2 pt-1 pb-2">
                        <div ref={sentinelRef} className="py-2 flex items-center justify-center gap-2 text-xs text-[#666E61]">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8B9A6E]" />
                          <span>Scroll untuk memuat 5 item lagi...</span>
                        </div>
                        <button
                          onClick={() => setVisibleItemLimit((prev) => prev + 5)}
                          className="w-full py-2 bg-[#FFFFFF] hover:bg-[#EEEEEE] border border-[#EEEEEE] rounded-2xl text-xs font-semibold text-[#666E61] transition shadow-2xs"
                        >
                          Muat 5 Cashflow Item Lagi ({displayedBudgetItems.length}/{filteredBudgetItems.length})
                        </button>
                      </div>
                    ) : (
                      filteredBudgetItems.length > 5 && (
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
                    className="flex-1 bg-[#EAE2D6]/40 border border-[#EEEEEE] rounded-xl px-2.5 py-1 text-xs text-[#242921] font-medium"
                  >
                    <option value="ALL">Semua Cashflow Item ({monthTransactions.length})</option>
                    {budgetItems.map((item) => {
                      const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
                      const count = monthTransactions.filter((t) => t.cashflow_unit_id === item.cashflow_unit_id).length;
                      return (
                        <option key={item.id} value={item.cashflow_unit_id}>
                          {unit?.name} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className="p-8 text-center bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl space-y-2">
                    <p className="text-xs font-bold text-[#242921]">Belum Ada Transaksi</p>
                    <p className="text-[11px] text-[#666E61]">
                      {selectedPosFilter === "ALL" 
                        ? "Klik tombol di atas untuk mencatat pengeluaran perdana."
                        : "Belum ada transaksi pada cashflow item yang dipilih."}
                    </p>
                  </div>
                ) : (
                  filteredTransactions.map((tx) => {
                    const unit = cashflowUnits.find((u) => u.id === tx.cashflow_unit_id);

                    return (
                      <div
                        key={tx.id}
                        className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-[#8B9A6E]/15 text-[#8B9A6E] flex items-center justify-center shrink-0 mt-0.5">
                            <Receipt className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-[#242921] truncate">{unit?.name}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#EAE2D6] text-[#666E61]">
                                {unit?.category || unit?.unit_type}
                              </span>
                            </div>
                            {tx.notes && (
                              <p className="text-[11px] text-[#666E61] mt-0.5 truncate">{tx.notes}</p>
                            )}
                            <span className="text-[10px] text-slate-400 block mt-0.5">{tx.date}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold text-xs text-[#242921]">
                            -{formatRupiah(tx.amount)}
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
                  <span className="text-xs font-bold text-[#8B9A6E]">
                    {formatRupiah(chartData.reduce((acc, curr) => acc + curr.value, 0))}
                  </span>
                </div>
              )}
            </div>

            {chartData.length === 0 ? (
              <div className="p-8 text-center bg-[#EAE2D6]/20 border border-dashed border-[#EEEEEE] rounded-2xl space-y-2">
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
                          ? "bg-[#8B9A6E]/15 text-[#8B9A6E]"
                          : asset.liquidity_tier === "SEMI_LIQUID"
                          ? "bg-[#C2A382]/20 text-[#856545]"
                          : "bg-[#EAE2D6] text-[#666E61]"
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
                      <span className="text-[10px] text-[#8B9A6E] font-bold">+{asset.generating_rate}% Yield</span>
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
                  wl.is_bought ? "bg-[#FFFFFF] border-[#8B9A6E] line-through opacity-70" : "bg-[#FFFFFF] border-[#EEEEEE]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleWishlistBought(wl.id)}
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition ${
                      wl.is_bought ? "bg-[#8B9A6E] text-white shadow-xs" : "border border-[#EEEEEE] text-slate-300 hover:border-[#8B9A6E]"
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
      {!isLocked && activeTab === "transactions" && budgetItems.length > 0 && (
        <button
          onClick={() => openTxModal()}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#8B9A6E] hover:bg-[#7A895F] text-white rounded-full shadow-lg flex items-center justify-center transition-transform active:scale-90 z-30"
          title="Catat Transaksi"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>
      )}

      {/* Success Feedback Toast */}
      {isSuccessToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#8B9A6E] text-white px-4 py-2 rounded-2xl shadow-lg text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Transaksi berhasil dicatat!</span>
        </div>
      )}

      {/* Slide-Up Bottom Sheet Modal: Form Catat Pengeluaran */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-[#FFFFFF] w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
              <div>
                <h3 className="text-sm font-bold text-[#242921]">Catat Pengeluaran Baru</h3>
                <p className="text-[11px] text-[#666E61]">Input mutasi transaksi ke dalam cashflow item</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTxModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#EEEEEE] text-[#666E61] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveTransaction} className="space-y-4">
              {/* Field 1: Nominal */}
              <div>
                <label className="text-[11px] font-semibold text-[#666E61] block mb-1">
                  Nominal Transaksi (Rp) <span className="text-rose-500">*</span>
                </label>
                <CurrencyInput
                  value={txNominal}
                  onChange={setTxNominal}
                  textAlign="left"
                  placeholder="0"
                />
                {/* Quick Nominal Chips */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => addQuickNominal(10000)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-[#EAE2D6]/50 hover:bg-[#EAE2D6] rounded-lg border border-[#EEEEEE] text-[#242921]"
                  >
                    +10rb
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickNominal(20000)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-[#EAE2D6]/50 hover:bg-[#EAE2D6] rounded-lg border border-[#EEEEEE] text-[#242921]"
                  >
                    +20rb
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickNominal(50000)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-[#EAE2D6]/50 hover:bg-[#EAE2D6] rounded-lg border border-[#EEEEEE] text-[#242921]"
                  >
                    +50rb
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuickNominal(100000)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-[#EAE2D6]/50 hover:bg-[#EAE2D6] rounded-lg border border-[#EEEEEE] text-[#242921]"
                  >
                    +100rb
                  </button>
                  {txNominal > 0 && (
                    <button
                      type="button"
                      onClick={() => setTxNominal(0)}
                      className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 rounded-lg ml-auto"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>

              {/* Field 2: Pilih Cashflow Item */}
              <div>
                <label className="text-[11px] font-semibold text-[#666E61] block mb-1">
                  Pilih Cashflow Item <span className="text-rose-500">*</span>
                </label>
                <select
                  value={txUnitId}
                  onChange={(e) => setTxUnitId(e.target.value)}
                  className="w-full bg-[#EAE2D6]/30 border border-[#EEEEEE] rounded-xl px-3 py-2.5 text-xs text-[#242921] font-medium"
                  required
                >
                  {budgetItems.map((item) => {
                    const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
                    const spent = item.realization_amount ?? item.projection_amount ?? 0;
                    return (
                      <option key={item.id} value={item.cashflow_unit_id}>
                        {unit?.name} ({unit?.category || unit?.unit_type}) — Plan: {formatRupiah(item.budget_amount)} | Real: {formatRupiah(spent)}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Field 3: Catatan / Keterangan */}
              <div>
                <label className="text-[11px] font-semibold text-[#666E61] block mb-1">
                  Catatan / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="misal: Makan siang sate, beli bensin, token..."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full bg-[#EAE2D6]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
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
                  className="w-full bg-[#EAE2D6]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-xs text-[#242921]"
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
                    : "bg-[#8B9A6E] hover:bg-[#7A895F] text-white active:scale-[0.99]"
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Simpan Transaksi ({formatRupiah(txNominal)})</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
