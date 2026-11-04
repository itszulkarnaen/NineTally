"use client";

import React from "react";
import Image from "next/image";
import { LogOut } from "lucide-react";

interface MobileTopBarProps {
  onLogout: () => void;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({ onLogout }) => {
  return (
    <div className="sticky top-0 z-40 bg-[#FFFFFF]/90 backdrop-blur border-b border-[#EEEEEE] px-4 py-3 flex items-center justify-between shadow-xs">
      <div className="flex items-center gap-2.5">
        <div className="relative w-8 h-8 rounded-xl overflow-hidden shadow-xs border border-[#EEEEEE] shrink-0">
          <Image
            src="/NineTally.png"
            alt="NineTally Icon"
            fill
            sizes="32px"
            className="object-cover"
            priority
          />
        </div>
        <div>
          <h1 className="text-xs font-bold text-[#242921]">NineTally</h1>
          <p className="text-[10px] text-[#666E61]">Self Cash Flow</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onLogout}
          title="Keluar / Logout"
          className="p-1.5 rounded-xl bg-[#E3F2FD] hover:bg-rose-100 hover:text-rose-700 transition text-[#666E61] cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

