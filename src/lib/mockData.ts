import { Asset, BudgetPeriod, BudgetPeriodItem, CashflowCategory, CashflowTransaction, CashflowUnit, WishlistItem } from "@/types";

export const initialCategories: CashflowCategory[] = [
  {
    id: "cat-1",
    code: "HOLY_THING",
    name: "Holy Thing",
    color: "#8B9A6E", // Primary Sage Olive
    description: "Sedekah, Zakat, Ortu, dan alokasi kebaikan",
    sort_order: 1,
  },
  {
    id: "cat-2",
    code: "LIABILITY",
    name: "Liability",
    color: "#C2A382", // Warm Sand Wood
    description: "Kosan, WiFi, Listrik, Tagihan, dan kewajiban",
    sort_order: 2,
  },
  {
    id: "cat-3",
    code: "MONTHLY_NEEDS",
    name: "Monthly Needs",
    color: "#D8A47F", // Terracotta Clay
    description: "Makan siang harian, laundry, belanja kebutuhan rutin",
    sort_order: 3,
  },
  {
    id: "cat-4",
    code: "AKOMODASI",
    name: "Akomodasi",
    color: "#7E8D85", // Slate Sage
    description: "Bensin motor/mobil, tol, parkir, dan mobilitas",
    sort_order: 4,
  },
  {
    id: "cat-5",
    code: "UNPREDICT",
    name: "Unpredict",
    color: "#B3A394", // Muted Taupe
    description: "Biaya tak terduga, perbaikan darurat, dan cadangan",
    sort_order: 5,
  },
  {
    id: "cat-6",
    code: "SELF_REWARD",
    name: "Self Reward",
    color: "#A4B494", // Light Olive
    description: "Jajan santai, ngopi sore, liburan, dan self reward",
    sort_order: 6,
  },
];

export const initialAssets: Asset[] = [
  {
    id: "ast-1",
    name: "Mas ga JAW",
    liquidity_tier: "LIQUID",
    main_value: 7574499,
    generating_rate: 4.95,
    income_generated: 374938,
    total_value: 7949437,
    goal_bucket: "Saving Cok",
    is_external: false,
  },
  {
    id: "ast-2",
    name: "OBLIGASI",
    liquidity_tier: "SEMI_LIQUID",
    main_value: 10000000,
    generating_rate: 0.90,
    start_date: "2024-01-10",
    income_generated: 90000,
    total_value: 10090000,
    goal_bucket: "Marid",
    is_external: false,
  },
  {
    id: "ast-3",
    name: "Reksa Dana",
    liquidity_tier: "SEMI_LIQUID",
    main_value: 28178999,
    generating_rate: 11.35,
    start_date: "2023-03-05",
    income_generated: 3198316,
    total_value: 31377315,
    goal_bucket: "Marid",
    is_external: false,
  },
  {
    id: "ast-4",
    name: "BPJS SDI",
    liquidity_tier: "ILLIQUID",
    main_value: 17604680,
    generating_rate: 0,
    income_generated: 0,
    total_value: 17604680,
    goal_bucket: "Saving Cok",
    is_external: true,
  },
  {
    id: "ast-5",
    name: "BPJS DNA",
    liquidity_tier: "ILLIQUID",
    main_value: 14738056,
    generating_rate: 0,
    income_generated: 0,
    total_value: 14738056,
    goal_bucket: "Saving Cok",
    is_external: true,
  },
];

