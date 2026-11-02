"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sliders,
  TrendingUp,
  CheckCircle2,
  Landmark,
  Layers,
  Tags,
  Wallet,
  Smartphone,
  ArrowRight,
  LogOut,
  Lock,
  Unlock,
  ShieldAlert,
} from "lucide-react";
import { NavTab } from "./types";
import { PeriodStatus } from "@/types";

interface WebSidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedMonth: string;
  status: PeriodStatus;
  isLocked: boolean;
  onLockMonth: () => void;
  onUnlockMonth: () => void;
  onLogout: () => void;
}

export const WebSidebar: React.FC<WebSidebarProps> = ({
  activeTab,
  setActiveTab,
  selectedMonth,
  status,
  isLocked,
  onLockMonth,
  onUnlockMonth,
  onLogout,
}) => {
  return (
    <aside className="w-64 bg-[#FFFFFF] border-r border-[#EEEEEE] flex flex-col justify-between shrink-0 p-5 shadow-sm">
      <div className="space-y-6">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3 pb-2 border-b border-[#EEEEEE]">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-xs border border-[#EEEEEE] shrink-0">
            <Image
              src="/NineTally.png"
              alt="NineTally Icon"
              fill
              sizes="40px"
              className="object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-[#242921]">
              NineTally
            </h1>
            <p className="text-[11px] text-[#666E61]">Self Cash Flow Console</p>
          </div>
        </div>

        {/* Month Status Badge & Lock/Unlock Trigger */}
        <div className="p-3.5 bg-[#E3F2FD]/40 rounded-2xl border border-[#EEEEEE] space-y-2">
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
                  : status === "ACTIVE"
                  ? "bg-[#2196F3]/15 text-[#2196F3] border border-[#2196F3]/30"
                  : "bg-blue-100 text-blue-800 border border-blue-200"
              }`}
            >
              {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              {status}
            </span>
          </div>

          {/* Lock / Unlock Trigger Button */}
          {isLocked ? (
            <button
              onClick={onUnlockMonth}
              className="w-full mt-1 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold rounded-xl border border-amber-200 transition flex items-center justify-center gap-1.5"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Unlock (Edit Actual)</span>
            </button>
          ) : (
            <button
              onClick={onLockMonth}
              className="w-full mt-1 py-1.5 px-2 bg-[#FFFFFF] hover:bg-[#EEEEEE] text-[#242921] text-[11px] font-medium rounded-xl border border-[#EEEEEE] transition flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Lock className="w-3.5 h-3.5 text-[#2196F3]" />
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
                ? "bg-[#2196F3] text-white shadow-xs"
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
                ? "bg-[#2196F3] text-white shadow-xs"
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
                ? "bg-[#2196F3] text-white shadow-xs"
                : "text-[#666E61] hover:bg-[#EEEEEE] hover:text-[#242921]"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Actual</span>
          </button>
          <button
            onClick={() => setActiveTab("bank-balance")}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "bank-balance"
                ? "bg-[#2196F3] text-white shadow-xs"
                : "text-[#666E61] hover:bg-[#EEEEEE] hover:text-[#242921]"
            }`}
          >
            <Landmark className="w-4 h-4" />
            <span>Bank Balance</span>
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
                ? "bg-[#2196F3] text-white shadow-xs"
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
                ? "bg-[#2196F3] text-white shadow-xs"
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
                ? "bg-[#2196F3] text-white shadow-xs"
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
          className="flex items-center justify-between p-2.5 rounded-xl bg-[#E3F2FD]/40 hover:bg-[#E3F2FD] transition text-xs font-semibold text-[#242921]"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-[#2196F3]" />
            <span>Buka Mobile PWA</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-[#666E61]" />
        </Link>
        <button
          onClick={onLogout}
          className="w-full mt-2 flex items-center justify-between p-2.5 rounded-xl text-rose-700 hover:bg-rose-50 transition text-xs font-semibold cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Keluar / Logout</span>
          </div>
        </button>
      </div>
    </aside>
  );
};

