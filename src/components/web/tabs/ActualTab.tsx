"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { formatRupiah } from "@/lib/utils";
import { Lock, Unlock } from "lucide-react";

export const ActualTab: React.FC = () => {
  const { currentMonthData, cashflowUnits, lockCurrentMonth } = useApp();

  const isLocked = currentMonthData.status === "LOCKED";
  const budgetItems = currentMonthData.items;
  const outflowItems = budgetItems.filter((item) => {
    const unit = cashflowUnits.find((u) => u.id === item.cashflow_unit_id);
    return unit?.unit_type !== "INCOME";
  });
  const totalActual = outflowItems.reduce((acc, curr) => acc + curr.actual_amount, 0);

  return (
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
          <span className="text-sm font-bold text-[#242921]">{formatRupiah(totalActual)}</span>
        </div>
      </div>

      {isLocked ? (
        <div className="bg-[#2196F3]/10 border border-[#2196F3]/30 rounded-2xl p-3 flex items-center gap-2 text-xs text-[#2196F3] font-medium">
          <Lock className="w-4 h-4 text-[#2196F3]" />
          <span>
            Periode ini telah <strong>LOCKED</strong>. Seluruh mutasi di mobile telah dimatikan dan tersimpan sebagai data historis permanen.
          </span>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-2 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <Unlock className="w-4 h-4 text-amber-600" />
            <span>
              Periode masih <strong>ACTIVE</strong>. Klik tombol kunci untuk membekukan realisasi bulan ini menjadi Actual.
            </span>
          </div>
          <button
            onClick={lockCurrentMonth}
            className="px-3 py-1 bg-[#2196F3] text-white rounded-xl font-semibold text-[11px] cursor-pointer"
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
                <tr key={item.id} className="hover:bg-[#E3F2FD]/20">
                  <td className="py-3 px-3 font-semibold">{unit?.name}</td>
                  <td className="py-3 px-3">{formatRupiah(item.budget_amount)}</td>
                  <td className="py-3 px-3 font-bold text-[#2196F3]">{formatRupiah(item.actual_amount)}</td>
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
  );
};

