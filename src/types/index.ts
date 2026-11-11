export type UnitType = 'EXPENSE' | 'INCOME' | 'ASSET';

export type ExpenseCategory = string; // Dynamic code referencing CashflowCategory.code

export interface CashflowCategory {
  id: string;
  code: string;        // Unique code e.g. "HOLY_THING", "LIABILITY"
  name: string;        // Display label e.g. "Holy Thing", "Liability"
  color: string;       // Hex color for badges & Pie Chart slices e.g. "#2196F3"
  description?: string;
  sort_order: number;
}

export type UrgencyLevel = 'HIGHEST' | 'HIGH' | 'NORMAL';

export type LiquidityTier = 'LIQUID' | 'SEMI_LIQUID' | 'ILLIQUID';

export type PeriodStatus = 'PLANNING' | 'ACTIVE' | 'LOCKED';

export interface CashflowUnit {
  id: string;
  code: string;
  name: string;
  unit_type: UnitType;
  category?: string; // code from CashflowCategory
  category_id?: string;
  default_urgency: UrgencyLevel;
  linked_asset_id?: string;
  is_active: boolean;
}

export interface Asset {
  id: string;
  name: string;
  platform?: string;        // e.g. 'Pluang', 'Bibit', 'Bank Jago', 'BPJS TK'
  liquidity_tier: LiquidityTier;
  main_value: number;       // Modal pokok (Rp)
  generating_rate: number;  // Yield / Return (%)
  start_date?: string;
  income_generated: number; // Imbal hasil / selisih nilai pasar vs modal (Rp)
  total_value: number;      // Nilai terkini
  unit_name?: string;       // e.g. 'gram' untuk aset berbasis gramasi/unit
  unit_quantity?: number;   // Jumlah unit/gramasi (e.g. 5.25)
  price_per_unit?: number;  // Harga per unit/gram dalam IDR
  goal_bucket?: string;
  is_external?: boolean;
}

export interface BudgetPeriod {
  id: string;
  period_month: string; // e.g. "2026-11-01"
  status: PeriodStatus;
  salary_budget: number;
  additional_budget: number;
  real_bca_balance: number;
  real_jago_balance: number;
  locked_at?: string;
}

export interface BudgetPeriodItem {
  id: string;
  period_id: string;
  cashflow_unit_id: string;
  unit?: CashflowUnit;
  budget_amount: number;       // Planned in Web (Budget Module)
  realization_amount: number;  // Ongoing / realized amount during active month
  projection_amount?: number;  // Backward-compat alias for realization_amount
  actual_amount: number;       // Final when locked (Actual Module)
  urgency: UrgencyLevel;
  is_realized: boolean;        // Paid / Realized status
  notes?: string;
  sort_order: number;
}

export interface CashflowTransaction {
  id: string;
  period_id: string;          // e.g. "2026-11"
  cashflow_unit_id: string;   // Must belong to budgeted CF units in that month
  amount: number;             // Nominal per transaksi
  date: string;               // e.g. "2026-11-01"
  notes?: string;             // Catatan pengeluaran (misal: "Beli token listrik", "Sate Padang")
  created_at: string;
}

export interface WishlistItem {
  id: string;
  item_name: string;
  target_amount: number;
  priority: number;
  is_bought: boolean;
  bought_at?: string;
}

export interface PayrollSettings {
  monthly_salary: number;
  payday_day: number; // 1 to 31
  is_last_day: boolean; // true if end of month
  target_unit_id: string; // CashflowUnit id (e.g. 'cf-inc-1' Gaji Kantor)
  target_bank: 'BCA' | 'JAGO';
  auto_post_transaction: boolean;
  next_month_allocation: boolean; // Gaji bulan N jadi budget bulan N+1
  last_posted_period?: string; // e.g. '2026-11'
}


