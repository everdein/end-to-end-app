import { httpDelete, httpGet, httpPost, httpPut } from '../client';

export type ExpenseBill = {
  id: number;
  bill: string;
  dueDay: number;
  dueLabel: string;
  dueDate: string;
  amount: number;
  account: string;
  paid: boolean;
  inPayPeriod: boolean;
};

export type ExpenseBillRequest = {
  bill: string;
  dueDay: number;
  amount: number;
  account: string;
  paid: boolean;
};

export type PayPeriodRequest = {
  startDate: string;
  endDate: string;
};

export type ExpenseBillSnapshotRequest = {
  id: number | null;
  bill: string;
  dueDay: number;
  amount: number;
  account: string;
  paid: boolean;
};

export type ExpenseSnapshotRequest = {
  payPeriodStart: string;
  payPeriodEnd: string;
  bills: ExpenseBillSnapshotRequest[];
  assetCategories: AssetCategorySnapshotRequest[];
};

export type AssetAccount = {
  id: number;
  account: string;
  company: string;
  amount: number;
};

export type AssetCategory = {
  key: string;
  label: string;
  total: number;
  accounts: AssetAccount[];
};

export type AssetAccountSnapshotRequest = {
  id: number | null;
  account: string;
  company: string;
  amount: number;
};

export type AssetCategorySnapshotRequest = {
  key: string;
  label: string;
  accounts: AssetAccountSnapshotRequest[];
};

export type ExpenseSnapshot = {
  payPeriodStart: string;
  payPeriodEnd: string;
  totalMonthlyExpenses: number;
  paidTotal: number;
  unpaidTotal: number;
  payPeriodTotal: number;
  totalTrackedAssets: number;
  assetCategories: AssetCategory[];
  bills: ExpenseBill[];
};

export const financialsService = {
  getMonthlyExpenses: () => httpGet<ExpenseSnapshot>('/api/financials/expenses'),
  addBill: (payload: ExpenseBillRequest) =>
    httpPost<ExpenseBill, ExpenseBillRequest>('/api/financials/expenses', payload),
  updateBill: (id: number, payload: ExpenseBillRequest) =>
    httpPut<ExpenseBill, ExpenseBillRequest>(`/api/financials/expenses/${id}`, payload),
  deleteBill: (id: number) => httpDelete(`/api/financials/expenses/${id}`),
  updatePayPeriod: (payload: PayPeriodRequest) =>
    httpPut<ExpenseSnapshot, PayPeriodRequest>('/api/financials/pay-period', payload),
  saveSnapshot: (payload: ExpenseSnapshotRequest) =>
    httpPut<ExpenseSnapshot, ExpenseSnapshotRequest>('/api/financials/expenses/snapshot', payload),
};
