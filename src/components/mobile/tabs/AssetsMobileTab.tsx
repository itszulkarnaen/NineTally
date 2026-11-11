"use client";

import React from "react";
import { formatRupiah, isUnitBasedAsset } from "@/lib/utils";
import { Asset } from "@/types";

interface AssetsMobileTabProps {
  assets: Asset[];
}

export const AssetsMobileTab: React.FC<AssetsMobileTabProps> = ({ assets }) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-[#666E61] px-1 font-medium">
        <span>Portofolio Aset & Investasi</span>
        <span>Yield Generating</span>
      </div>

      {assets.map((asset) => {
        const isGram = isUnitBasedAsset(asset);
        return (
          <div key={asset.id} className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-2xl p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-bold text-xs text-[#242921]">{asset.name}</h4>
                  {asset.platform && (
                    <span className="text-[9px] text-[#666E61] bg-[#F8FAFC] border border-[#EEEEEE] px-1.5 py-0.5 rounded font-semibold">
                      {asset.platform}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      asset.liquidity_tier === "LIQUID"
                        ? "bg-[#2196F3]/15 text-[#2196F3]"
                        : asset.liquidity_tier === "SEMI_LIQUID"
                        ? "bg-[#90CAF9]/40 text-[#1565C0]"
                        : "bg-[#E3F2FD] text-[#666E61]"
                    }`}
                  >
                    {asset.liquidity_tier}
                  </span>
                  {asset.goal_bucket && (
                    <span className="text-[10px] text-[#666E61] bg-[#EEEEEE] px-1.5 py-0.5 rounded font-medium">
                      {asset.goal_bucket}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-bold text-xs text-[#242921] block">{formatRupiah(asset.total_value)}</span>
                {asset.generating_rate !== 0 && (
                  <span className={`text-[10px] font-bold ${asset.generating_rate >= 0 ? "text-[#2196F3]" : "text-rose-600"}`}>
                    {asset.generating_rate > 0 ? "+" : ""}
                    {asset.generating_rate}% Yield
                  </span>
                )}
              </div>
            </div>

            {isGram && (
              <div className="text-[11px] bg-amber-50/70 border border-amber-200/80 text-amber-900 rounded-xl px-2.5 py-1.5 flex items-center justify-between font-medium">
                <span>
                  Kepemilikan: <strong>{asset.unit_quantity ?? 0} {asset.unit_name}</strong>
                </span>
                <span>@ {formatRupiah(asset.price_per_unit || 0)}/gr</span>
              </div>
            )}

            <div className="text-[11px] text-[#666E61] flex justify-between border-t border-[#EEEEEE] pt-2 font-medium">
              <span>Pokok: {formatRupiah(asset.main_value)}</span>
              <span className={asset.income_generated >= 0 ? "text-emerald-700" : "text-rose-600"}>
                Return: {asset.income_generated > 0 ? "+" : ""}
                {formatRupiah(asset.income_generated)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

