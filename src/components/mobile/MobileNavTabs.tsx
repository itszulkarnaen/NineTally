"use client";

import React from "react";
import { Receipt, PieChart as PieChartIcon, Layers, HandCoins, Gift } from "lucide-react";
import { MobileTab } from "./types";

interface MobileNavTabsProps {
  activeTab: MobileTab;
  setActiveTab: (tab: MobileTab) => void;
}

export const MobileNavTabs: React.FC<MobileNavTabsProps> = ({
  activeTab,
  setActiveTab,
}) => {
  return (
    <div className="grid grid-cols-5 gap-1 p-1 bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl shadow-xs">
      <button
        onClick={() => setActiveTab("transactions")}
        className={`py-2 text-[11px] font-semibold rounded-xl flex flex-col items-center gap-1 transition cursor-pointer ${
          activeTab === "transactions" ? "bg-[#2196F3] text-white shadow-xs" : "text-[#666E61]"
        }`}
      >
        <Receipt className="w-4 h-4" />
        <span>Transaksi</span>
      </button>
      <button
        onClick={() => setActiveTab("chart")}
        className={`py-2 text-[11px] font-semibold rounded-xl flex flex-col items-center gap-1 transition cursor-pointer ${
          activeTab === "chart" ? "bg-[#2196F3] text-white shadow-xs" : "text-[#666E61]"
        }`}
      >
        <PieChartIcon className="w-4 h-4" />
        <span>Outcome</span>
      </button>
      <button
        onClick={() => setActiveTab("assets")}
        className={`py-2 text-[11px] font-semibold rounded-xl flex flex-col items-center gap-1 transition cursor-pointer ${
          activeTab === "assets" ? "bg-[#2196F3] text-white shadow-xs" : "text-[#666E61]"
        }`}
      >
        <Layers className="w-4 h-4" />
        <span>Aset</span>
      </button>
      <button
        onClick={() => setActiveTab("loan")}
        className={`py-2 text-[11px] font-semibold rounded-xl flex flex-col items-center gap-1 transition cursor-pointer ${
          activeTab === "loan" ? "bg-[#2196F3] text-white shadow-xs" : "text-[#666E61]"
        }`}
      >
        <HandCoins className="w-4 h-4" />
        <span>Loan</span>
      </button>
      <button
        onClick={() => setActiveTab("wishlist")}
        className={`py-2 text-[11px] font-semibold rounded-xl flex flex-col items-center gap-1 transition cursor-pointer ${
          activeTab === "wishlist" ? "bg-[#2196F3] text-white shadow-xs" : "text-[#666E61]"
        }`}
      >
        <Gift className="w-4 h-4" />
        <span>Wishlist</span>
      </button>
    </div>
  );
};

