export type NavTab = 
  | "budget" 
  | "realization" 
  | "bank-balance" 
  | "cashflow-items" 
  | "categories" 
  | "assets";

export interface ValidationAlertState {
  title: string;
  message: string;
  suggestArchiveUnitId?: string;
}