export const initialCashflowUnits: CashflowUnit[] = [
  // Holy Thing
  { id: "cf-1", code: "CF-H01", name: "Yappika", unit_type: "EXPENSE", category: "HOLY_THING", default_urgency: "HIGHEST", is_active: true },
  { id: "cf-2", code: "CF-H02", name: "Zakat", unit_type: "EXPENSE", category: "HOLY_THING", default_urgency: "HIGHEST", is_active: true },
  { id: "cf-3", code: "CF-H03", name: "Mamah", unit_type: "EXPENSE", category: "HOLY_THING", default_urgency: "HIGH", is_active: true },
  
  // Liability
  { id: "cf-4", code: "CF-L01", name: "Belanja Barang", unit_type: "EXPENSE", category: "LIABILITY", default_urgency: "HIGH", is_active: true },
  { id: "cf-5", code: "CF-L02", name: "Angsuran Rumah", unit_type: "EXPENSE", category: "LIABILITY", default_urgency: "HIGH", is_active: true },
  { id: "cf-6", code: "CF-L03", name: "Jatah Jajan Sebulan", unit_type: "EXPENSE", category: "LIABILITY", default_urgency: "NORMAL", is_active: true },
  { id: "cf-7", code: "CF-L04", name: "iCloud", unit_type: "EXPENSE", category: "LIABILITY", default_urgency: "NORMAL", is_active: true },
  { id: "cf-8", code: "CF-L05", name: "Ganti Oli", unit_type: "EXPENSE", category: "LIABILITY", default_urgency: "HIGH", is_active: true },
  { id: "cf-9", code: "CF-L06", name: "Kopi Bro", unit_type: "EXPENSE", category: "LIABILITY", default_urgency: "HIGH", is_active: true },
  { id: "cf-10", code: "CF-L07", name: "Yutube", unit_type: "EXPENSE", category: "LIABILITY", default_urgency: "HIGH", is_active: true },

  // Monthly Needs
  { id: "cf-11", code: "CF-M01", name: "Iuran Air + Listrik Perumahan", unit_type: "EXPENSE", category: "MONTHLY_NEEDS", default_urgency: "HIGH", is_active: true },
  { id: "cf-12", code: "CF-M02", name: "Belanja", unit_type: "EXPENSE", category: "MONTHLY_NEEDS", default_urgency: "HIGH", is_active: true },
  { id: "cf-13", code: "CF-M03", name: "Pulsa & Internet", unit_type: "EXPENSE", category: "MONTHLY_NEEDS", default_urgency: "HIGH", is_active: true },
  { id: "cf-14", code: "CF-M04", name: "Cukuran", unit_type: "EXPENSE", category: "MONTHLY_NEEDS", default_urgency: "HIGH", is_active: true },

  // Akomodasi
  { id: "cf-15", code: "CF-A01", name: "Bensin", unit_type: "EXPENSE", category: "AKOMODASI", default_urgency: "HIGH", is_active: true },
  { id: "cf-16", code: "CF-A02", name: "Akomodasi", unit_type: "EXPENSE", category: "AKOMODASI", default_urgency: "HIGH", is_active: true },

  // Assets (Auto-sync to portfolio)
  { id: "cf-17", code: "CF-AST01", name: "Topup Reksa Dana", unit_type: "ASSET", linked_asset_id: "ast-3", default_urgency: "NORMAL", is_active: true },
];

export const initialPeriod: BudgetPeriod = {
  id: "per-2026-11",
  period_month: "2026-11-01",
  status: "ACTIVE",
  salary_budget: 10000000,
  additional_budget: 0,
  real_bca_balance: 3976000,
  real_jago_balance: 500000,
};

export const initialBudgetItems: BudgetPeriodItem[] = [
  // Holy Thing
  { id: "bi-1", period_id: "per-2026-11", cashflow_unit_id: "cf-1", budget_amount: 180000, realization_amount: 180000, projection_amount: 180000, actual_amount: 180000, urgency: "HIGHEST", is_realized: false, sort_order: 1 },
  { id: "bi-2", period_id: "per-2026-11", cashflow_unit_id: "cf-2", budget_amount: 200000, realization_amount: 200000, projection_amount: 200000, actual_amount: 200000, urgency: "HIGHEST", is_realized: false, sort_order: 2 },
  { id: "bi-3", period_id: "per-2026-11", cashflow_unit_id: "cf-3", budget_amount: 200000, realization_amount: 200000, projection_amount: 200000, actual_amount: 200000, urgency: "HIGH", is_realized: false, sort_order: 3 },

  // Liability
  { id: "bi-4", period_id: "per-2026-11", cashflow_unit_id: "cf-4", budget_amount: 3000000, realization_amount: 3000000, projection_amount: 3000000, actual_amount: 3000000, urgency: "HIGH", is_realized: true, sort_order: 4 },
  { id: "bi-5", period_id: "per-2026-11", cashflow_unit_id: "cf-5", budget_amount: 1770000, realization_amount: 1770000, projection_amount: 1770000, actual_amount: 1770000, urgency: "HIGH", is_realized: true, sort_order: 5 },
  { id: "bi-6", period_id: "per-2026-11", cashflow_unit_id: "cf-6", budget_amount: 500000, realization_amount: 500000, projection_amount: 500000, actual_amount: 500000, urgency: "NORMAL", is_realized: true, sort_order: 6 },
  { id: "bi-7", period_id: "per-2026-11", cashflow_unit_id: "cf-7", budget_amount: 50000, realization_amount: 50000, projection_amount: 50000, actual_amount: 50000, urgency: "NORMAL", is_realized: true, sort_order: 7 },
  { id: "bi-8", period_id: "per-2026-11", cashflow_unit_id: "cf-8", budget_amount: 100000, realization_amount: 100000, projection_amount: 100000, actual_amount: 100000, urgency: "HIGH", is_realized: false, sort_order: 8 },
  { id: "bi-9", period_id: "per-2026-11", cashflow_unit_id: "cf-9", budget_amount: 100000, realization_amount: 100000, projection_amount: 100000, actual_amount: 100000, urgency: "HIGH", is_realized: false, sort_order: 9 },
  { id: "bi-10", period_id: "per-2026-11", cashflow_unit_id: "cf-10", budget_amount: 79000, realization_amount: 79000, projection_amount: 79000, actual_amount: 79000, urgency: "HIGH", is_realized: true, sort_order: 10 },

  // Monthly Needs
  { id: "bi-11", period_id: "per-2026-11", cashflow_unit_id: "cf-11", budget_amount: 175000, realization_amount: 175000, projection_amount: 175000, actual_amount: 175000, urgency: "HIGH", is_realized: true, sort_order: 11 },
  { id: "bi-12", period_id: "per-2026-11", cashflow_unit_id: "cf-12", budget_amount: 2000000, realization_amount: 2000000, projection_amount: 2000000, actual_amount: 2000000, urgency: "HIGH", is_realized: false, sort_order: 12 },
  { id: "bi-13", period_id: "per-2026-11", cashflow_unit_id: "cf-13", budget_amount: 450000, realization_amount: 450000, projection_amount: 450000, actual_amount: 450000, urgency: "HIGH", is_realized: true, sort_order: 13 },
  { id: "bi-14", period_id: "per-2026-11", cashflow_unit_id: "cf-14", budget_amount: 30000, realization_amount: 30000, projection_amount: 30000, actual_amount: 30000, urgency: "HIGH", is_realized: false, sort_order: 14 },

  // Akomodasi
  { id: "bi-15", period_id: "per-2026-11", cashflow_unit_id: "cf-15", budget_amount: 260000, realization_amount: 260000, projection_amount: 260000, actual_amount: 260000, urgency: "HIGH", is_realized: false, sort_order: 15 },
  { id: "bi-16", period_id: "per-2026-11", cashflow_unit_id: "cf-16", budget_amount: 885000, realization_amount: 885000, projection_amount: 885000, actual_amount: 885000, urgency: "HIGH", is_realized: false, sort_order: 16 },
];

