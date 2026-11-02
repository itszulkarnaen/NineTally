"use client";

import React from "react";
import { formatRupiah } from "@/lib/utils";
import { Check } from "lucide-react";
import { WishlistItem } from "@/types";

interface WishlistTabProps {
  wishlists: WishlistItem[];
  toggleWishlistBought: (id: string) => void;
}

export const WishlistTab: React.FC<WishlistTabProps> = ({
  wishlists,
  toggleWishlistBought,
}) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-[#666E61] px-1 font-medium">
        <span>Target Belanja / Impian</span>
        <span>Total: {wishlists.length} Item</span>
      </div>

      {wishlists.map((wl) => (
        <div
          key={wl.id}
          className={`rounded-2xl border p-3.5 flex items-center justify-between gap-3 shadow-xs transition ${
            wl.is_bought
              ? "bg-[#FFFFFF] border-[#2196F3] line-through opacity-70"
              : "bg-[#FFFFFF] border-[#EEEEEE]"
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleWishlistBought(wl.id)}
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition cursor-pointer ${
                wl.is_bought
                  ? "bg-[#2196F3] text-white shadow-xs"
                  : "border border-[#EEEEEE] text-slate-300 hover:border-[#2196F3]"
              }`}
            >
              <Check className="w-4 h-4" />
            </button>
            <div>
              <span className="text-xs font-bold text-[#242921]">{wl.item_name}</span>
              <span className="text-[10px] text-[#666E61] block">Prioritas #{wl.priority}</span>
            </div>
          </div>
          <span className="text-xs font-bold text-[#242921]">{formatRupiah(wl.target_amount)}</span>
        </div>
      ))}
    </div>
  );
};

