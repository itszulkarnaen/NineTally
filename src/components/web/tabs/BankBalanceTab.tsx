"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { formatRupiah } from "@/lib/utils";
import { CurrencyInput } from "@/components/common/CurrencyInput";
import { Landmark, Wallet, Save, Check } from "lucide-react";

export const BankBalanceTab: React.FC = () => {
  const {
    currentMonthData,
    selectedMonth,
    setSelectedMonth,
    availableMonths,
    updateBankBalance,
  } = useApp();

  const [bcaBalanceInput, setBcaBalanceInput] = useState<number>(currentMonthData.real_bca_balance || 0);
  const [jagoBalanceInput, setJagoBalanceInput] = useState<number>(currentMonthData.real_jago_balance || 0);
  const [isBankSavedSuccess, setIsBankSavedSuccess] = useState(false);

  useEffect(() => {
    setBcaBalanceInput(currentMonthData.real_bca_balance || 0);
    setJagoBalanceInput(currentMonthData.real_jago_balance || 0);
  }, [selectedMonth, currentMonthData.real_bca_balance, currentMonthData.real_jago_balance]);

  const handleSaveBankBalance = (e: React.FormEvent) => {
    e.preventDefault();
    updateBankBalance(bcaBalanceInput, jagoBalanceInput);
    setIsBankSavedSuccess(true);
    setTimeout(() => setIsBankSavedSuccess(false), 2500);
  };

  const totalLiquidCash = (currentMonthData.real_bca_balance || 0) + (currentMonthData.real_jago_balance || 0);

  return (
    <div className="space-y-6">
      {/* Saldo Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EEEEEE] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#666E61]">
            <span className="font-bold tracking-wider text-[11px] uppercase text-[#2196F3] flex items-center gap-1.5">
              <Landmark className="w-4 h-4" /> BCA Utama
            </span>
            <span className="text-[10px] bg-[#2196F3]/15 text-[#2196F3] px-2 py-0.5 rounded-full font-bold">
              {selectedMonth}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-[#242921] mt-3">
            {formatRupiah(currentMonthData.real_bca_balance || 0)}
          </h3>
          <p className="text-[10px] text-[#666E61] mt-1 font-medium">Rekening Operasional Kas Harian</p>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EEEEEE] shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#666E61]">
            <span className="font-bold tracking-wider text-[11px] uppercase text-[#1E88E5] flex items-center gap-1.5">
              <Landmark className="w-4 h-4" /> Bank Jago
            </span>
            <span className="text-[10px] bg-[#90CAF9]/30 text-[#1976D2] px-2 py-0.5 rounded-full font-bold">
              {selectedMonth}
            </span>
          </div>
          <h3 className="text-2xl font-bold text-[#242921] mt-3">
            {formatRupiah(currentMonthData.real_jago_balance || 0)}
          </h3>
          <p className="text-[10px] text-[#666E61] mt-1 font-medium">Rekening Tabungan & Kantong Pos</p>
        </div>

        <div className="bg-[#FFFFFF] p-5 rounded-3xl border border-[#EEEEEE] shadow-xs bg-gradient-to-br from-[#FFFFFF] to-[#E3F2FD]/40">
          <div className="flex items-center justify-between text-xs text-[#666E61]">
            <span className="font-bold tracking-wider text-[11px] uppercase text-[#2196F3] flex items-center gap-1.5">
              <Wallet className="w-4 h-4" /> Total Liquid Cash
            </span>
            <span className="text-[10px] bg-[#2196F3] text-white px-2 py-0.5 rounded-full font-bold">
              Semua Bank
            </span>
          </div>
          <h3 className="text-2xl font-black text-[#2196F3] mt-3">
            {formatRupiah(totalLiquidCash)}
          </h3>
          <p className="text-[10px] text-[#666E61] mt-1 font-medium">Total dana kas cair yang siap dibelanjakan</p>
        </div>
      </div>

      {/* Form Input Saldo Riil Bulan Ini */}
      <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
          <div>
            <h3 className="text-sm font-bold text-[#242921]">Update Saldo Bank Bulan {selectedMonth}</h3>
            <p className="text-xs text-[#666E61]">Input posisi saldo riil yang tercatat di m-banking kamu.</p>
          </div>
          {isBankSavedSuccess && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl animate-in fade-in flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Saldo Bank Tersimpan!
            </span>
          )}
        </div>

        <form onSubmit={handleSaveBankBalance} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label className="text-xs font-semibold text-[#666E61] block mb-1">
              Saldo BCA Utama (Rp)
            </label>
            <CurrencyInput
              value={bcaBalanceInput}
              onChange={(val) => setBcaBalanceInput(val)}
              placeholder="0"
              className="w-full text-sm font-bold bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-[#242921] focus:border-[#2196F3] focus:outline-hidden"
            />
          </div>

          <div className="md:col-span-5">
            <label className="text-xs font-semibold text-[#666E61] block mb-1">
              Saldo Bank Jago (Rp)
            </label>
            <CurrencyInput
              value={jagoBalanceInput}
              onChange={(val) => setJagoBalanceInput(val)}
              placeholder="0"
              className="w-full text-sm font-bold bg-[#E3F2FD]/30 border border-[#EEEEEE] rounded-xl px-3 py-2 text-[#242921] focus:border-[#2196F3] focus:outline-hidden"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#2196F3] hover:bg-[#1E88E5] text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>

      {/* Table: Historical Monthly Bank Balance */}
      <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EEEEEE]">
          <div>
            <h3 className="text-sm font-bold text-[#242921]">Historical Bank Balance (Rekap Bulanan)</h3>
            <p className="text-xs text-[#666E61]">Pantau rekam jejak kas operasional yang tersimpan di database.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#EEEEEE] text-[#666E61] font-semibold">
                <th className="py-3 px-3">Periode Bulan</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Saldo BCA</th>
                <th className="py-3 px-3">Saldo Jago</th>
                <th className="py-3 px-3">Total Liquid Cash</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEEEEE] text-[#242921]">
              {availableMonths.map((m) => {
                const isCurrent = m.value === selectedMonth;
                const bca = isCurrent ? (currentMonthData.real_bca_balance || 0) : 0;
                const jago = isCurrent ? (currentMonthData.real_jago_balance || 0) : 0;
                const total = bca + jago;

                return (
                  <tr key={m.value} className={`hover:bg-[#E3F2FD]/20 transition ${isCurrent ? "bg-[#E3F2FD]/30" : ""}`}>
                    <td className="py-3.5 px-3 font-bold flex items-center gap-2">
                      <span>{m.label}</span>
                      {isCurrent && (
                        <span className="text-[10px] bg-[#2196F3] text-white px-2 py-0.5 rounded-full font-bold">
                          Aktif Dipilih
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          m.value < "2026-11"
                            ? "bg-amber-100 text-amber-800"
                            : m.value === "2026-11"
                            ? "bg-[#2196F3]/15 text-[#2196F3]"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {m.value < "2026-11" ? "LOCKED" : m.value === "2026-11" ? "ACTIVE" : "PLANNING"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-semibold">{formatRupiah(bca)}</td>
                    <td className="py-3.5 px-3 font-semibold">{formatRupiah(jago)}</td>
                    <td className="py-3.5 px-3 font-bold text-[#2196F3]">{formatRupiah(total)}</td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedMonth(m.value)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          isCurrent
                            ? "bg-[#2196F3] text-white"
                            : "bg-[#EEEEEE] hover:bg-[#E3F2FD] text-[#242921]"
                        }`}
                      >
                        {isCurrent ? "Sedang Diedit" : "Pilih Bulan"}
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
  );
};