export const initialWishlists: WishlistItem[] = [
  { id: "wl-1", item_name: "Rice Cooker", target_amount: 1000000, priority: 1, is_bought: false },
  { id: "wl-2", item_name: "Kulkas", target_amount: 3000000, priority: 2, is_bought: false },
  { id: "wl-3", item_name: "Mesin Cuci", target_amount: 3000000, priority: 3, is_bought: false },
  { id: "wl-4", item_name: "Dispenser", target_amount: 2500000, priority: 4, is_bought: false },
  { id: "wl-5", item_name: "Kompor", target_amount: 2000000, priority: 5, is_bought: false },
];

export const initialTransactions: CashflowTransaction[] = [
  {
    id: "tx-1",
    period_id: "2026-11",
    cashflow_unit_id: "cf-4",
    amount: 3000000,
    date: "2026-11-01",
    notes: "Transfer bulanan Mandiri",
    created_at: "2026-11-01T08:30:00Z",
  },
  {
    id: "tx-2",
    period_id: "2026-11",
    cashflow_unit_id: "cf-5",
    amount: 1770000,
    date: "2026-11-01",
    notes: "Sewa Kos November",
    created_at: "2026-11-01T09:00:00Z",
  },
  {
    id: "tx-3",
    period_id: "2026-11",
    cashflow_unit_id: "cf-6",
    amount: 500000,
    date: "2026-11-02",
    notes: "Tagihan IndiHome & WiFi",
    created_at: "2026-11-02T10:15:00Z",
  },
  {
    id: "tx-4",
    period_id: "2026-11",
    cashflow_unit_id: "cf-10",
    amount: 79000,
    date: "2026-11-02",
    notes: "Netflix Subscription",
    created_at: "2026-11-02T14:20:00Z",
  },
  {
    id: "tx-5",
    period_id: "2026-11",
    cashflow_unit_id: "cf-12",
    amount: 85000,
    date: "2026-11-01",
    notes: "Makan Siang Resto",
    created_at: "2026-11-01T12:30:00Z",
  },
  {
    id: "tx-6",
    period_id: "2026-11",
    cashflow_unit_id: "cf-12",
    amount: 65000,
    date: "2026-11-02",
    notes: "Kopi & snack sore",
    created_at: "2026-11-02T16:00:00Z",
  },
  {
    id: "tx-7",
    period_id: "2026-11",
    cashflow_unit_id: "cf-15",
    amount: 50000,
    date: "2026-11-01",
    notes: "Bensin motor Shell",
    created_at: "2026-11-01T07:45:00Z",
  },
];

