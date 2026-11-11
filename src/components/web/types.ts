export type NavTab = 
  | "budget" 
  | "realization" 
  | "bank-balance" 
  | "self-loan"
  | "cashflow-items" 
  | "categories" 
  | "assets";

export interface ValidationAlertState {
  title: string;
  message: string;
  suggestArchiveUnitId?: string;
}

