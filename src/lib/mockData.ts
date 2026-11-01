import { Asset, BudgetPeriod, BudgetPeriodItem, CashflowCategory, CashflowTransaction, CashflowUnit, WishlistItem } from "@/types";

export const initialCategories: CashflowCategory[] = [
  {
    id: "cat-1",
    code: "HOLY_THING",
    name: "Holy Thing",
    color: "#2196F3", // Primary Vibrant Blue
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
  real_bca_balance: 0,
  real_jago_balance: 0,
};

export const initialBudgetItems: BudgetPeriodItem[] = [];

export const initialWishlists: WishlistItem[] = [
  { id: "wl-1", item_name: "Rice Cooker", target_amount: 1000000, priority: 1, is_bought: false },
  { id: "wl-2", item_name: "Kulkas", target_amount: 3000000, priority: 2, is_bought: false },
  { id: "wl-3", item_name: "Mesin Cuci", target_amount: 3000000, priority: 3, is_bought: false },
  { id: "wl-4", item_name: "Dispenser", target_amount: 2500000, priority: 4, is_bought: false },
  { id: "wl-5", item_name: "Kompor", target_amount: 2000000, priority: 5, is_bought: false },
];

export const initialTransactions: CashflowTransaction[] = [];

