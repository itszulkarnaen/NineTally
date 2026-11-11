"use client";

import React from "react";
import { Check } from "lucide-react";
import { MonthPicker } from "@/components/common/MonthPicker";
import { NavTab } from "./types";

interface WebHeaderProps {
  activeTab: NavTab;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  globalToast?: string | null;
}

const TAB_TITLES: Record<NavTab, string> = {
  budget: "Budget",
  realization: "Realization",
  "bank-balance": "Bank Balance & Historical Saldo",
  "self-loan": "Self-Loan (Pinjam dari Aset)",
  "cashflow-items": "Master Data: Cashflow Items",
  categories: "Master Data: Kategori & Label Cashflow",
  assets: "Master Data: Assets Portfolio",
};

const TAB_DESCRIPTIONS: Record<NavTab, string> = {
  budget: "Susun alokasi cashflow items bulanan. Item yang di-drag otomatis menggunakan nominal bulan lalu.",
  realization: "Pantau mutasi riil berjalan dan checklist pembayaran. Nilai tersinkronisasi otomatis dengan Mobile PWA.",
  "bank-balance": "Kelola posisi saldo riil rekening operasional bulanan dan pantau rekam jejak historical kas antar bulan.",
  "self-loan": "Cairkan aset non-eksternal sebagai pinjaman ke diri sendiri (0% bunga) dan catat cicilan pengembaliannya.",
  "cashflow-items": "Kelola katalog master cashflow items (pengeluaran, pemasukan, dan tabungan).",
  categories: "Kelola master kategori pengeluaran (Holy Thing, Liability, Monthly Needs, dsb) lengkap dengan warna & deskripsi.",
  assets: "Daftar aset portofolio, yield %, dan likuiditas (Liquid, Semi-Liquid, Illiquid).",
};

export const WebHeader: React.FC<WebHeaderProps> = ({
  activeTab,
  selectedMonth,
  setSelectedMonth,
  globalToast,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Header Summary with MonthPicker inline with Page Title */}
      <div className="bg-[#FFFFFF] p-6 rounded-3xl border border-[#EEEEEE] shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-xl font-bold text-[#242921] truncate">
              {TAB_TITLES[activeTab]}
            </h2>
          </div>

          {/* MonthPicker aligned right inline with title */}
          <div className="shrink-0 ml-auto">
            <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
          </div>
        </div>

        <p className="text-xs text-[#666E61] mt-1.5">
          {TAB_DESCRIPTIONS[activeTab]}
        </p>
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

