import { MonthOption, MonthPeriodData } from "./types";
import { PayrollSettings } from "@/types";

export const availableMonths: MonthOption[] = [
  { value: "2026-09", label: "September 2026" },
  { value: "2026-10", label: "Oktober 2026" },
  { value: "2026-11", label: "November 2026" },
  { value: "2026-12", label: "Desember 2026" },
  { value: "2027-01", label: "Januari 2027" },
];

export const initialMonthsData: Record<string, MonthPeriodData> = {
  // Past month: LOCKED
  "2026-10": {
    period_month: "2026-10",
    status: "LOCKED",
    salary_budget: 10000000,
    additional_budget: 0,
    real_bca_balance: 0,
    real_jago_balance: 0,
    items: [],
  },
  // Current month: ACTIVE
  "2026-11": {
    period_month: "2026-11",
    status: "ACTIVE",
    salary_budget: 10000000,
    additional_budget: 0,
    real_bca_balance: 0,
    real_jago_balance: 0,
    items: [],
  },
  // Future months: PLANNING
  "2026-12": {
    period_month: "2026-12",
    status: "PLANNING",
    salary_budget: 10000000,
    additional_budget: 0,
    real_bca_balance: 0,
    real_jago_balance: 0,
    items: [],
  },
  "2027-01": {
    period_month: "2027-01",
    status: "PLANNING",
    salary_budget: 10000000,
    additional_budget: 0,
    real_bca_balance: 0,
    real_jago_balance: 0,
    items: [],
  },
};

export function getNextMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function isPaydayReached(settings: PayrollSettings, checkDate: Date = new Date()): boolean {
  const currentDay = checkDate.getDate();
  const lastDayOfMonth = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0).getDate();
  if (settings.is_last_day) {
    return currentDay >= lastDayOfMonth;
  }
  return currentDay >= settings.payday_day;
}

export const defaultPayrollSettings: PayrollSettings = {
  monthly_salary: 10000000,
  payday_day: 25,
  is_last_day: true,
  target_unit_id: "cf-inc-1",
  target_bank: "BCA",
  auto_post_transaction: true,
  next_month_allocation: true,
  last_posted_period: "",
};
