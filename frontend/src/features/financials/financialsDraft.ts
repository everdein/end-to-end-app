import type {
  AnnualWithdrawal,
  AnnualWithdrawalSnapshotRequest,
  AssetCategory,
  AssetCategorySnapshotRequest,
  DebtAccountSnapshotRequest,
  ExpenseBill,
  ExpenseBillSnapshotRequest,
  ImportantDateSnapshotRequest,
  IncomeEventSnapshotRequest,
  IncomeSummaryItemSnapshotRequest,
} from '../../api/endpoints/financials';
import {
  isRentReserveAccount,
  isRentWithdrawal,
  PRIMARY_PAYCHECK_CATEGORY,
  PRIMARY_PAYCHECK_INTERVAL,
  RENT_RESERVE_ACCOUNT_NAME,
  RENT_WITHDRAWAL_NAME,
} from './financialsAnchors';
import type {
  AnnualWithdrawalFormState,
  AssetFormState,
  BillFormState,
  DraftAnnualWithdrawal,
  DraftAssetAccount,
  DraftAssetCategory,
  DraftBill,
  DraftDebtAccount,
  DraftImportantDate,
  DraftIncomeEvent,
  DraftIncomeSummaryItem,
  ImportantDateFormState,
  IncomeEventFormState,
  IncomeSummaryFormState,
  PendingRemoval,
} from './financialsTypes';

export const emptyForm: BillFormState = {
  bill: '',
  dueDay: '1',
  amount: '',
  account: 'Check',
  paid: false,
};
export const emptyAnnualWithdrawalForm: AnnualWithdrawalFormState = {
  bill: '',
  date: annualInputDate(1, 1),
  amount: '',
  account: 'Check',
  paid: false,
};
export const emptyAssetForm: AssetFormState = {
  account: '',
  company: '',
  amount: '',
};
export const emptyIncomeEventForm: IncomeEventFormState = {
  date: '',
  label: '',
  type: 'Paycheck',
  checkNumber: '',
};
export const emptyIncomeSummaryForm: IncomeSummaryFormState = {
  category: 'Net Income',
  interval: 'Bi-Weekly',
  amount: '',
};
export const emptyImportantDateForm: ImportantDateFormState = {
  date: '',
  event: '',
  type: 'Holiday',
};

export function toForm(bill: DraftBill): BillFormState {
  return {
    bill: bill.bill,
    dueDay: String(bill.dueDay),
    amount: String(bill.amount),
    account: bill.account,
    paid: bill.paid,
  };
}

export function toDraftBill(
  bill: ExpenseBill | DraftBill,
  payPeriodStart: string,
  payPeriodEnd: string
): DraftBill {
  const dueDate = dueDateForPeriod(bill.dueDay, payPeriodStart, payPeriodEnd);
  return {
    id: bill.id,
    bill: bill.bill,
    dueDay: bill.dueDay,
    dueLabel: ordinal(bill.dueDay),
    dueDate,
    amount: bill.amount,
    account: bill.account,
    paid: bill.paid,
    inPayPeriod: dueDate >= payPeriodStart && dueDate <= payPeriodEnd,
  };
}

export function formToDraftBill(
  id: number,
  form: BillFormState,
  payPeriodStart: string,
  payPeriodEnd: string
): DraftBill {
  return toDraftBill(
    {
      id,
      bill: form.bill.trim(),
      dueDay: Number(form.dueDay),
      dueLabel: '',
      dueDate: '',
      amount: Number(form.amount),
      account: form.account.trim(),
      paid: form.paid,
      inPayPeriod: false,
    },
    payPeriodStart,
    payPeriodEnd
  );
}

export function toSnapshotBill(bill: DraftBill): ExpenseBillSnapshotRequest {
  return {
    id: bill.id > 0 ? bill.id : null,
    bill: bill.bill,
    dueDay: bill.dueDay,
    amount: bill.amount,
    account: bill.account,
    paid: bill.paid,
  };
}

export function ensureRentWithdrawal(
  bills: DraftBill[],
  payPeriodStart: string,
  payPeriodEnd: string
) {
  if (bills.some(isRentWithdrawal)) {
    return bills;
  }

  const legacyRent = bills.find((bill) => bill.bill.toLowerCase().includes('rent'));
  if (legacyRent) {
    return bills.map((bill) =>
      bill.id === legacyRent.id
        ? toDraftBill({ ...bill, bill: RENT_WITHDRAWAL_NAME }, payPeriodStart, payPeriodEnd)
        : bill
    );
  }

  return [
    toDraftBill(
      {
        id: -100000,
        bill: RENT_WITHDRAWAL_NAME,
        dueDay: 1,
        dueLabel: '',
        dueDate: '',
        amount: 0,
        account: 'Check',
        paid: false,
        inPayPeriod: false,
      },
      payPeriodStart,
      payPeriodEnd
    ),
    ...bills,
  ];
}

