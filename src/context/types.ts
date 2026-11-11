import {
  Asset,
  BudgetPeriodItem,
  CashflowCategory,
  CashflowTransaction,
  CashflowUnit,
  WishlistItem,
  PeriodStatus,
  PayrollSettings,
  SelfLoan,
  SelfLoanPayment,
  SelfLoanTargetBank,
} from "@/types";

export interface MonthPeriodData {
  period_month: string; // Format: "YYYY-MM"
  status: PeriodStatus; // "PLANNING" | "ACTIVE" | "LOCKED"
  salary_budget: number;
  additional_budget: number; // Anggaran Tambahan / Sisa Dana Bulan Lalu
  real_bca_balance: number;
  real_jago_balance: number;
  items: BudgetPeriodItem[];
}

export interface MonthOption {
  value: string;
  label: string;
}

export type CloudSyncStatus = "CONNECTED" | "CONNECTING" | "OFFLINE" | "ERROR";

export interface AppContextType {
  // Data
  assets: Asset[];
  cashflowUnits: CashflowUnit[];
  categories: CashflowCategory[];
  wishlists: WishlistItem[];
  transactions: CashflowTransaction[];
  selfLoans: SelfLoan[];
  selfLoanPayments: SelfLoanPayment[];

  // Cloud Sync & Realtime Status
  cloudSyncStatus: CloudSyncStatus;
  retryCloudSync: () => Promise<{ success: boolean; message?: string }>;

  // Payroll & Payday Engine
  payrollSettings: PayrollSettings;
  updatePayrollSettings: (settings: Partial<PayrollSettings>) => void;
  triggerPaydayExecution: (monthKey?: string) => {
    success: boolean;
    message: string;
    txAdded?: boolean;
    budgetAllocated?: boolean;
  };

  // Multi-month state
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  availableMonths: MonthOption[];
  currentMonthData: MonthPeriodData;

  // Actions: Budget Module
  addItemToCurrentMonth: (unitId: string, customAmount?: number) => void;
  removeItemFromCurrentMonth: (itemId: string) => void;
  updateItemBudgetAmount: (itemId: string, newBudget: number) => void;
  updateMonthIncome: (salaryBudget: number, additionalBudget: number) => void;
  updateBankBalance: (bcaBalance: number, jagoBalance: number) => void;
  saveCurrentMonthBudget: () => boolean;
  copyPreviousMonthBudget: () => boolean;
  getPreviousMonthUnitNominal: (unitId: string) => number | null;

  // Governance Actions
  lockCurrentMonth: () => void;
  unlockCurrentMonth: () => void;

  // Actions: Mobile & Realization
  toggleItemRealized: (itemId: string) => void;
  updateItemRealization: (itemId: string, newRealization: number) => void;
  /** @deprecated backward compat alias */
  updateItemProjection: (itemId: string, newProjection: number) => void;
  addTransaction: (
    tx: Omit<CashflowTransaction, "id" | "created_at">,
    options?: { markSettled?: boolean }
  ) => void;
  updateTransaction: (
    txId: string,
    data: Partial<Omit<CashflowTransaction, "id" | "created_at">>,
    options?: { markSettled?: boolean }
  ) => void;
  deleteTransaction: (txId: string) => void;

  // Actions: Master Data
  createCashflowUnit: (unit: Omit<CashflowUnit, "id" | "is_active">) => Promise<{ success: boolean; message?: string }>;
  updateCashflowUnit: (id: string, unit: Partial<CashflowUnit>) => Promise<{ success: boolean; message?: string }>;
  deleteCashflowUnit: (id: string) => Promise<{ success: boolean; message?: string }>;
  createCategory: (cat: Omit<CashflowCategory, "id">) => Promise<{ success: boolean; message?: string }>;
  updateCategory: (id: string, cat: Partial<CashflowCategory>) => Promise<{ success: boolean; message?: string }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; message?: string }>;
  createAsset: (asset: Omit<Asset, "id" | "total_value">) => Promise<{ success: boolean; message?: string }>;
  updateAsset: (id: string, asset: Partial<Asset>) => Promise<{ success: boolean; message?: string }>;
  deleteAsset: (id: string) => Promise<{ success: boolean; message?: string }>;
  toggleWishlistBought: (wishlistId: string) => void;

  // Actions: Self-Loan (Borrow from & Repay Own Assets)
  createSelfLoan: (input: {
    asset_id: string;
    title: string;
    principal_amount: number;
    target_bank: SelfLoanTargetBank;
    loan_date: string;
    due_date?: string;
    notes?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  repaySelfLoan: (input: {
    loan_id: string;
    amount: number;
    source_bank: SelfLoanTargetBank;
    payment_date: string;
    notes?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  deleteSelfLoan: (id: string) => Promise<{ success: boolean; message?: string }>;
}
