"use client";

import React from "react";
import { formatRupiah } from "@/lib/utils";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

interface ChartTabProps {
  chartData: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  monthTransactionsCount: number;
}

export const ChartTab: React.FC<ChartTabProps> = ({
  chartData,
  monthTransactionsCount,
}) => {
  const totalChartValue = chartData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-5 shadow-xs space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#242921]">Outcome Distribution</h3>
          <p className="text-xs text-[#666E61]">
            Berdasarkan transaksi riil yang dicatat ({monthTransactionsCount} transaksi)
          </p>
        </div>
        {chartData.length > 0 && (
          <div className="text-right">
            <span className="text-[10px] text-[#666E61] block">Total Realisasi</span>
            <span className="text-xs font-bold text-[#2196F3]">
              {formatRupiah(totalChartValue)}
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
          {/* Full Solid Pie Chart (innerRadius={0}) */}
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
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    borderColor: "#EEEEEE",
                    borderRadius: "12px",
                    fontSize: "11px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Breakdown List */}
          <div className="space-y-2 border-t border-[#EEEEEE] pt-3">
            {chartData.map((item) => {
              const percent = totalChartValue > 0 ? ((item.value / totalChartValue) * 100).toFixed(1) : 0;

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
  );
};

