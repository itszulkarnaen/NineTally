"use client";

import React, { useState, useEffect } from "react";
import { useApp, getNextMonthKey, getPreviousMonthKey } from "@/context/AppContext";
import { formatRupiah } from "@/lib/utils";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";
import {
  Sliders,
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  GripVertical,
  Check,
  Copy,
  Sparkles,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Settings2,
} from "lucide-react";

export const BudgetTab: React.FC = () => {
  const {
    cashflowUnits,
    selectedMonth,
    currentMonthData,
    addItemToCurrentMonth,
    removeItemFromCurrentMonth,
    updateItemBudgetAmount,
    updateMonthIncome,
    saveCurrentMonthBudget,
    copyPreviousMonthBudget,
    getPreviousMonthUnitNominal,
    payrollSettings,
    updatePayrollSettings,
    transactions,
  } = useApp();

  const budgetItems = currentMonthData.items;

  const [isSavedToast, setIsSavedToast] = useState(false);
  const [isCopiedToast, setIsCopiedToast] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingRemoveItem, setPendingRemoveItem] = useState<{ id: string; name: string } | null>(null);

  const prevMonthKey = getPreviousMonthKey(selectedMonth);
  const nextMonthKey = getNextMonthKey(selectedMonth);

  // Payday Engine: Identify target INCOME unit
  const targetIncomeUnit =
    cashflowUnits.find((u) => u.id === payrollSettings.target_unit_id) ||
    cashflowUnits.find((u) => u.unit_type === "INCOME");
  const incomeUnitId = targetIncomeUnit ? targetIncomeUnit.id : payrollSettings.target_unit_id;
  const paydayTxInCurrentMonth = transactions.find(
    (t) =>
      t.period_id === selectedMonth &&
      (t.cashflow_unit_id === incomeUnitId || (t.notes && t.notes.toLowerCase().includes("gaji")))
  );

  // Auto-ensure CF Unit Gaji (targetIncomeUnit) is in current month's items so it can be recorded at end of selectedMonth for nextMonthKey
  useEffect(() => {
    if (!targetIncomeUnit) return;
    const hasSalaryItem = budgetItems.some((item) => item.cashflow_unit_id === targetIncomeUnit.id);
    if (!hasSalaryItem && budgetItems.length > 0 && payrollSettings.monthly_salary > 0) {
      addItemToCurrentMonth(targetIncomeUnit.id, payrollSettings.monthly_salary);
    }
  }, [selectedMonth, targetIncomeUnit?.id, budgetItems.length]);

  // Separate INCOME items vs Outflow (EXPENSE & ASSET) items
  const outflowItems = budgetItems.filter((item) => {
    const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
    return unit?.unit_type !== "INCOME";
  });

  const incomeItems = budgetItems.filter((item) => {
    const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
    return unit?.unit_type === "INCOME";
  });

  // Rollover Salary Logic:
  // Gaji dicatat di bulan berjalan (e.g. Oktober), namun digunakan untuk anggaran bulan berikutnya (e.g. November).
  // Maka anggaran bulan selectedMonth (e.g. November) berasal dari Gaji bulan prevMonthKey (e.g. Oktober).
  const prevMonthSalaryNominal = targetIncomeUnit
    ? getPreviousMonthUnitNominal(targetIncomeUnit.id)
    : null;

  const baseSalaryForCurrentMonth = payrollSettings.next_month_allocation
    ? prevMonthSalaryNominal ?? (currentMonthData.salary_budget || payrollSettings.monthly_salary)
    : 0;

  // Additional INCOME units in current month that are NOT the rollover salary unit (or all INCOME units if next_month_allocation is off)
  const additionalIncomeFromUnits = incomeItems.reduce((acc, item) => {
    const isRolloverSalary =
      payrollSettings.next_month_allocation && item.cashflow_unit_id === incomeUnitId;
    return isRolloverSalary ? acc : acc + item.budget_amount;
  }, 0);

  const totalIncomeAvailable = baseSalaryForCurrentMonth + additionalIncomeFromUnits;
  const totalBudgetPlanned = outflowItems.reduce((acc, curr) => acc + curr.budget_amount, 0);
  const remainingToAllocate = totalIncomeAvailable - totalBudgetPlanned;

  // Local state for Payroll Engine UI
  const [isPayrollSettingsOpen, setIsPayrollSettingsOpen] = useState(false);
  const [payrollSalaryInput, setPayrollSalaryInput] = useState<number>(payrollSettings.monthly_salary);
  const [paydayDayInput, setPaydayDayInput] = useState<number>(payrollSettings.payday_day);
  const [isLastDayInput, setIsLastDayInput] = useState<boolean>(payrollSettings.is_last_day);
  const [payrollTargetBank, setPayrollTargetBank] = useState<"BCA" | "JAGO">(payrollSettings.target_bank);
  const [payrollTargetUnitId, setPayrollTargetUnitId] = useState<string>(payrollSettings.target_unit_id);
  const [payrollAutoPost, setPayrollAutoPost] = useState<boolean>(payrollSettings.auto_post_transaction);
  const [payrollNextMonthAlloc, setPayrollNextMonthAlloc] = useState<boolean>(payrollSettings.next_month_allocation);
  const [payrollToastMsg, setPayrollToastMsg] = useState<string | null>(null);

  // Sync payroll inputs when context settings change
  useEffect(() => {
    setPayrollSalaryInput(payrollSettings.monthly_salary);
    setPaydayDayInput(payrollSettings.payday_day);
    setIsLastDayInput(payrollSettings.is_last_day);
    setPayrollTargetBank(payrollSettings.target_bank);
    setPayrollTargetUnitId(payrollSettings.target_unit_id);
    setPayrollAutoPost(payrollSettings.auto_post_transaction);
    setPayrollNextMonthAlloc(payrollSettings.next_month_allocation);
  }, [payrollSettings]);

  const handleSavePayrollSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updatePayrollSettings({
      monthly_salary: payrollSalaryInput,
      payday_day: paydayDayInput,
      is_last_day: isLastDayInput,
      target_bank: payrollTargetBank,
      target_unit_id: payrollTargetUnitId,
      auto_post_transaction: payrollAutoPost,
      next_month_allocation: payrollNextMonthAlloc,
    });
    setPayrollToastMsg("Pengaturan siklus gajian berhasil disimpan!");
    setIsPayrollSettingsOpen(false);
    setTimeout(() => setPayrollToastMsg(null), 3000);
  };

  // Handle explicit Save Budget
  const handleSaveBudget = () => {
    updateMonthIncome(baseSalaryForCurrentMonth, additionalIncomeFromUnits);
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
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const unitId = e.dataTransfer.getData("text/plain");
    if (unitId) {
      addItemToCurrentMonth(unitId);
    }
  };

  // Filter master units that are not yet in the current month's budget
  const availableUnits = cashflowUnits.filter(
    (u) => !budgetItems.some((item) => item.cashflow_unit_id === u.id)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT (8 cols): UNIFIED INCOME SETUP & BUDGET ITEMS WORKSPACE */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`lg:col-span-8 bg-[#FFFFFF] border rounded-3xl overflow-hidden shadow-xs transition-colors ${
          isDragOver ? "border-dashed border-2 border-[#2196F3] bg-[#2196F3]/5" : "border-[#EEEEEE]"
        }`}
      >
        {/* Unified Card Header with Save Button */}
        <div className="p-5 border-b border-[#EEEEEE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-[#242921] uppercase tracking-wider">
              Setup Pendapatan & Anggaran ({selectedMonth})
            </h4>
            <p className="text-[11px] text-[#666E61] mt-0.5">
              Atur pemasukan dan susun alokasi cashflow items bulanan dalam satu panel.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {isSavedToast && (
              <span className="text-xs font-semibold text-[#2196F3] flex items-center gap-1 bg-[#2196F3]/15 px-3 py-1.5 rounded-xl border border-[#2196F3]/30 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                Tersimpan!
              </span>
            )}
            {isCopiedToast && (
              <span className="text-xs font-semibold text-blue-700 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 animate-in fade-in">
                <Sparkles className="w-3.5 h-3.5" />
                Disalin!
              </span>
            )}
            {budgetItems.length === 0 && (
              <button
                onClick={handleCopyPreviousMonth}
                className="px-3 py-1.5 rounded-xl bg-[#E3F2FD]/50 hover:bg-[#E3F2FD] text-[#242921] text-xs font-semibold border border-[#EEEEEE] transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Salin seluruh cashflow item dan nominal dari bulan sebelumnya"
              >
                <Copy className="w-3.5 h-3.5 text-[#2196F3]" />
                <span>Salin Bulan Lalu</span>
              </button>
            )}
            <button
              onClick={handleSaveBudget}
              className="px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer bg-[#2196F3] hover:bg-[#1E88E5] text-white"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Budget</span>
            </button>
          </div>
        </div>

        {/* Simplified Summary & Payday Settings Section (No Manual Income Inputs) */}
        <div className="p-5 bg-[#F8FAFC]/60 border-b border-[#EEEEEE] space-y-3">
          {/* 3 Summary Pills: Modal Anggaran (Gaji Bulan Lalu + Income), Total Dialokasikan, Belum Dialokasikan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#FFFFFF] rounded-2xl p-3 border border-[#EEEEEE] flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#666E61] font-medium">Modal Anggaran</span>
                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                  {payrollSettings.next_month_allocation ? `Dari Gaji ${prevMonthKey}` : "Bulan Ini"}
                </span>
              </div>
              <span className="text-xs font-bold text-[#242921] mt-1">{formatRupiah(totalIncomeAvailable)}</span>
            </div>

            <div className="bg-[#FFFFFF] rounded-2xl p-3 border border-[#EEEEEE] flex flex-col justify-between">
              <span className="text-[11px] text-[#666E61] font-medium">Total Dialokasikan</span>
              <span className="text-xs font-bold text-[#242921] mt-1">{formatRupiah(totalBudgetPlanned)}</span>
            </div>

            <div
              className={`rounded-2xl p-3 border flex flex-col justify-between ${
                remainingToAllocate < 0
                  ? "bg-rose-50 border-rose-200"
                  : "bg-[#E3F2FD]/40 border-[#2196F3]/20"
              }`}
            >
              <span className="text-[11px] text-[#666E61] font-medium">Belum Dialokasikan</span>
              <span
                className={`text-xs font-bold mt-1 ${
                  remainingToAllocate < 0 ? "text-rose-600" : "text-[#2196F3]"
                }`}
              >
                {formatRupiah(remainingToAllocate)}
              </span>
            </div>
          </div>

          {/* Simplified Payday Settings Bar (Only Settings, No Execution Button) */}
          <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl px-3.5 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <CalendarClock className="w-4 h-4 text-[#2196F3] shrink-0" />
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-xs font-bold text-[#242921]">Siklus Gajian Otomatis</span>
                  <span className="text-[10px] font-medium text-[#666E61] bg-[#F8FAFC] px-2 py-0.5 rounded-lg border border-[#EEEEEE]">
                    {payrollSettings.is_last_day ? "Akhir Bulan" : `Tgl ${payrollSettings.payday_day}`} • {formatRupiah(payrollSettings.monthly_salary)}
                  </span>
                  {paydayTxInCurrentMonth && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Tercatat
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPayrollSettingsOpen(!isPayrollSettingsOpen)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-xl transition flex items-center gap-1 border shrink-0 cursor-pointer ${
                  isPayrollSettingsOpen
                    ? "bg-[#2196F3] text-white border-[#2196F3]"
                    : "bg-[#F8FAFC] hover:bg-[#EEEEEE]/60 text-[#242921] border-[#EEEEEE]"
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Pengaturan</span>
                {isPayrollSettingsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {payrollToastMsg && (
              <div className="mt-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{payrollToastMsg}</span>
              </div>
            )}

            {isPayrollSettingsOpen && (
              <form
                onSubmit={handleSavePayrollSettings}
                className="mt-3 pt-3 border-t border-[#EEEEEE] space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-[#666E61] font-semibold block mb-1">
                      Nominal Gaji Pokok
                    </label>
                    <CurrencyInput
                      value={payrollSalaryInput}
                      onChange={setPayrollSalaryInput}
                      textAlign="left"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#666E61] font-semibold block mb-1">
                      Tanggal Gajian Rutin
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={isLastDayInput ? "last_day" : paydayDayInput.toString()}
                        onChange={(e) => {
                          if (e.target.value === "last_day") {
                            setIsLastDayInput(true);
                          } else {
                            setIsLastDayInput(false);
                            setPaydayDayInput(parseInt(e.target.value, 10) || 25);
                          }
                        }}
                        className="w-full text-xs font-medium bg-[#F8FAFC] border border-[#EEEEEE] rounded-xl px-3 py-2 text-[#242921] focus:outline-none focus:border-[#2196F3]"
                      >
                        <option value="last_day">Akhir Bulan (28/30/31)</option>
                        <option value="25">Tanggal 25</option>
                        <option value="27">Tanggal 27</option>
                        <option value="28">Tanggal 28</option>
                        <option value="1">Tanggal 1</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-[#666E61] font-semibold block mb-1">
                      Rekening Masuk
                    </label>
                    <select
                      value={payrollTargetBank}
                      onChange={(e) => setPayrollTargetBank(e.target.value as "BCA" | "JAGO")}
                      className="w-full text-xs font-medium bg-[#F8FAFC] border border-[#EEEEEE] rounded-xl px-2.5 py-2 text-[#242921] focus:outline-none focus:border-[#2196F3]"
                    >
                      <option value="BCA">BCA Utama</option>
                      <option value="JAGO">Bank Jago</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-[#666E61] font-semibold block mb-1">
                      Pos Income
                    </label>
                    <select
                      value={payrollTargetUnitId}
                      onChange={(e) => setPayrollTargetUnitId(e.target.value)}
                      className="w-full text-xs font-medium bg-[#F8FAFC] border border-[#EEEEEE] rounded-xl px-2.5 py-2 text-[#242921] focus:outline-none focus:border-[#2196F3]"
                    >
                      {cashflowUnits.filter((u) => u.unit_type === "INCOME").length > 0 ? (
                        cashflowUnits
                          .filter((u) => u.unit_type === "INCOME")
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))
                      ) : (
                        <option value="cf-inc-1">Gaji Kantor</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#EEEEEE]">
                  <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-[#F8FAFC]">
                    <input
                      type="checkbox"
                      checked={payrollNextMonthAlloc}
                      onChange={(e) => setPayrollNextMonthAlloc(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#2196F3] border-slate-300"
                    />
                    <span className="text-xs font-medium text-[#242921]">
                      Alokasi otomatis ke budget bulan depan
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-[#F8FAFC]">
                    <input
                      type="checkbox"
                      checked={payrollAutoPost}
                      onChange={(e) => setPayrollAutoPost(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#2196F3] border-slate-300"
                    />
                    <span className="text-xs font-medium text-[#242921]">
                      Auto-catat transaksi saat tanggal gajian
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPayrollSettingsOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium text-[#666E61] hover:text-[#242921] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#2196F3] hover:bg-[#1E88E5] text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Pengaturan</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Budget Items List Header */}
        <div className="px-5 py-3 bg-[#FFFFFF] border-b border-[#EEEEEE] flex items-center justify-between">
          <span className="text-xs font-bold text-[#242921] uppercase tracking-wider">
            Daftar Cashflow Items Bulan Ini ({budgetItems.length} Item)
          </span>
          <span className="text-[11px] text-[#666E61]">
            Drag item dari kanan ke area ini
          </span>
        </div>

        {/* Budget Items List */}
        {budgetItems.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#E3F2FD] mx-auto flex items-center justify-center text-[#666E61]">
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
              className="px-4 py-2 bg-[#2196F3] hover:bg-[#1E88E5] text-white text-xs font-bold rounded-xl transition shadow-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>Salin Seluruh Cashflow Item Bulan Lalu ({selectedMonth})</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#EEEEEE]">
            {budgetItems.map((item) => {
              const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
              const isIncome = unit?.unit_type === "INCOME";

              return (
                <div
                  key={item.id}
                  className={`p-4 flex items-center justify-between gap-4 transition ${
                    isIncome ? "bg-emerald-50/30 hover:bg-emerald-50/60" : "hover:bg-[#E3F2FD]/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-slate-300" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-[#242921]">{unit?.name}</span>
                        <span className="text-[10px] text-[#666E61]">({unit?.code})</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-lg font-semibold ${
                            isIncome
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-[#E3F2FD] text-[#666E61]"
                          }`}
                        >
                          {unit?.category || unit?.unit_type}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#666E61] mt-0.5 block">
                        {isIncome ? (
                          <>Pemasukan</>
                        ) : (
                          <>
                            Urgency: <strong>{item.urgency}</strong>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-40">
                      <span
                        className={`text-[10px] block text-right font-medium mb-0.5 ${
                          isIncome ? "text-emerald-700 font-semibold" : "text-[#666E61]"
                        }`}
                      >
                        {isIncome ? "Target Pemasukan" : "Budget Plan"}
                      </span>
                      <CurrencyInput
                        value={item.budget_amount}
                        onChange={(val) => updateItemBudgetAmount(item.id, val)}
                        textAlign="right"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingRemoveItem({
                          id: item.id,
                          name: unit?.name || "Pos Anggaran",
                        })
                      }
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition mt-3 cursor-pointer"
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

      {/* RIGHT (4 cols): AVAILABLE MASTER UNITS PANEL */}
      <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#242921]">
            Available Master Units
          </h3>
          <span className="text-[10px] font-semibold bg-[#E3F2FD] px-2 py-0.5 rounded-full text-[#666E61]">
            {availableUnits.length} Siap Pakai
          </span>
        </div>
        <p className="text-xs text-[#666E61]">
          <strong>Tarik (drag)</strong> item ke kiri. Nominal otomatis memakai nominal bulan sebelumnya.
        </p>

        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
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
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", unit.id);
                  }}
                  className="p-3 bg-[#E3F2FD]/20 border border-[#EEEEEE] hover:border-[#2196F3]/50 rounded-2xl flex items-center justify-between gap-2 transition cursor-grab active:cursor-grabbing hover:shadow-xs"
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
                          <span className="text-[9px] font-bold text-[#2196F3] bg-[#2196F3]/10 px-1.5 py-0.2 rounded">
                            {formatRupiah(prevNominal)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => addItemToCurrentMonth(unit.id)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-xl bg-[#2196F3] hover:bg-[#1E88E5] text-white transition flex items-center gap-1 shadow-2xs cursor-pointer"
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

      <ConfirmDeleteModal
        isOpen={Boolean(pendingRemoveItem)}
        title="Hapus Pos Anggaran?"
        message={
          pendingRemoveItem
            ? `Yakin mau menghapus '${pendingRemoveItem.name}' dari daftar anggaran bulan ${selectedMonth}?`
            : ""
        }
        onConfirm={() => {
          if (pendingRemoveItem) {
            removeItemFromCurrentMonth(pendingRemoveItem.id);
            setPendingRemoveItem(null);
          }
        }}
        onCancel={() => setPendingRemoveItem(null)}
      />
    </div>
  );
};