export function toAnnualWithdrawalForm(
  withdrawal: DraftAnnualWithdrawal
): AnnualWithdrawalFormState {
  return {
    bill: withdrawal.bill,
    date: annualInputDate(withdrawal.month, withdrawal.day),
    amount: String(withdrawal.amount),
    account: withdrawal.account,
    paid: withdrawal.paid,
  };
}

export function toDraftAnnualWithdrawal(
  withdrawal: AnnualWithdrawal | DraftAnnualWithdrawal,
  payPeriodStart: string,
  payPeriodEnd: string
): DraftAnnualWithdrawal {
  const dueDate = annualDueDateForPeriod(
    withdrawal.month,
    withdrawal.day,
    payPeriodStart,
    payPeriodEnd
  );
  return {
    id: withdrawal.id,
    bill: withdrawal.bill,
    month: withdrawal.month,
    day: withdrawal.day,
    dateLabel: dateLabel(dueDate),
    dueDate,
    amount: withdrawal.amount,
    account: withdrawal.account,
    paid: withdrawal.paid,
    inPayPeriod: dueDate >= payPeriodStart && dueDate <= payPeriodEnd,
  };
}

export function formToAnnualWithdrawal(
  id: number,
  form: AnnualWithdrawalFormState,
  payPeriodStart: string,
  payPeriodEnd: string
): DraftAnnualWithdrawal {
  const { month, day } = parseAnnualDate(form.date);
  return toDraftAnnualWithdrawal(
    {
      id,
      bill: form.bill.trim(),
      month,
      day,
      dateLabel: '',
      dueDate: '',
      amount: Number(form.amount),
      account: form.account.trim(),
      paid: form.paid,
      inPayPeriod: false,
    },
    payPeriodStart,
    payPeriodEnd
  );
}

export function toSnapshotAnnualWithdrawal(
  withdrawal: DraftAnnualWithdrawal
): AnnualWithdrawalSnapshotRequest {
  return {
    id: withdrawal.id > 0 ? withdrawal.id : null,
    bill: withdrawal.bill,
    month: withdrawal.month,
    day: withdrawal.day,
    amount: withdrawal.amount,
    account: withdrawal.account,
    paid: withdrawal.paid,
  };
}

export function toDraftAssetCategory(category: AssetCategory): DraftAssetCategory {
  return category;
}

export function toAssetForm(account: DraftAssetAccount): AssetFormState {
  return {
    account: account.account,
    company: account.company,
    amount: String(account.amount),
  };
}

export function formToAssetAccount(id: number, form: AssetFormState): DraftAssetAccount {
  return {
    id,
    account: form.account.trim(),
    company: form.company.trim(),
    amount: Number(form.amount),
  };
}

export function recalculateAssetCategory(category: DraftAssetCategory): DraftAssetCategory {
  return {
    ...category,
    total: category.accounts.reduce((total, account) => total + account.amount, 0),
  };
}

export function toSnapshotCategory(category: DraftAssetCategory): AssetCategorySnapshotRequest {
  return {
    key: category.key,
    label: category.label,
    accounts: category.accounts.map((account) => ({
      id: account.id > 0 ? account.id : null,
      account: account.account,
      company: account.company,
      amount: account.amount,
    })),
  };
}

export function ensureRentReserveAccount(categories: DraftAssetCategory[]) {
  const cashSavings = categories.find((category) => category.key === 'cash-savings');
  if (!cashSavings) {
    return [
      ...categories,
      {
        accounts: [
          {
            id: -100001,
            account: RENT_RESERVE_ACCOUNT_NAME,
            company: 'Credit Union',
            amount: 0,
          },
        ],
        key: 'cash-savings',
        label: 'Cash & Savings',
        total: 0,
      },
    ];
  }

  if (cashSavings.accounts.some(isRentReserveAccount)) {
    return categories;
  }

  const legacyReserve = cashSavings.accounts.find((account) =>
    account.account.toLowerCase().includes('rent')
  );

  return categories.map((category) => {
    if (category.key !== 'cash-savings') {
      return category;
    }

    if (legacyReserve) {
      return recalculateAssetCategory({
        ...category,
        accounts: category.accounts.map((account) =>
          account.id === legacyReserve.id
            ? { ...account, account: RENT_RESERVE_ACCOUNT_NAME }
            : account
        ),
      });
    }

    return recalculateAssetCategory({
      ...category,
      accounts: [
        {
          id: -100001,
          account: RENT_RESERVE_ACCOUNT_NAME,
          company: 'Credit Union',
          amount: 0,
        },
        ...category.accounts,
      ],
    });
  });
}

export function toDebtForm(account: DraftDebtAccount): AssetFormState {
  return {
    account: account.account,
    company: account.company,
    amount: String(account.amount),
  };
}

