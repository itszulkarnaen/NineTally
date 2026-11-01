"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useApp } from "@/context/AppContext";
import { formatRupiah } from "@/lib/utils";
import { 
  Sliders, 
  TrendingUp, 
  CheckCircle2, 
  Layers, 
  Wallet, 
  Plus, 
  Trash2, 
  Lock, 
  Unlock, 
  Smartphone, 
  Save, 
  ShieldAlert,
  ArrowRight,
  GripVertical,
  Check,
  Copy,
  Sparkles,
  Tags,
  LogOut
} from "lucide-react";
import { MonthPicker } from "@/components/common/MonthPicker";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { CashflowUnit, CashflowCategory, ExpenseCategory, UrgencyLevel, UnitType } from "@/types";

type NavTab = "budget" | "realization" | "actual" | "cashflow-items" | "categories" | "assets";

export default function WebPage() {
  const { 
    cashflowUnits, 
    categories,
    assets,
    selectedMonth,
    setSelectedMonth,
    currentMonthData,
    addItemToCurrentMonth, 
    removeItemFromCurrentMonth, 
    updateItemBudgetAmount,
    updateItemRealization,
    toggleItemRealized,
    updateMonthIncome,
    saveCurrentMonthBudget,
    copyPreviousMonthBudget,
    getPreviousMonthUnitNominal,
    lockCurrentMonth,
    unlockCurrentMonth,
    createCashflowUnit,
    createCategory,
    deleteCategory
  } = useApp();

  const [activeTab, setActiveTab] = useState<NavTab>("budget");

  // Form state for creating Master Category
  const [catName, setCatName] = useState("");
  const [catCode, setCatCode] = useState("");
  const [catColor, setCatColor] = useState("#8B9A6E");
  const [catDesc, setCatDesc] = useState("");

  // Local state for income numbers
  const [salaryValue, setSalaryValue] = useState<number>(currentMonthData.salary_budget);
  const [additionalValue, setAdditionalValue] = useState<number>(currentMonthData.additional_budget);
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [isCopiedToast, setIsCopiedToast] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleLogout = async () => {
    if (window.confirm("Yakin mau keluar dari NineTally?")) {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    }
  };

  // Sync income inputs when month changes
  React.useEffect(() => {
    setSalaryValue(currentMonthData.salary_budget);
    setAdditionalValue(currentMonthData.additional_budget);
  }, [selectedMonth, currentMonthData.salary_budget, currentMonthData.additional_budget]);

  // Form state for creating Master Cashflow Unit
  const [unitCode, setUnitCode] = useState("");
  const [unitName, setUnitName] = useState("");
  const [unitType, setUnitType] = useState<UnitType>("EXPENSE");
  const [unitCategory, setUnitCategory] = useState<ExpenseCategory>("MONTHLY_NEEDS");
  const [unitUrgency, setUnitUrgency] = useState<UrgencyLevel>("NORMAL");

  const isLocked = currentMonthData.status === "LOCKED";
  const budgetItems = currentMonthData.items;

  // Financial Calculations for Budget
  const totalIncomeAvailable = salaryValue + additionalValue;
  const totalBudgetPlanned = budgetItems.reduce((acc, curr) => acc + curr.budget_amount, 0);
  const remainingToAllocate = totalIncomeAvailable - totalBudgetPlanned;

  // Handle explicit Save Budget
  const handleSaveBudget = () => {
    updateMonthIncome(salaryValue, additionalValue);
    const success = saveCurrentMonthBudget();
    if (success) {
      setIsSavedToast(true);
      setTimeout(() => setIsSavedToast(false), 3000);
    }
  };

  // Handle Copy Previous Month's Budget
  const handleCopyPreviousMonth = () => {
    const success = copyPreviousMonthBudget();
    if (success) {
      setIsCopiedToast(true);
      setTimeout(() => setIsCopiedToast(false), 3000);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isLocked) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isLocked) return;

    const unitId = e.dataTransfer.getData("text/plain");
    if (unitId) {
      addItemToCurrentMonth(unitId);
    }
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName) return;

    createCashflowUnit({
      code: unitCode || `CF-${Date.now().toString().slice(-4)}`,
      name: unitName,
      unit_type: unitType,
      category: unitType === "EXPENSE" ? unitCategory : undefined,
      default_urgency: unitUrgency,
    });

    setUnitName("");
    setUnitCode("");
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const code = catCode.trim()
      ? catCode.trim().toUpperCase().replace(/\s+/g, "_")
      : catName.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_");

    createCategory({
      code,
      name: catName.trim(),
      color: catColor || "#8B9A6E",
      description: catDesc.trim() || undefined,
      sort_order: categories.length + 1,
    });

    setCatName("");
    setCatCode("");
    setCatDesc("");
  };

  // Filter master units that are not yet in the current month's budget
  const availableUnits = cashflowUnits.filter(
    (u) => !budgetItems.some((item) => item.cashflow_unit_id === u.id)
  );

  return (
    <div className="min-h-screen bg-[#EAE2D6] flex text-[#242921]">
      {/* 1. SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-[#FFFFFF] border-r border-[#EEEEEE] flex flex-col justify-between shrink-0 p-5 shadow-sm">
        <div className="space-y-6">
          {/* Logo & Brand with User's Custom App Icon */}
          <div className="flex items-center gap-3 pb-2 border-b border-[#EEEEEE]">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-xs border border-[#EEEEEE] shrink-0">
              <Image
                src="/app-icon.png"
                alt="Self Cash Flow Icon"
                fill
                sizes="40px"
                className="object-cover"
                priority
              />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-[#242921]">
                Self Cash Flow
              </h1>
              <p className="text-[11px] text-[#666E61]">Finance Console</p>
            </div>
          </div>

          {/* Simple Month Status Badge & Lock/Unlock Trigger */}
          <div className="p-3.5 bg-[#EAE2D6]/40 rounded-2xl border border-[#EEEEEE] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#666E61] font-medium">Bulan:</span>
              <span className="font-bold text-[#242921]">{selectedMonth}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#666E61] font-medium">Status:</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                  isLocked
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : currentMonthData.status === "ACTIVE"
                    ? "bg-[#8B9A6E]/15 text-[#8B9A6E] border border-[#8B9A6E]/30"
                    : "bg-blue-100 text-blue-800 border border-blue-200"
                }`}
              >
                {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                {currentMonthData.status}
              </span>
            </div>

            {/* Lock / Unlock Trigger Button */}
            {isLocked ? (
              <button
                onClick={unlockCurrentMonth}
                className="w-full mt-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold rounded-xl border border-amber-200 transition flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Unlock (Edit Actual)</span>
              </button>
            ) : (
              <button
                onClick={lockCurrentMonth}
                className="w-full mt-1 py-1.5 px-2 bg-[#FFFFFF] hover:bg-[#EEEEEE] text-[#242921] text-[11px] font-medium rounded-xl border border-[#EEEEEE] transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Lock className="w-3.5 h-3.5 text-[#8B9A6E]" />
                <span>Kunci Periode</span>
              </button>
            )}
          </div>

          {/* Nav Links: Financial Cycle */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-wider text-[#666E61] uppercase px-3">
              Finance Cycle
            </span>
            <button
              onClick={() => setActiveTab("budget")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "budget"
                  ? "bg-[#8B9A6E] text-white shadow-xs"
                  : "text-[#666E61] hover:bg-[#EEEEEE] hover:text-[#242921]"
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Budget</span>
            </button>
            <button
              onClick={() => setActiveTab("realization")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "realization"
                  ? "bg-[#8B9A6E] text-white shadow-xs"
                  : "text-[#666E61] hover:bg-[#EEEEEE] hover:text-[#242921]"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Realization</span>
            </button>
            <button
              onClick={() => setActiveTab("actual")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "actual"
                  ? "bg-[#8B9A6E] text-white shadow-xs"
                  : "text-[#666E61] hover:bg-[#EEEEEE] hover:text-[#242921]"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Actual</span>
            </button>
          </div>

          {/* Nav Links: Master Data */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold tracking-wider text-[#666E61] uppercase px-3">
              Master Data
            </span>
            <button
              onClick={() => setActiveTab("cashflow-items")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "cashflow-items"
                  ? "bg-[#8B9A6E] text-white shadow-xs"
                  : "text-[#666E61] hover:bg-[#EEEEEE] hover:text-[#242921]"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Cashflow Items</span>
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "categories"
                  ? "bg-[#8B9A6E] text-white shadow-xs"
                  : "text-[#666E61] hover:bg-[#EEEEEE] hover:text-[#242921]"
              }`}
            >
              <Tags className="w-4 h-4" />
              <span>Master Categories</span>
            </button>
            <button
              onClick={() => setActiveTab("assets")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                activeTab === "assets"
                  ? "bg-[#8B9A6E] text-white shadow-xs"
                  : "text-[#666E61] hover:bg-[#EEEEEE] hover:text-[#242921]"
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Assets Portfolio</span>
            </button>
          </div>
        </div>

        {/* Bottom Sidebar */}
        <div className="pt-4 border-t border-[#EEEEEE]">
          <Link
            href="/mobile"
            className="flex items-center justify-between p-2.5 rounded-xl bg-[#EAE2D6]/40 hover:bg-[#EAE2D6] transition text-xs font-semibold text-[#242921]"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#8B9A6E]" />
              <span>Buka Mobile PWA</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#666E61]" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-full mt-2 flex items-center justify-between p-2.5 rounded-xl text-rose-700 hover:bg-rose-50 transition text-xs font-semibold"
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Keluar / Logout</span>
            </div>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Top Header Summary with MonthPicker */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFFFFF] p-6 rounded-3xl border border-[#EEEEEE] shadow-xs">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-[#242921]">
                  {activeTab === "budget" && "Budget"}
                  {activeTab === "realization" && "Realization (Realisasi Berjalan)"}
                  {activeTab === "actual" && "Actual"}
                  {activeTab === "cashflow-items" && "Master Data: Cashflow Items"}
                  {activeTab === "categories" && "Master Data: Kategori & Label Cashflow"}
                  {activeTab === "assets" && "Master Data: Assets Portfolio"}
                </h2>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    isLocked
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : currentMonthData.status === "ACTIVE"
                      ? "bg-[#8B9A6E]/15 text-[#8B9A6E] border border-[#8B9A6E]/30"
                      : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}
                >
                  {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  {currentMonthData.status}
                </span>
              </div>
              <p className="text-xs text-[#666E61] mt-1">
                {activeTab === "budget" && "Susun alokasi cashflow items bulanan. Item yang di-drag otomatis menggunakan nominal bulan lalu."}
                {activeTab === "realization" && "Pantau mutasi riil berjalan dan checklist pembayaran. Nilai tersinkronisasi otomatis dengan Mobile PWA."}
                {activeTab === "actual" && "Evaluasi realisasi anggaran yang telah dikunci di akhir bulan."}
                {activeTab === "cashflow-items" && "Kelola katalog master cashflow items (pengeluaran, pemasukan, dan tabungan)."}
                {activeTab === "categories" && "Kelola master kategori pengeluaran (Holy Thing, Liability, Monthly Needs, dsb) lengkap dengan warna & deskripsi."}
                {activeTab === "assets" && "Daftar aset portofolio, yield %, dan likuiditas (Liquid, Semi-Liquid, Illiquid)."}
              </p>
            </div>

            {/* MonthPicker in Header */}
            <div className="flex items-center gap-3">
              <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
            </div>
          </div>

          {/* ============================================================== */}
          {/* TAB 1: BUDGET MODULE (WITH PREVIOUS MONTH INHERITANCE) */}
          {/* ============================================================== */}
          {activeTab === "budget" && (
            <div className="space-y-5">
              {/* Income Setup Card with Formatted Currency Inputs */}
              <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EEEEEE]">
                  <div>
                    <h4 className="text-xs font-bold text-[#242921] uppercase tracking-wider">
                      Setup Pendapatan & Anggaran Bulan {selectedMonth}
                    </h4>
                    <p className="text-xs text-[#666E61] mt-0.5">
                      Input nominal otomatis terformat dengan pemisah titik ribuan (Rp).
                    </p>
                  </div>

                  {/* PROMINENT SAVE BUDGET BUTTON */}
                  <div className="flex items-center gap-2">
                    {isSavedToast && (
                      <span className="text-xs font-semibold text-[#8B9A6E] flex items-center gap-1 bg-[#8B9A6E]/15 px-3 py-1.5 rounded-xl border border-[#8B9A6E]/30 animate-in fade-in">
                        <Check className="w-3.5 h-3.5" />
                        Tersimpan!
                      </span>
                    )}
                    {isCopiedToast && (
                      <span className="text-xs font-semibold text-blue-700 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 animate-in fade-in">
                        <Sparkles className="w-3.5 h-3.5" />
                        Disalin dari bulan lalu!
                      </span>
                    )}
                    <button
                      onClick={handleSaveBudget}
                      disabled={isLocked}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs ${
                        isLocked
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-[#8B9A6E] hover:bg-[#7A895F] text-white"
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      <span>Simpan Budget</span>
                    </button>
                  </div>
                </div>

                {/* Formatted Currency Inputs for Gaji & Sisa Bulan Lalu */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Input 1: Gaji Utama (Formatted Currency) */}
                  <div>
                    <label className="text-[11px] text-[#666E61] font-semibold block mb-1">
                      Anggaran Gaji Utama
                    </label>
                    <CurrencyInput
                      value={salaryValue}
                      disabled={isLocked}
                      onChange={setSalaryValue}
                      textAlign="left"
                    />
                  </div>

                  {/* Input 2: Anggaran Tambahan / Sisa Dana Bulan Lalu (Formatted Currency) */}
                  <div>
                    <label className="text-[11px] text-[#666E61] font-semibold block mb-1">
                      Sisa Dana Bulan Lalu / Tambahan
                    </label>
                    <CurrencyInput
                      value={additionalValue}
                      disabled={isLocked}
                      onChange={setAdditionalValue}
                      textAlign="left"
                    />
                  </div>

                  {/* Calculated Metric 1: Total Alokasi Rencana */}
                  <div className="bg-[#EAE2D6]/30 rounded-2xl p-3 border border-[#EEEEEE] flex flex-col justify-between">
                    <span className="text-[10px] text-[#666E61] font-medium block">Total Rencana Dialokasikan</span>
                    <span className="text-sm font-bold text-[#242921] mt-1">{formatRupiah(totalBudgetPlanned)}</span>
                  </div>

                  {/* Calculated Metric 2: Sisa Belum Dialokasikan */}
                  <div className={`rounded-2xl p-3 border flex flex-col justify-between ${
                    remainingToAllocate < 0
                      ? "bg-rose-50 border-rose-200"
                      : "bg-[#8B9A6E]/10 border-[#8B9A6E]/20"
                  }`}>
                    <span className="text-[10px] text-[#666E61] font-medium block">Sisa Belum Dialokasikan</span>
                    <span className={`text-sm font-bold mt-1 ${remainingToAllocate < 0 ? "text-rose-600" : "text-[#8B9A6E]"}`}>
                      {formatRupiah(remainingToAllocate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2-Column Layout: Left (Budget Items Workspace / Dropzone) + Right (Available Units Drawer) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT (8 cols): BUDGET ITEMS WORKSPACE & DROPZONE */}
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`lg:col-span-8 bg-[#FFFFFF] border rounded-3xl overflow-hidden shadow-xs transition-colors ${
                    isDragOver ? "border-dashed border-2 border-[#8B9A6E] bg-[#8B9A6E]/5" : "border-[#EEEEEE]"
                  }`}
                >
                  <div className="p-5 border-b border-[#EEEEEE] flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#242921] uppercase tracking-wider">
                        Cashflow Items Bulan Ini ({budgetItems.length} Item)
                      </h4>
                      <p className="text-[11px] text-[#666E61]">
                        {isLocked 
                          ? "Bulan ini telah LOCKED. Data bersifat historis (read-only)." 
                          : "Drag item dari panel kanan ke area ini. Nominal otomatis terisi dari bulan lalu."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Copy Previous Month's Budget Action */}
                      {!isLocked && budgetItems.length === 0 && (
                        <button
                          onClick={handleCopyPreviousMonth}
                          className="px-3 py-1.5 rounded-xl bg-[#EAE2D6]/50 hover:bg-[#EAE2D6] text-[#242921] text-xs font-semibold border border-[#EEEEEE] transition flex items-center gap-1.5 shadow-xs"
                          title="Salin seluruh cashflow item dan nominal dari bulan sebelumnya"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#8B9A6E]" />
                          <span>Salin Item Bulan Lalu</span>
                        </button>
                      )}

                      {isLocked ? (
                        <span className="text-xs font-medium text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" />
                          Terkunci
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-[#8B9A6E] bg-[#8B9A6E]/15 px-3 py-1 rounded-full border border-[#8B9A6E]/30 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5" />
                          Mode Edit
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Empty state if no items in this month */}
                  {budgetItems.length === 0 ? (
                    <div className="p-12 text-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-[#EAE2D6] mx-auto flex items-center justify-center text-[#666E61]">
                        <Sliders className="w-7 h-7" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-[#242921]">Belum Ada Cashflow Item Bulan Ini</h5>
                        <p className="text-xs text-[#666E61] max-w-sm mx-auto mt-1">
                          Mau cepat? Klik tombol di bawah buat salin semua item dari bulan lalu, atau drag satuan dari kanan.
                        </p>
                      </div>

                      <button
                        onClick={handleCopyPreviousMonth}
                        disabled={isLocked}
                        className="px-4 py-2 bg-[#8B9A6E] hover:bg-[#7A895F] text-white text-xs font-bold rounded-xl transition shadow-xs inline-flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Salin Seluruh Cashflow Item Bulan Lalu ({selectedMonth})</span>
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#EEEEEE]">
                      {budgetItems.map((item) => {
                        const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
                        return (
                          <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[#EAE2D6]/20 transition">
                            <div className="flex items-center gap-3">
                              <GripVertical className="w-4 h-4 text-slate-300" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs text-[#242921]">{unit?.name}</span>
                                  <span className="text-[10px] text-[#666E61]">({unit?.code})</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-[#EAE2D6] text-[#666E61] font-semibold">
                                    {unit?.category || unit?.unit_type}
                                  </span>
                                </div>
                                <span className="text-[10px] text-[#666E61] mt-0.5 block">
                                  Urgency: <strong>{item.urgency}</strong>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="w-36">
                                <span className="text-[10px] text-[#666E61] block text-right font-medium mb-0.5">
                                  Budget Plan
                                </span>
                                {/* Formatted Currency Input for row */}
                                <CurrencyInput
                                  value={item.budget_amount}
                                  disabled={isLocked}
                                  onChange={(val) => updateItemBudgetAmount(item.id, val)}
                                  textAlign="right"
                                />
                              </div>
                              <button
                                onClick={() => removeItemFromCurrentMonth(item.id)}
                                disabled={isLocked}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition mt-3"
                                title="Hapus pos ini"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* RIGHT (4 cols): AVAILABLE MASTER UNITS PANEL (WITH PREVIOUS NOMINAL HINT) */}
                <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#242921]">
                      Available Master Units
                    </h3>
                    <span className="text-[10px] font-semibold bg-[#EAE2D6] px-2 py-0.5 rounded-full text-[#666E61]">
                      {availableUnits.length} Siap Pakai
                    </span>
                  </div>
                  <p className="text-xs text-[#666E61]">
                    <strong>Tarik (drag)</strong> item ke kiri. Nominal otomatis memakai nominal bulan sebelumnya.
                  </p>

                  <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                    {availableUnits.length === 0 ? (
                      <div className="p-6 text-center border border-dashed border-[#EEEEEE] rounded-2xl text-xs text-[#666E61]">
                        Semua master cashflow unit sudah masuk ke dalam periode ini.
                      </div>
                    ) : (
                      availableUnits.map((unit) => {
                        const prevNominal = getPreviousMonthUnitNominal(unit.id);

                        return (
                          <div
                            key={unit.id}
                            draggable={!isLocked}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", unit.id);
                            }}
                            className={`p-3 bg-[#EAE2D6]/20 border border-[#EEEEEE] hover:border-[#8B9A6E]/50 rounded-2xl flex items-center justify-between gap-2 transition ${
                              isLocked ? "cursor-not-allowed opacity-60" : "cursor-grab active:cursor-grabbing hover:shadow-xs"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-[#242921]">{unit.name}</span>
                                  <span className="text-[10px] text-[#666E61]">({unit.code})</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[9px] text-[#666E61]">
                                    {unit.category || unit.unit_type}
                                  </span>
                                  {prevNominal !== null && (
                                    <span className="text-[9px] font-bold text-[#8B9A6E] bg-[#8B9A6E]/10 px-1.5 py-0.2 rounded">
                                      {formatRupiah(prevNominal)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => addItemToCurrentMonth(unit.id)}
                              disabled={isLocked}
                              className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-[#8B9A6E] hover:bg-[#7A895F] text-white transition flex items-center gap-1 shadow-2xs"
                              title="Tambah ke anggaran (nominal bulan lalu)"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: REALIZATION MODULE */}
          {/* ============================================================== */}
          {activeTab === "realization" && (() => {
            const totalRealization = budgetItems.reduce(
              (acc, curr) => acc + (curr.realization_amount ?? curr.projection_amount ?? 0), 
              0
            );
            const totalBudget = budgetItems.reduce((acc, curr) => acc + curr.budget_amount, 0);
            const netDifference = totalRealization - totalBudget;
            const realizedCount = budgetItems.filter((i) => i.is_realized).length;
            const progressPct = budgetItems.length > 0 ? Math.round((realizedCount / budgetItems.length) * 100) : 0;
            const sisaKasAnggaran = (salaryValue + additionalValue) - totalRealization;

            return (
              <div className="space-y-5">
                {/* Realization Summary Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Metric 1: Budget Baseline */}
                  <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                    <span className="text-[11px] text-[#666E61] font-semibold block">Total Alokasi Budget</span>
                    <span className="text-lg font-bold text-[#242921] mt-2">{formatRupiah(totalBudget)}</span>
                    <span className="text-[10px] text-[#666E61] mt-1 block">Baseline awal bulan</span>
                  </div>

                  {/* Metric 2: Realization Running */}
                  <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                    <span className="text-[11px] text-[#666E61] font-semibold block">Total Realisasi Berjalan</span>
                    <span className="text-lg font-bold text-[#8B9A6E] mt-2">{formatRupiah(totalRealization)}</span>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                      <span className="font-semibold text-[#666E61]">Variansi:</span>
                      <span className={`font-bold ${netDifference > 0 ? "text-rose-600" : netDifference < 0 ? "text-[#8B9A6E]" : "text-[#666E61]"}`}>
                        {netDifference > 0 ? `+${formatRupiah(netDifference)} (Over)` : netDifference < 0 ? `${formatRupiah(netDifference)} (Hemat)` : "Sesuai"}
                      </span>
                    </div>
                  </div>

                  {/* Metric 3: Sisa Kas Tersedia */}
                  <div className={`rounded-3xl p-5 border shadow-xs flex flex-col justify-between ${
                    sisaKasAnggaran < 0 ? "bg-rose-50 border-rose-200" : "bg-[#FFFFFF] border-[#EEEEEE]"
                  }`}>
                    <span className="text-[11px] text-[#666E61] font-semibold block">Sisa Kas Tersedia</span>
                    <span className={`text-lg font-bold mt-2 ${sisaKasAnggaran < 0 ? "text-rose-600" : "text-[#242921]"}`}>
                      {formatRupiah(sisaKasAnggaran)}
                    </span>
                    <span className="text-[10px] text-[#666E61] mt-1 block">Dari Total Pemasukan ({formatRupiah(salaryValue + additionalValue)})</span>
                  </div>

                  {/* Metric 4: Progress Checklist Paid */}
                  <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#666E61] font-semibold block">Status Pembayaran</span>
                      <span className="text-xs font-bold text-[#8B9A6E]">{progressPct}%</span>
                    </div>
                    <div className="w-full bg-[#EEEEEE] h-2 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="bg-[#8B9A6E] h-full rounded-full transition-all duration-300" 
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[#666E61] mt-1 block">
                      <strong>{realizedCount}</strong> dari {budgetItems.length} item terlaksana
                    </span>
                  </div>
                </div>

                {/* Realization Table Workspace */}
                <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EEEEEE]">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#242921]">
                        Daftar Realisasi Cashflow Items ({budgetItems.length} Item)
                      </h3>
                      <p className="text-xs text-[#666E61] mt-0.5">
                        Update nominal riil jika ada perubahan harga/tagihan. Klik status untuk menandai item terbayar.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#666E61] bg-[#EAE2D6]/40 px-3 py-1 rounded-xl border border-[#EEEEEE]">
                        Sinkron real-time dengan Mobile PWA
                      </span>
                    </div>
                  </div>

                  {budgetItems.length === 0 ? (
                    <div className="p-12 text-center text-xs text-[#666E61]">
                      Belum ada cashflow item yang dibuat di bulan {selectedMonth}. Susun item di menu <strong>Budget</strong> terlebih dahulu.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#EEEEEE] text-[#666E61]">
                            <th className="py-2.5 px-3">Nama Cashflow Item</th>
                            <th className="py-2.5 px-3">Kategori</th>
                            <th className="py-2.5 px-3">Urgency</th>
                            <th className="py-2.5 px-3">Budget Plan</th>
                            <th className="py-2.5 px-3 w-40">Realisasi Berjalan</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-right">Selisih</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE] text-[#242921]">
                          {budgetItems.map((item) => {
                            const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
                            const currentRealization = item.realization_amount ?? item.projection_amount ?? 0;
                            const diff = currentRealization - item.budget_amount;

                            return (
                              <tr key={item.id} className="hover:bg-[#EAE2D6]/20 transition">
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-xs text-[#242921]">{unit?.name}</div>
                                  <div className="text-[10px] text-[#666E61]">{unit?.code}</div>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#EAE2D6] text-[#666E61] font-semibold">
                                    {unit?.category || unit?.unit_type}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className={`text-[10px] font-bold ${
                                    item.urgency === "HIGHEST"
                                      ? "text-rose-600"
                                      : item.urgency === "HIGH"
                                      ? "text-amber-700"
                                      : "text-[#666E61]"
                                  }`}>
                                    {item.urgency}
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-medium text-[#242921]">
                                  {formatRupiah(item.budget_amount)}
                                </td>
                                <td className="py-3 px-3">
                                  <CurrencyInput
                                    value={currentRealization}
                                    disabled={isLocked}
                                    onChange={(val) => updateItemRealization(item.id, val)}
                                    textAlign="right"
                                  />
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    onClick={() => toggleItemRealized(item.id)}
                                    disabled={isLocked}
                                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition flex items-center justify-center gap-1 mx-auto ${
                                      item.is_realized
                                        ? "bg-[#8B9A6E]/15 text-[#8B9A6E] hover:bg-[#8B9A6E]/25 border border-[#8B9A6E]/30"
                                        : "bg-[#EEEEEE] text-[#666E61] hover:bg-slate-200 border border-slate-300"
                                    }`}
                                    title="Klik untuk ubah status pembayaran"
                                  >
                                    {item.is_realized ? (
                                      <>
                                        <Check className="w-3 h-3 text-[#8B9A6E]" />
                                        <span>Terbayar</span>
                                      </>
                                    ) : (
                                      <span>Pending</span>
                                    )}
                                  </button>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  {diff === 0 ? (
                                    <span className="text-[#666E61] font-medium text-[11px]">Sesuai</span>
                                  ) : diff > 0 ? (
                                    <span className="text-rose-600 font-bold text-[11px]">
                                      +{formatRupiah(diff)}
                                    </span>
                                  ) : (
                                    <span className="text-[#8B9A6E] font-bold text-[11px]">
                                      {formatRupiah(diff)}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ============================================================== */}
          {/* TAB 3: ACTUAL MODULE */}
          {/* ============================================================== */}
          {activeTab === "actual" && (
            <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
                <div>
                  <h3 className="text-sm font-bold text-[#242921]">Historical Actual Settlement</h3>
                  <p className="text-xs text-[#666E61]">
                    Data yang sudah membeku saat bulan terkunci. Menjadi acuan evaluasi keuangan tahunan.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#666E61] block">Total Actual Spending</span>
                  <span className="text-sm font-bold text-[#242921]">
                    {formatRupiah(budgetItems.reduce((acc, curr) => acc + curr.actual_amount, 0))}
                  </span>
                </div>
              </div>

              {isLocked ? (
                <div className="bg-[#8B9A6E]/10 border border-[#8B9A6E]/30 rounded-2xl p-3 flex items-center gap-2 text-xs text-[#8B9A6E] font-medium">
                  <Lock className="w-4 h-4 text-[#8B9A6E]" />
                  <span>Periode ini telah <strong>LOCKED</strong>. Seluruh mutasi di mobile telah dimatikan dan tersimpan sebagai data historis permanen.</span>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-2 text-xs text-amber-800">
                  <div className="flex items-center gap-2">
                    <Unlock className="w-4 h-4 text-amber-600" />
                    <span>Periode masih <strong>ACTIVE</strong>. Klik tombol kunci untuk membekukan realisasi bulan ini menjadi Actual.</span>
                  </div>
                  <button
                    onClick={lockCurrentMonth}
                    className="px-3 py-1 bg-[#8B9A6E] text-white rounded-xl font-semibold text-[11px]"
                  >
                    Kunci Sekarang
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EEEEEE] text-[#666E61]">
                      <th className="py-2.5 px-3">Cashflow Item</th>
                      <th className="py-2.5 px-3">Budget Awal</th>
                      <th className="py-2.5 px-3">Actual Final</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Variansi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEEEEE] text-[#242921]">
                    {budgetItems.map((item) => {
                      const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
                      const variance = item.actual_amount - item.budget_amount;

                      return (
                        <tr key={item.id} className="hover:bg-[#EAE2D6]/20">
                          <td className="py-3 px-3 font-semibold">{unit?.name}</td>
                          <td className="py-3 px-3">{formatRupiah(item.budget_amount)}</td>
                          <td className="py-3 px-3 font-bold text-[#8B9A6E]">{formatRupiah(item.actual_amount)}</td>
                          <td className="py-3 px-3">
                            <span className="text-[10px] font-semibold text-[#666E61]">
                              {item.is_realized ? "Terbayar" : "Pending"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-medium">
                            {variance === 0 ? "0" : formatRupiah(variance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: CASHFLOW ITEMS (MASTER DATA) */}
          {/* ============================================================== */}
          {activeTab === "cashflow-items" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Input New Unit (4 cols) */}
              <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold text-[#242921] uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#8B9A6E]" />
                  Tambah Master Cashflow Item
                </h3>

                <form onSubmit={handleCreateUnit} className="space-y-3 text-xs">
                  <div>
                    <label className="text-[#666E61] block mb-1 font-medium">Kode Unit</label>
                    <input
                      type="text"
                      placeholder="e.g. CF-ZAKAT"
                      value={unitCode}
                      onChange={(e) => setUnitCode(e.target.value)}
                      className="w-full bg-[#EAE2D6]/30 border border-[#EEEEEE] rounded-xl px-3 py-1.5 text-xs text-[#242921]"
                    />
                  </div>

                  <div>
                    <label className="text-[#666E61] block mb-1 font-medium">Nama Cashflow Item</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Listrik Kantor"
                      value={unitName}
                      onChange={(e) => setUnitName(e.target.value)}
                      className="w-full bg-[#EAE2D6]/30 border border-[#EEEEEE] rounded-xl px-3 py-1.5 text-xs text-[#242921]"
                    />
                  </div>

                  <div>
                    <label className="text-[#666E61] block mb-1 font-medium">Tipe Item</label>
                    <select
                      value={unitType}
                      onChange={(e) => setUnitType(e.target.value as UnitType)}
                      className="w-full bg-[#EAE2D6]/30 border border-[#EEEEEE] rounded-xl px-3 py-1.5 text-xs text-[#242921]"
                    >
                      <option value="EXPENSE">EXPENSE (Pengeluaran Rutin)</option>
                      <option value="ASSET">ASSET (Alokasi Tabungan/Investasi)</option>
                      <option value="INCOME">INCOME (Pemasukan)</option>
                    </select>
                  </div>

                  {unitType === "EXPENSE" && (
                    <div>
                      <label className="text-[#666E61] block mb-1 font-medium">Kategori</label>
                      <select
                        value={unitCategory}
                        onChange={(e) => setUnitCategory(e.target.value as ExpenseCategory)}
                        className="w-full bg-[#EAE2D6]/30 border border-[#EEEEEE] rounded-xl px-3 py-1.5 text-xs text-[#242921]"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.code}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-[#666E61] block mb-1 font-medium">Default Urgency</label>
                    <select
                      value={unitUrgency}
                      onChange={(e) => setUnitUrgency(e.target.value as UrgencyLevel)}
                      className="w-full bg-[#EAE2D6]/30 border border-[#EEEEEE] rounded-xl px-3 py-1.5 text-xs text-[#242921]"
                    >
                      <option value="HIGHEST">HIGHEST (Urgent)</option>
                      <option value="HIGH">HIGH</option>
                      <option value="NORMAL">NORMAL</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#8B9A6E] hover:bg-[#7A895F] text-white font-semibold text-xs rounded-xl transition shadow-xs"
                  >
                    Simpan ke Master
                  </button>
                </form>
              </div>

              {/* Master Units Table (8 cols) */}
              <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs">
                <h3 className="text-xs font-bold text-[#242921] uppercase tracking-wider mb-3">
                  Katalog Master Cashflow Items ({cashflowUnits.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#EEEEEE] text-[#666E61]">
                        <th className="py-2.5 px-3">Kode</th>
                        <th className="py-2.5 px-3">Nama Item</th>
                        <th className="py-2.5 px-3">Tipe</th>
                        <th className="py-2.5 px-3">Kategori</th>
                        <th className="py-2.5 px-3">Urgency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEEEEE] text-[#242921]">
                      {cashflowUnits.map((u) => (
                        <tr key={u.id} className="hover:bg-[#EAE2D6]/20">
                          <td className="py-2.5 px-3 font-mono text-[#666E61]">{u.code}</td>
                          <td className="py-2.5 px-3 font-semibold">{u.name}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#EAE2D6] text-[#666E61]">
                              {u.unit_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[#666E61]">{u.category || "-"}</td>
                          <td className="py-2.5 px-3 font-medium">{u.default_urgency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 5: MASTER CATEGORIES & LABELS */}
          {/* ============================================================== */}
          {activeTab === "categories" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Input New Category (4 cols) */}
              <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold text-[#242921] uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#8B9A6E]" />
                  Tambah Master Kategori
                </h3>

                <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
                  <div>
                    <label className="text-[#666E61] block mb-1 font-medium">Nama Kategori</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Hobi & Gaming"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      className="w-full bg-[#EAE2D6]/30 border border-[#EEEEEE] rounded-xl px-3 py-1.5 text-xs text-[#242921]"
                    />
                  </div>

                  <div>
                    <label className="text-[#666E61] block mb-1 font-medium">Kode Kategori (Opsional)</label>
                    <input
                      type="text"
                      placeholder="e.g. HOBI"
                      value={catCode}
                      onChange={(e) => setCatCode(e.target.value)}
                      className="w-full bg-[#EAE2D6]/30 border border-[#EEEEEE] rounded-xl px-3 py-1.5 text-xs text-[#242921]"
                    />
                  </div>

                  <div>
                    <label className="text-[#666E61] block mb-1 font-medium">Pilihan Warna (Untuk Pie Chart & Badge)</label>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="color"
                        value={catColor}
                        onChange={(e) => setCatColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-[#EEEEEE] p-0.5 bg-transparent"
                      />
                      <span className="font-mono text-xs text-[#666E61]">{catColor}</span>
                    </div>
                    {/* Swatches presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        "#8B9A6E", // Sage
                        "#C2A382", // Sand
                        "#D8A47F", // Clay
                        "#7E8D85", // Slate
                        "#B3A394", // Taupe
                        "#A4B494", // Olive
                        "#9381FF", // Purple
                        "#4E79A7", // Ocean Blue
                        "#E07A5F", // Terracotta
                        "#F2CC8F", // Honey
                      ].map((swatch) => (
                        <button
                          key={swatch}
                          type="button"
                          onClick={() => setCatColor(swatch)}
                          style={{ backgroundColor: swatch }}
                          className={`w-5 h-5 rounded-full transition-transform ${
                            catColor === swatch ? "ring-2 ring-[#242921] scale-110" : "hover:scale-105"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[#666E61] block mb-1 font-medium">Deskripsi Singkat</label>
                    <textarea
                      rows={2}
                      placeholder="Keterangan alokasi kategori ini..."
                      value={catDesc}
                      onChange={(e) => setCatDesc(e.target.value)}
                      className="w-full bg-[#EAE2D6]/30 border border-[#EEEEEE] rounded-xl px-3 py-1.5 text-xs text-[#242921]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-[#8B9A6E] hover:bg-[#7A895F] text-white font-semibold text-xs rounded-xl transition shadow-xs"
                  >
                    Simpan Kategori Baru
                  </button>
                </form>
              </div>

              {/* Master Categories Table (8 cols) */}
              <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#242921] uppercase tracking-wider">
                    Daftar Master Kategori ({categories.length})
                  </h3>
                  <span className="text-[10px] text-[#666E61]">
                    Tersinkron otomatis dengan Pie Chart Outcome & Cashflow Items
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#EEEEEE] text-[#666E61]">
                        <th className="py-2.5 px-3">Warna</th>
                        <th className="py-2.5 px-3">Nama Kategori</th>
                        <th className="py-2.5 px-3">Kode</th>
                        <th className="py-2.5 px-3">Deskripsi</th>
                        <th className="py-2.5 px-3 text-center">Penggunaan</th>
                        <th className="py-2.5 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEEEEE] text-[#242921]">
                      {categories.map((c) => {
                        const usageCount = cashflowUnits.filter((u) => u.category === c.code).length;

                        return (
                          <tr key={c.id} className="hover:bg-[#EAE2D6]/20 transition">
                            <td className="py-3 px-3">
                              <span
                                className="w-4 h-4 rounded-full inline-block shadow-2xs border border-white"
                                style={{ backgroundColor: c.color }}
                              />
                            </td>
                            <td className="py-3 px-3 font-bold text-[#242921]">{c.name}</td>
                            <td className="py-3 px-3 font-mono text-[11px] text-[#666E61]">{c.code}</td>
                            <td className="py-3 px-3 text-[#666E61] max-w-xs">{c.description || "-"}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAE2D6] text-[#242921]">
                                {usageCount} Item
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => deleteCategory(c.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Hapus kategori"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 6: ASSETS MODULE */}
          {/* ============================================================== */}
          {activeTab === "assets" && (
            <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
                <div>
                  <h3 className="text-sm font-bold text-[#242921]">Master Portofolio & Likuiditas Aset</h3>
                  <p className="text-xs text-[#666E61]">
                    3 Tier Likuiditas: <strong>Liquid (Kas)</strong>, <strong>Semi-Liquid (Investasi)</strong>, dan <strong>Illiquid (Pensiun/BPJS)</strong>.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#EEEEEE] text-[#666E61]">
                      <th className="py-2.5 px-3">Nama Aset</th>
                      <th className="py-2.5 px-3">Tier Likuiditas</th>
                      <th className="py-2.5 px-3">Modal Pokok</th>
                      <th className="py-2.5 px-3">Yield / Return</th>
                      <th className="py-2.5 px-3">Total Value</th>
                      <th className="py-2.5 px-3">Goal Bucket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEEEEE] text-[#242921]">
                    {assets.map((ast) => (
                      <tr key={ast.id} className="hover:bg-[#EAE2D6]/20">
                        <td className="py-3 px-3 font-bold">{ast.name}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            ast.liquidity_tier === "LIQUID"
                              ? "bg-[#8B9A6E]/15 text-[#8B9A6E]"
                              : ast.liquidity_tier === "SEMI_LIQUID"
                              ? "bg-[#C2A382]/20 text-[#856545]"
                              : "bg-[#EAE2D6] text-[#666E61]"
                          }`}>
                            {ast.liquidity_tier}
                          </span>
                        </td>
                        <td className="py-3 px-3">{formatRupiah(ast.main_value)}</td>
                        <td className="py-3 px-3 text-[#8B9A6E] font-semibold">
                          {ast.generating_rate > 0 ? `+${ast.generating_rate}%` : "-"}
                        </td>
                        <td className="py-3 px-3 font-bold text-[#242921]">{formatRupiah(ast.total_value)}</td>
                        <td className="py-3 px-3 text-[#666E61]">{ast.goal_bucket || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
