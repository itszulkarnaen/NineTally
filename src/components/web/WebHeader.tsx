"use client";

import React from "react";
import { Lock, Unlock, RefreshCw, Check } from "lucide-react";
import { MonthPicker } from "@/components/common/MonthPicker";
import { NavTab } from "./types";
import { PeriodStatus } from "@/types";
import { CloudSyncStatus } from "@/context/AppContext";

interface WebHeaderProps {
  activeTab: NavTab;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  status: PeriodStatus;
  isLocked: boolean;
  cloudSyncStatus: CloudSyncStatus;
  retryCloudSync: () => void;
  globalToast?: string | null;
}

const TAB_TITLES: Record<NavTab, string> = {
  budget: "Budget",
  realization: "Realization",
  actual: "Actual",
  "bank-balance": "Bank Balance & Historical Saldo",
  "cashflow-items": "Master Data: Cashflow Items",
  categories: "Master Data: Kategori & Label Cashflow",
  assets: "Master Data: Assets Portfolio",
};

const TAB_DESCRIPTIONS: Record<NavTab, string> = {
  budget: "Susun alokasi cashflow items bulanan. Item yang di-drag otomatis menggunakan nominal bulan lalu.",
  realization: "Pantau mutasi riil berjalan dan checklist pembayaran. Nilai tersinkronisasi otomatis dengan Mobile PWA.",
  actual: "Evaluasi realisasi anggaran yang telah dikunci di akhir bulan.",
  "bank-balance": "Kelola posisi saldo riil rekening operasional bulanan dan pantau rekam jejak historical kas antar bulan.",
  "cashflow-items": "Kelola katalog master cashflow items (pengeluaran, pemasukan, dan tabungan).",
  categories: "Kelola master kategori pengeluaran (Holy Thing, Liability, Monthly Needs, dsb) lengkap dengan warna & deskripsi.",
  assets: "Daftar aset portofolio, yield %, dan likuiditas (Liquid, Semi-Liquid, Illiquid).",
};

export const WebHeader: React.FC<WebHeaderProps> = ({
  activeTab,
  selectedMonth,
  setSelectedMonth,
  status,
  isLocked,
  cloudSyncStatus,
  retryCloudSync,
  globalToast,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Header Summary with MonthPicker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FFFFFF] p-6 rounded-3xl border border-[#EEEEEE] shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-[#242921]">
              {TAB_TITLES[activeTab]}
            </h2>
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                isLocked
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : status === "ACTIVE"
                  ? "bg-[#2196F3]/15 text-[#2196F3] border border-[#2196F3]/30"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
              }`}
            >
              {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {status}
            </span>
          </div>
          <p className="text-xs text-[#666E61] mt-1">
            {TAB_DESCRIPTIONS[activeTab]}
          </p>
        </div>

        {/* MonthPicker & Cloud Sync in Header */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Cloud Sync Status Indicator */}
          <button
            type="button"
            onClick={retryCloudSync}
            title="Status koneksi database cloud. Klik untuk sinkronisasi ulang."
            className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition cursor-pointer ${
              cloudSyncStatus === "CONNECTED"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : cloudSyncStatus === "CONNECTING"
                ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                : cloudSyncStatus === "OFFLINE"
                ? "bg-slate-100 text-slate-600 border-slate-300"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                cloudSyncStatus === "CONNECTED"
                  ? "bg-emerald-500"
                  : cloudSyncStatus === "CONNECTING"
                  ? "bg-amber-500"
                  : cloudSyncStatus === "OFFLINE"
                  ? "bg-slate-400"
                  : "bg-rose-500"
              }`}
            />
            <span>
              {cloudSyncStatus === "CONNECTED" && "Cloud DB Active"}
              {cloudSyncStatus === "CONNECTING" && "Connecting DB..."}
              {cloudSyncStatus === "OFFLINE" && "Offline Mode"}
              {cloudSyncStatus === "ERROR" && "DB Error (Klik Retry)"}
            </span>
            <RefreshCw className={`w-3 h-3 ml-0.5 opacity-60 ${cloudSyncStatus === "CONNECTING" ? "animate-spin" : ""}`} />
          </button>

          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
        </div>
      </div>

      {/* Global Toast */}
      {globalToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2.5 rounded-2xl flex items-center gap-2 animate-in fade-in shadow-xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{globalToast}</span>
        </div>
      )}
    </div>
  );
};