export function formToDebtAccount(id: number, form: AssetFormState): DraftDebtAccount {
  return {
    id,
    account: form.account.trim(),
    company: form.company.trim(),
    amount: Number(form.amount),
  };
}

export function toSnapshotDebtAccount(account: DraftDebtAccount): DebtAccountSnapshotRequest {
  return {
    id: account.id > 0 ? account.id : null,
    account: account.account,
    company: account.company,
    amount: account.amount,
  };
}

export function toIncomeSummaryForm(item: DraftIncomeSummaryItem): IncomeSummaryFormState {
  return {
    category: item.category,
    interval: item.interval,
    amount: String(item.amount),
  };
}

export function formToIncomeSummaryItem(
  id: number,
  form: IncomeSummaryFormState
): DraftIncomeSummaryItem {
  return {
    id,
    category: form.category.trim(),
    interval: form.interval.trim(),
    amount: Number(form.amount),
  };
}

export function toSnapshotIncomeSummaryItem(
  item: DraftIncomeSummaryItem
): IncomeSummaryItemSnapshotRequest {
  return {
    id: item.id > 0 ? item.id : null,
    category: item.category,
    interval: item.interval,
    amount: item.amount,
  };
}

export function ensurePrimaryPaycheck(items: DraftIncomeSummaryItem[]) {
  if (
    items.some(
      (item) =>
        item.category === PRIMARY_PAYCHECK_CATEGORY && item.interval === PRIMARY_PAYCHECK_INTERVAL
    )
  ) {
    return items;
  }

  return [
    ...items,
    {
      id: -100002,
      category: PRIMARY_PAYCHECK_CATEGORY,
      interval: PRIMARY_PAYCHECK_INTERVAL,
      amount: 0,
    },
  ];
}

export function buildDerivedIncomeSummaryItems(
  items: DraftIncomeSummaryItem[],
  totalMonthlyWithdrawals: number
) {
  const primaryPaycheck = ensurePrimaryPaycheck(items).find(
    (item) =>
      item.category === PRIMARY_PAYCHECK_CATEGORY && item.interval === PRIMARY_PAYCHECK_INTERVAL
  );
  const biWeeklyNetIncome = primaryPaycheck?.amount ?? 0;
  const monthlyNetIncome = biWeeklyNetIncome * 2;
  const annualNetIncome = biWeeklyNetIncome * 26;
  const monthlyDisposableIncome = monthlyNetIncome - totalMonthlyWithdrawals;
  const biWeeklyDisposableIncome = monthlyDisposableIncome / 2;
  const weeklyDisposableIncome = biWeeklyDisposableIncome / 2;

  return [
    {
      id: -100003,
      category: PRIMARY_PAYCHECK_CATEGORY,
      interval: 'Annual',
      amount: annualNetIncome,
    },
    {
      id: -100004,
      category: PRIMARY_PAYCHECK_CATEGORY,
      interval: 'Month',
      amount: monthlyNetIncome,
    },
    {
      id: primaryPaycheck?.id ?? -100002,
      category: PRIMARY_PAYCHECK_CATEGORY,
      interval: PRIMARY_PAYCHECK_INTERVAL,
      amount: biWeeklyNetIncome,
    },
    {
      id: -100005,
      category: PRIMARY_PAYCHECK_CATEGORY,
      interval: 'Weekly',
      amount: biWeeklyNetIncome / 2,
    },
    {
      id: -100006,
      category: 'Disposable Income',
      interval: 'Annual',
      amount: monthlyDisposableIncome * 12,
    },
    {
      id: -100007,
      category: 'Disposable Income',
      interval: 'Month',
      amount: monthlyDisposableIncome,
    },
    {
      id: -100008,
      category: 'Disposable Income',
      interval: 'Bi-Weekly',
      amount: biWeeklyDisposableIncome,
    },
    {
      id: -100009,
      category: 'Disposable Income',
      interval: 'Weekly',
      amount: weeklyDisposableIncome,
    },
  ];
}

export function toIncomeEventForm(event: DraftIncomeEvent): IncomeEventFormState {
  return {
    date: event.date,
    label: event.label,
    type: event.type,
    checkNumber: event.checkNumber === null ? '' : String(event.checkNumber),
  };
}

export function formToIncomeEvent(id: number, form: IncomeEventFormState): DraftIncomeEvent {
  return {
    id,
    date: form.date,
    label: form.label.trim(),
    type: form.type.trim(),
    checkNumber: form.checkNumber ? Number(form.checkNumber) : null,
    checksInMonth: 0,
  };
}

