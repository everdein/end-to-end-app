import type { DraftAssetAccount, DraftBill, DraftIncomeSummaryItem } from './financialsTypes';

export const RENT_WITHDRAWAL_NAME = 'Rent';
export const RENT_RESERVE_ACCOUNT_NAME = 'Rent Reserve';
export const PRIMARY_PAYCHECK_CATEGORY = 'Net Income';
export const PRIMARY_PAYCHECK_INTERVAL = 'Bi-Weekly';

export function isRentWithdrawal(bill: Pick<DraftBill, 'bill'>) {
  return bill.bill.trim().toLowerCase() === RENT_WITHDRAWAL_NAME.toLowerCase();
}

export function isRentReserveAccount(account: Pick<DraftAssetAccount, 'account'>) {
  return account.account.trim().toLowerCase() === RENT_RESERVE_ACCOUNT_NAME.toLowerCase();
}

export function isPrimaryPaycheck(item: Pick<DraftIncomeSummaryItem, 'category' | 'interval'>) {
  return (
    item.category.trim().toLowerCase() === PRIMARY_PAYCHECK_CATEGORY.toLowerCase() &&
    item.interval.trim().toLowerCase() === PRIMARY_PAYCHECK_INTERVAL.toLowerCase()
  );
}
