"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { formatRupiah } from "@/lib/utils";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import {
  Sliders,
  CheckCircle2,
  Plus,
  Trash2,
  Lock,
  Save,
  GripVertical,
  Check,
  Copy,
  Sparkles,
  CalendarClock,
  Zap,
  ChevronDown,
  ChevronUp,
  Settings2,
  SlidersHorizontal,
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
    triggerPaydayExecution,
    transactions,
  } = useApp();

  const isLocked = currentMonthData.status === "LOCKED";
  const budgetItems = currentMonthData.items;

  // Local state for income inputs
  const [salaryValue, setSalaryValue] = useState<number>(currentMonthData.salary_budget);
  const [additionalValue, setAdditionalValue] = useState<number>(currentMonthData.additional_budget);
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [isCopiedToast, setIsCopiedToast] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Sync income inputs when month changes
  useEffect(() => {
    setSalaryValue(currentMonthData.salary_budget);
    setAdditionalValue(currentMonthData.additional_budget);
  }, [selectedMonth, currentMonthData.salary_budget, currentMonthData.additional_budget]);

  // Financial Calculations for Budget
  const totalIncomeAvailable = salaryValue + additionalValue;
  const totalBudgetPlanned = budgetItems.reduce((acc, curr) => acc + curr.budget_amount, 0);
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
    setTimeout(() => setPayrollToastMsg(null), 3000);
  };

  const handleManualTriggerPayday = () => {
    const res = triggerPaydayExecution(selectedMonth);
    setPayrollToastMsg(res.message);
    setTimeout(() => setPayrollToastMsg(null), 4500);
  };

  // Payday Engine: Check whether payday transaction has been logged for current selectedMonth
  const targetIncomeUnit =
    cashflowUnits.find((u) => u.id === payrollSettings.target_unit_id) ||
    cashflowUnits.find((u) => u.unit_type === "INCOME");
  const incomeUnitId = targetIncomeUnit ? targetIncomeUnit.id : payrollSettings.target_unit_id;
  const paydayTxInCurrentMonth = transactions.find(
    (t) =>
      t.period_id === selectedMonth &&
      (t.cashflow_unit_id === incomeUnitId || (t.notes && t.notes.toLowerCase().includes("gaji")))
  );

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

  // Filter master units that are not yet in the current month's budget
  const availableUnits = cashflowUnits.filter(
    (u) => !budgetItems.some((item) => item.cashflow_unit_id === u.id)
  );

  return (
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

          {/* Prominent Save Budget Button */}
          <div className="flex items-center gap-2">
            {isSavedToast && (
              <span className="text-xs font-semibold text-[#2196F3] flex items-center gap-1 bg-[#2196F3]/15 px-3 py-1.5 rounded-xl border border-[#2196F3]/30 animate-in fade-in">
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
              className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                isLocked
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-[#2196F3] hover:bg-[#1E88E5] text-white"
              }`}
            >
              <Save className="w-4 h-4" />
              <span>Simpan Budget</span>
            </button>
          </div>
        </div>

        {/* Formatted Currency Inputs for Gaji & Sisa Bulan Lalu */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <div className="bg-[#E3F2FD]/30 rounded-2xl p-3 border border-[#EEEEEE] flex flex-col justify-between">
            <span className="text-[10px] text-[#666E61] font-medium block">Total Rencana Dialokasikan</span>
            <span className="text-sm font-bold text-[#242921] mt-1">{formatRupiah(totalBudgetPlanned)}</span>
          </div>

          <div
            className={`rounded-2xl p-3 border flex flex-col justify-between ${
              remainingToAllocate < 0
                ? "bg-rose-50 border-rose-200"
                : "bg-[#2196F3]/10 border-[#2196F3]/20"
            }`}
          >
            <span className="text-[10px] text-[#666E61] font-medium block">Sisa Belum Dialokasikan</span>
            <span
              className={`text-sm font-bold mt-1 ${
                remainingToAllocate < 0 ? "text-rose-600" : "text-[#2196F3]"
              }`}
            >
              {formatRupiah(remainingToAllocate)}
            </span>
          </div>
        </div>

        {/* Payday & Payroll Engine Section */}
        <div className="pt-3 border-t border-[#EEEEEE]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#2196F3]/10 text-[#2196F3] flex items-center justify-center shrink-0">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#1E293B]">Siklus Gajian Otomatis</span>
                  <span className="text-[10px] font-semibold text-[#2196F3] bg-[#E3F2FD] px-2 py-0.5 rounded-full border border-[#90CAF9]/40">
                    Live on Last Month&apos;s Income
                  </span>
                  {paydayTxInCurrentMonth ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Gaji {selectedMonth} Tercatat (+{formatRupiah(paydayTxInCurrentMonth.amount)})
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 flex items-center gap-1">
                      Jadwal: {payrollSettings.is_last_day ? "Akhir Bulan" : `Tgl ${payrollSettings.payday_day}`} ({formatRupiah(payrollSettings.monthly_salary)})
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  {payrollSettings.next_month_allocation
                    ? `Gaji cair bulan ${selectedMonth} otomatis dialokasikan menjadi Anggaran Gaji bulan depan.`
                    : `Pencatatan transaksi gaji otomatis saat tanggal gajian tiba.`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleManualTriggerPayday}
                title="Eksekusi pencatatan gaji sekarang & alokasikan ke bulan depan"
                className="px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-[#2196F3] text-[#2196F3] bg-white hover:bg-[#2196F3]/10 shadow-xs cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-[#2196F3]" />
                <span>Eksekusi Gajian</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPayrollSettingsOpen(!isPayrollSettingsOpen)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border cursor-pointer ${
                  isPayrollSettingsOpen
                    ? "bg-[#2196F3] text-white border-[#2196F3]"
                    : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300"
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Pengaturan</span>
                {isPayrollSettingsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {payrollToastMsg && (
            <div className="mt-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 flex items-center gap-2 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{payrollToastMsg}</span>
            </div>
          )}

          {isPayrollSettingsOpen && (
            <form
              onSubmit={handleSavePayrollSettings}
              className="mt-3 bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-sm space-y-4 animate-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#2196F3]" />
                  Konfigurasi Payroll & Auto-Payday
                </span>
                <span className="text-[11px] text-slate-500">
                  Disimpan otomatis ke cloud & browser
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                    Nominal Gaji Pokok
                  </label>
                  <CurrencyInput
                    value={payrollSalaryInput}
                    onChange={setPayrollSalaryInput}
                    textAlign="left"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 font-semibold block mb-1">
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
                          setPaydayDayInput(parseInt(e.target.value, 10));
                        }
                      }}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:border-[#2196F3]"
                    >
                      <option value="last_day">Akhir Bulan (Last Day - 28/30/31)</option>
                      <option value="25">Tanggal 25</option>
                      <option value="27">Tanggal 27</option>
                      <option value="28">Tanggal 28</option>
                      <option value="1">Tanggal 1</option>
                      <option value="custom">Tanggal Tertentu...</option>
                    </select>
                    {!isLastDayInput && ![25, 27, 28, 1].includes(paydayDayInput) && (
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={paydayDayInput}
                        onChange={(e) => setPaydayDayInput(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-16 text-xs text-center font-bold bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-slate-800"
                        placeholder="Tgl"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                      Rekening Masuk
                    </label>
                    <select
                      value={payrollTargetBank}
                      onChange={(e) => setPayrollTargetBank(e.target.value as "BCA" | "JAGO")}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:border-[#2196F3]"
                    >
                      <option value="BCA">BCA Utama</option>
                      <option value="JAGO">Bank Jago</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                      CF Unit Income
                    </label>
                    <select
                      value={payrollTargetUnitId}
                      onChange={(e) => setPayrollTargetUnitId(e.target.value)}
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 text-slate-800 focus:outline-none focus:border-[#2196F3]"
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
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={payrollNextMonthAlloc}
                    onChange={(e) => setPayrollNextMonthAlloc(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-[#2196F3] border-slate-300 focus:ring-[#2196F3]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Alokasi ke Budget Bulan Depan
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-tight">
                      Gaji yang cair di bulan ini otomatis diisikan sebagai Anggaran Gaji bulan berikutnya.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={payrollAutoPost}
                    onChange={(e) => setPayrollAutoPost(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-[#2196F3] border-slate-300 focus:ring-[#2196F3]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Auto-Catat Transaksi Saat Gajian
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-tight">
                      Begitu tanggal gajian tiba, sistem otomatis mencatat transaksi pemasukan dan menambah saldo rekening.
                    </span>
                  </div>
                </label>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPayrollSettingsOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#2196F3] hover:bg-[#1E88E5] text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Pengaturan Siklus</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* 2-Column Layout: Left (Budget Items Workspace) + Right (Available Units Drawer) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT (8 cols): BUDGET ITEMS WORKSPACE & DROPZONE */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`lg:col-span-8 bg-[#FFFFFF] border rounded-3xl overflow-hidden shadow-xs transition-colors ${
            isDragOver ? "border-dashed border-2 border-[#2196F3] bg-[#2196F3]/5" : "border-[#EEEEEE]"
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
              {!isLocked && budgetItems.length === 0 && (
                <button
                  onClick={handleCopyPreviousMonth}
                  className="px-3 py-1.5 rounded-xl bg-[#E3F2FD]/50 hover:bg-[#E3F2FD] text-[#242921] text-xs font-semibold border border-[#EEEEEE] transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Salin seluruh cashflow item dan nominal dari bulan sebelumnya"
                >
                  <Copy className="w-3.5 h-3.5 text-[#2196F3]" />
                  <span>Salin Item Bulan Lalu</span>
                </button>
              )}

              {isLocked ? (
                <span className="text-xs font-medium text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Terkunci
                </span>
              ) : (
                <span className="text-xs font-medium text-[#2196F3] bg-[#2196F3]/15 px-3 py-1 rounded-full border border-[#2196F3]/30 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Mode Edit
                </span>
              )}
            </div>
          </div>

          {/* Empty state */}
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
                disabled={isLocked}
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
                return (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-[#E3F2FD]/20 transition">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-slate-300" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#242921]">{unit?.name}</span>
                          <span className="text-[10px] text-[#666E61]">({unit?.code})</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-[#E3F2FD] text-[#666E61] font-semibold">
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
                    className={`p-3 bg-[#E3F2FD]/20 border border-[#EEEEEE] hover:border-[#2196F3]/50 rounded-2xl flex items-center justify-between gap-2 transition ${
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
                            <span className="text-[9px] font-bold text-[#2196F3] bg-[#2196F3]/10 px-1.5 py-0.2 rounded">
                              {formatRupiah(prevNominal)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => addItemToCurrentMonth(unit.id)}
                      disabled={isLocked}
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
      </div>
    </div>
  );
};

