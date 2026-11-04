"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sliders,
  TrendingUp,
  Landmark,
  Layers,
  Tags,
  Wallet,
  Smartphone,
  ArrowRight,
  LogOut,
} from "lucide-react";
import { NavTab } from "./types";
import { CloudSyncStatus } from "@/context/AppContext";

interface WebSidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  cloudSyncStatus: CloudSyncStatus;
  retryCloudSync: () => void;
  onLogout: () => void;
}

export const WebSidebar: React.FC<WebSidebarProps> = ({
  activeTab,
  setActiveTab,
  cloudSyncStatus,
  retryCloudSync,
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
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm tracking-tight text-[#242921]">
                NineTally
              </h1>
              <button
                type="button"
                onClick={retryCloudSync}
                title={
                  cloudSyncStatus === "CONNECTED"
                    ? "Cloud DB Active — Klik untuk sinkronisasi ulang"
                    : cloudSyncStatus === "CONNECTING"
                    ? "Connecting DB..."
                    : cloudSyncStatus === "OFFLINE"
                    ? "Offline Mode — Klik untuk coba lagi"
                    : "DB Error — Klik untuk retry"
                }
                aria-label="Status Cloud DB"
                className="inline-flex items-center justify-center p-1 rounded-full hover:bg-[#EEEEEE] transition cursor-pointer"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    cloudSyncStatus === "CONNECTED"
                      ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
                      : cloudSyncStatus === "CONNECTING"
                      ? "bg-amber-500 animate-pulse"
                      : cloudSyncStatus === "OFFLINE"
                      ? "bg-slate-400"
                      : "bg-rose-500"
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-[#666E61]">Self Cash Flow Console</p>
          </div>
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