export function withIncomeMonthlyCounts(events: DraftIncomeEvent[]): DraftIncomeEvent[] {
  const paycheckCounts = events.reduce<Record<string, number>>((counts, event) => {
    if (event.checkNumber !== null) {
      const monthKey = event.date.slice(0, 7);
      counts[monthKey] = (counts[monthKey] ?? 0) + 1;
    }
    return counts;
  }, {});
  return events
    .map((event) => ({ ...event, checksInMonth: paycheckCounts[event.date.slice(0, 7)] ?? 0 }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

export function getTodayIso() {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
}

export function getCurrentPaycheck(events: DraftIncomeEvent[], todayIso: string) {
  return events
    .filter((event) => event.checkNumber !== null && event.date <= todayIso)
    .sort((left, right) => right.date.localeCompare(left.date))[0];
}

export function withIncomeEventStatuses(
  events: DraftIncomeEvent[],
  todayIso: string
): DraftIncomeEvent[] {
  const currentPaycheck = getCurrentPaycheck(events, todayIso);

  return withIncomeMonthlyCounts(events).map((event) => {
    if (currentPaycheck && event.id === currentPaycheck.id) {
      return { ...event, status: 'current' };
    }

    return {
      ...event,
      status: event.date < todayIso ? 'received' : 'upcoming',
    };
  });
}

export function toSnapshotIncomeEvent(event: DraftIncomeEvent): IncomeEventSnapshotRequest {
  return {
    id: event.id > 0 ? event.id : null,
    date: event.date,
    label: event.label,
    type: event.type,
    checkNumber: event.checkNumber,
  };
}

export function toImportantDateForm(importantDate: DraftImportantDate): ImportantDateFormState {
  return { date: importantDate.date, event: importantDate.event, type: importantDate.type };
}

export function formToImportantDate(id: number, form: ImportantDateFormState): DraftImportantDate {
  return { id, date: form.date, event: form.event.trim(), type: form.type.trim() };
}

export function getNextImportantDate(dates: DraftImportantDate[], todayIso: string) {
  return dates
    .filter((importantDate) => importantDate.date >= todayIso)
    .sort((left, right) => left.date.localeCompare(right.date))[0];
}

export function withImportantDateStatuses(
  dates: DraftImportantDate[],
  todayIso: string
): DraftImportantDate[] {
  const nextImportantDate = getNextImportantDate(dates, todayIso);

  return [...dates]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((importantDate) => {
      if (nextImportantDate && importantDate.id === nextImportantDate.id) {
        return { ...importantDate, status: 'next' };
      }

      return {
        ...importantDate,
        status: importantDate.date < todayIso ? 'passed' : 'upcoming',
      };
    });
}

export function toSnapshotImportantDate(
  importantDate: DraftImportantDate
): ImportantDateSnapshotRequest {
  return {
    id: importantDate.id > 0 ? importantDate.id : null,
    date: importantDate.date,
    event: importantDate.event,
    type: importantDate.type,
  };
}

export function removalItemType(pendingRemoval: PendingRemoval) {
  switch (pendingRemoval.type) {
    case 'bill':
      return 'withdrawal';
    case 'annual-withdrawal':
      return 'annual withdrawal';
    case 'asset':
      return 'account';
    case 'debt':
      return 'debt account';
    case 'income-summary':
      return 'income summary item';
    case 'income':
      return 'income event';
    case 'important-date':
      return 'important date';
  }
}

function ordinal(day: number) {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function dueDateForPeriod(dueDay: number, payPeriodStart: string, payPeriodEnd: string) {
  const startDate = new Date(`${payPeriodStart}T00:00:00`);
  const endDate = new Date(`${payPeriodEnd}T00:00:00`);
  let dueDate = safeDate(startDate.getFullYear(), startDate.getMonth(), dueDay);
  if (dueDate < startDate && startDate.getMonth() !== endDate.getMonth())
    dueDate = safeDate(endDate.getFullYear(), endDate.getMonth(), dueDay);
  return dueDate.toISOString().slice(0, 10);
}

function annualDueDateForPeriod(
  dayMonth: number,
  day: number,
  payPeriodStart: string,
  payPeriodEnd: string
) {
  const startDate = new Date(`${payPeriodStart}T00:00:00`);
  const endDate = new Date(`${payPeriodEnd}T00:00:00`);
  let dueDate = safeDate(startDate.getFullYear(), dayMonth - 1, day);
  if (dueDate < startDate && startDate.getFullYear() !== endDate.getFullYear())
    dueDate = safeDate(endDate.getFullYear(), dayMonth - 1, day);
  return dueDate.toISOString().slice(0, 10);
}

function safeDate(year: number, monthIndex: number, day: number) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, daysInMonth));
}

function dateLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

function parseAnnualDate(value: string) {
  if (value.includes('-')) {
    const [, month = 1, day = 1] = value.split('-').map(Number);
    return { month, day };
  }

  const [month = 1, day = 1] = value.split('/').map(Number);
  return { month, day };
}

function annualInputDate(month: number, day: number) {
  const year = new Date().getFullYear();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
