/**
 * Financials API types and endpoints (v1)
 *
 * MONEY HANDLING STRATEGY:
 * - Backend: All monetary values are BigDecimal (precise decimal arithmetic)
 * - JSON transport: BigDecimal serializes to JSON numbers (string representation of decimals)
 * - Frontend: Money values are TypeScript `number` (IEEE 754 double precision)
 *
 * This design provides production-grade precision on the backend while keeping
 * frontend forms/display simple. A future phase can migrate frontend to integer
 * cents (BigInt or number * 100) if stricter arithmetic guarantees are needed.
 *
 * For now: display/input treats values as decimal numbers; backend calculations remain authoritative.
 *
 * API VERSIONING:
 * - Explicit /api/v1/ prefix for clear backward compatibility
 * - Endpoint structure: /api/v1/financials (main resource)
 *   - GET /api/v1/financials → snapshot
 *   - PUT /api/v1/financials → save snapshot
 *   - POST /api/v1/financials/bills → create bill
 *   - PUT /api/v1/financials/bills/{id} → update bill
 *   - DELETE /api/v1/financials/bills/{id} → delete bill
 *   - PUT /api/v1/financials/pay-period → update pay period
 */

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

export type AnnualWithdrawal = {
  id: number;
  bill: string;
  month: number;
  day: number;
  dateLabel: string;
  dueDate: string;
  amount: number;
  account: string;
  paid: boolean;
  inPayPeriod: boolean;
};

export type AnnualWithdrawalSnapshotRequest = {
  id: number | null;
  bill: string;
  month: number;
  day: number;
  amount: number;
  account: string;
  paid: boolean;
};

export type ExpenseSnapshotRequest = {
  payPeriodStart: string;
  payPeriodEnd: string;
  bills: ExpenseBillSnapshotRequest[];
  annualWithdrawals: AnnualWithdrawalSnapshotRequest[];
  assetCategories: AssetCategorySnapshotRequest[];
  debtAccounts: DebtAccountSnapshotRequest[];
  incomeSummaryItems: IncomeSummaryItemSnapshotRequest[];
  incomeEvents: IncomeEventSnapshotRequest[];
  importantDates: ImportantDateSnapshotRequest[];
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

export type DebtAccount = {
  id: number;
  account: string;
  company: string;
  amount: number;
};

export type DebtAccountSnapshotRequest = {
  id: number | null;
  account: string;
  company: string;
  amount: number;
};

export type IncomeSummaryItem = {
  id: number;
  category: string;
  interval: string;
  amount: number;
};

export type IncomeSummaryItemSnapshotRequest = {
  id: number | null;
  category: string;
  interval: string;
  amount: number;
};

export type IncomeEvent = {
  id: number;
  date: string;
  label: string;
  type: string;
  checkNumber: number | null;
  checksInMonth: number;
};

export type IncomeEventSnapshotRequest = {
  id: number | null;
  date: string;
  label: string;
  type: string;
  checkNumber: number | null;
};

export type ImportantDate = {
  id: number;
  date: string;
  event: string;
  type: string;
};

export type ImportantDateSnapshotRequest = {
  id: number | null;
  date: string;
  event: string;
  type: string;
};

export type ExpenseSnapshot = {
  payPeriodStart: string;
  payPeriodEnd: string;
  totalMonthlyExpenses: number;
  paidTotal: number;
  unpaidTotal: number;
  payPeriodTotal: number;
  totalAnnualWithdrawals: number;
  annualPayPeriodTotal: number;
  totalTrackedAssets: number;
  totalDebt: number;
  netWorth: number;
  assetCategories: AssetCategory[];
  debtAccounts: DebtAccount[];
  incomeSummaryItems: IncomeSummaryItem[];
  bills: ExpenseBill[];
  annualWithdrawals: AnnualWithdrawal[];
  incomeEvents: IncomeEvent[];
  importantDates: ImportantDate[];
};

export const financialsService = {
  getMonthlyExpenses: () => httpGet<ExpenseSnapshot>('/api/v1/financials'),
  addBill: (payload: ExpenseBillRequest) =>
    httpPost<ExpenseBill, ExpenseBillRequest>('/api/v1/financials/bills', payload),
  updateBill: (id: number, payload: ExpenseBillRequest) =>
    httpPut<ExpenseBill, ExpenseBillRequest>(`/api/v1/financials/bills/${id}`, payload),
  deleteBill: (id: number) => httpDelete(`/api/v1/financials/bills/${id}`),
  updatePayPeriod: (payload: PayPeriodRequest) =>
    httpPut<ExpenseSnapshot, PayPeriodRequest>('/api/v1/financials/pay-period', payload),
  saveSnapshot: (payload: ExpenseSnapshotRequest) =>
    httpPut<ExpenseSnapshot, ExpenseSnapshotRequest>('/api/v1/financials', payload),
};
