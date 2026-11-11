import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Asset, CashflowTransaction, CashflowUnit } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Parse localized decimal input supporting both '.' and ',' separators. */
export function parseDecimalInput(raw: string): number {
  const normalized = raw.trim().replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Allow typing decimal digits with a single '.' or ',' separator and optional leading '-'. */
export function sanitizeDecimalInput(raw: string, allowNegative = false): string {
  const cleaned = raw.replace(allowNegative ? /[^0-9.,-]/g : /[^0-9.,]/g, "");
  let result = "";
  let hasSeparator = false;
  for (let i = 0; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (ch === "-") {
      if (allowNegative && i === 0) result += ch;
    } else if (ch === "." || ch === ",") {
      if (!hasSeparator) {
        hasSeparator = true;
        result += ch;
      }
    } else {
      result += ch;
    }
  }
  return result;
}

/** Check whether an asset tracks quantity by unit (e.g. gram for digital gold). */
export function isUnitBasedAsset(
  asset: Pick<Asset, "unit_name" | "unit_quantity" | "price_per_unit">
): boolean {
  return Boolean(asset.unit_name && asset.unit_name.trim().length > 0);
}

/** Compute total_value, income_generated, and yield rate consistently for unit-based or nominal assets. */
export function computeAssetValues(asset: {
  main_value: number;
  income_generated: number;
  generating_rate: number;
  unit_name?: string;
  unit_quantity?: number;
  price_per_unit?: number;
}): {
  total_value: number;
  income_generated: number;
  generating_rate: number;
} {
  if (isUnitBasedAsset(asset)) {
    const qty = Number(asset.unit_quantity) || 0;
    const price = Number(asset.price_per_unit) || 0;
    const total = Math.round(qty * price);
    const main = Number(asset.main_value) || 0;
    const gain = total - main;
    const rate =
      main > 0
        ? Number(((gain / main) * 100).toFixed(2))
        : Number(asset.generating_rate) || 0;
    return {
      total_value: total,
      income_generated: gain,
      generating_rate: rate,
    };
  }

  const main = Number(asset.main_value) || 0;
  const inc = Number(asset.income_generated) || 0;
  const rate =
    Number(asset.generating_rate) !== 0
      ? Number(asset.generating_rate)
      : main > 0 && inc !== 0
      ? Number(((inc / main) * 100).toFixed(2))
      : 0;
  return {
    total_value: main + inc,
    income_generated: inc,
    generating_rate: rate,
  };
}

/**
 * Check whether deleting an asset must be blocked because linked cashflow items
 * have inflow transactions without any matching outflow/withdrawal transaction.
 */
export function getAssetDeletionBlocker(
  assetId: string,
  cashflowUnits: Pick<CashflowUnit, "id" | "name" | "linked_asset_id">[],
  transactions: Pick<CashflowTransaction, "cashflow_unit_id" | "amount">[]
): { blocked: boolean; inflowCount: number; outflowCount: number; linkedUnitNames: string[] } {
  const linkedUnits = cashflowUnits.filter((u) => u.linked_asset_id === assetId);
  if (linkedUnits.length === 0) {
    return { blocked: false, inflowCount: 0, outflowCount: 0, linkedUnitNames: [] };
  }

  const linkedIds = new Set(linkedUnits.map((u) => u.id));
  let inflowCount = 0;
  let outflowCount = 0;

  transactions.forEach((tx) => {
    if (!linkedIds.has(tx.cashflow_unit_id)) return;
    if (tx.amount > 0) inflowCount += 1;
    else if (tx.amount < 0) outflowCount += 1;
  });

  return {
    blocked: inflowCount > 0 && outflowCount === 0,
    inflowCount,
    outflowCount,
    linkedUnitNames: linkedUnits.map((u) => u.name),
  };
}

