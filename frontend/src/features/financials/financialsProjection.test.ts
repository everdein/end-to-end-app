import { describe, expect, it } from 'vitest';

import {
  buildDerivedIncomeSummaryItems,
  ensurePrimaryPaycheck,
  ensureRentReserveAccount,
  ensureRentWithdrawal,
} from './financialsDraft';
import {
  buildProjectionPeriod,
  buildProjectionSummary,
  nextPayPeriod,
} from './financialsProjection';
import type {
  DraftAnnualWithdrawal,
  DraftAssetCategory,
  DraftBill,
  DraftIncomeSummaryItem,
} from './financialsTypes';

function bill(overrides: Partial<DraftBill>): DraftBill {
  return {
    account: 'Check',
    amount: 0,
    bill: 'Bill',
    dueDate: '2026-06-12',
    dueDay: 12,
    dueLabel: '12th',
    id: 1,
    inPayPeriod: true,
    paid: false,
    ...overrides,
  };
}

function annualWithdrawal(overrides: Partial<DraftAnnualWithdrawal>): DraftAnnualWithdrawal {
  return {
    account: 'Check',
    amount: 0,
    bill: 'Annual Bill',
    dateLabel: '06/30/2026',
    day: 30,
    dueDate: '2026-06-30',
    id: 1,
    inPayPeriod: true,
    month: 6,
    paid: false,
    ...overrides,
  };
}

function cashSavings(amount: number): DraftAssetCategory {
  return {
    accounts: [
      {
        account: 'Rent Reserve',
        amount,
        company: 'Credit Union',
        id: 1,
      },
    ],
    key: 'cash-savings',
    label: 'Cash & Savings',
    total: amount,
  };
}

describe('financialsProjection', () => {
  it('uses rent savings for rent due and sets aside the next rent contribution', () => {
    const result = buildProjectionPeriod(
      'Current Pay Period',
      '2026-06-26',
      '2026-07-09',
      [bill({ amount: 2600, bill: 'Rent', dueDay: 1, id: 1 })],
      [],
      3396.25,
      bill({ amount: 2600, bill: 'Rent', dueDay: 1, id: 1 }),
      1300
    );

    expect(result.period.rentCoveredBySavings).toBe(1300);
    expect(result.period.rentContribution).toBe(1300);
    expect(result.period.projectedBeforeDebt).toBe(2096.25);
    expect(result.endingRentSavings).toBe(1300);
  });

  it('includes annual withdrawals due in the next pay period', () => {
    const projection = buildProjectionSummary({
      annualWithdrawals: [
        annualWithdrawal({
          amount: 99,
          bill: 'Arc Studio',
          day: 30,
          dueDate: '2026-12-30',
          month: 12,
        }),
      ],
      annualWithdrawalsInPayPeriod: [],
      cashSavings: cashSavings(1300),
      paycheckIncome: 3396.25,
      payPeriodEnd: '2026-12-29',
      payPeriodStart: '2026-12-16',
      sortedBills: [
        bill({
          amount: 2600,
          bill: 'Rent',
          dueDay: 1,
          id: 1,
          inPayPeriod: false,
        }),
      ],
      totalDebt: 0,
    });

    expect(projection.periods[1]?.payPeriodStart).toBe('2026-12-30');
    expect(projection.periods[1]?.annualWithdrawalsDue).toBe(99);
    expect(projection.nextPayPeriodCashAfterBills).toBe(1997.25);
  });

  it('applies next pay period cash to debt before HYSA transfers', () => {
    const projection = buildProjectionSummary({
      annualWithdrawals: [],
      annualWithdrawalsInPayPeriod: [],
      cashSavings: cashSavings(1300),
      paycheckIncome: 3396.25,
      payPeriodEnd: '2026-06-25',
      payPeriodStart: '2026-06-12',
      sortedBills: [
        bill({
          amount: 2600,
          bill: 'Rent',
          dueDay: 1,
          id: 1,
          inPayPeriod: false,
        }),
        bill({ amount: 148, bill: 'T-Mobile', dueDay: 28, id: 2, inPayPeriod: false }),
      ],
      totalDebt: 2130.03,
    });

    expect(projection.nextPayPeriodCashAfterBills).toBe(1948.25);
    expect(projection.nextPayPeriodDebtPayment).toBe(1948.25);
    expect(projection.nextPayPeriodDebtRemaining).toBeCloseTo(181.78);
    expect(projection.nextPayPeriodHysaTransfer).toBe(0);
  });

  it('shows possible HYSA transfer only after debt is covered', () => {
    const projection = buildProjectionSummary({
      annualWithdrawals: [],
      annualWithdrawalsInPayPeriod: [],
      cashSavings: cashSavings(1300),
      paycheckIncome: 3396.25,
      payPeriodEnd: '2026-06-25',
      payPeriodStart: '2026-06-12',
      sortedBills: [
        bill({
          amount: 2600,
          bill: 'Rent',
          dueDay: 1,
          id: 1,
          inPayPeriod: false,
        }),
      ],
      totalDebt: 500,
    });

    expect(projection.nextPayPeriodDebtPayment).toBe(500);
    expect(projection.nextPayPeriodDebtRemaining).toBe(0);
    expect(projection.nextPayPeriodHysaTransfer).toBe(1596.25);
  });

  it('rolls the next pay period across month and year boundaries', () => {
    expect(nextPayPeriod('2026-12-18', '2026-12-31')).toEqual({
      end: '2027-01-14',
      start: '2027-01-01',
    });
  });

  it('normalizes hidden projection anchors without exposing row metadata', () => {
    const bills = ensureRentWithdrawal(
      [bill({ bill: 'Apartment Rent Holding', id: 7 })],
      '2026-06-12',
      '2026-06-26'
    );
    const categories = ensureRentReserveAccount([
      {
        accounts: [
          {
            account: 'Member Savings (Rent)',
            amount: 1300,
            company: 'Credit Union',
            id: 8,
          },
        ],
        key: 'cash-savings',
        label: 'Cash & Savings',
        total: 1300,
      },
    ]);
    const incomeItems: DraftIncomeSummaryItem[] = ensurePrimaryPaycheck([]);

    expect(bills[0]?.bill).toBe('Rent');
    expect(categories[0]?.accounts[0]?.account).toBe('Rent Reserve');
    expect(incomeItems).toContainEqual({
      amount: 0,
      category: 'Net Income',
      id: -100002,
      interval: 'Bi-Weekly',
    });
  });

  it('derives income summary rows from bi-weekly net income and monthly withdrawals', () => {
    const items = buildDerivedIncomeSummaryItems(
      [
        {
          amount: 3396.25,
          category: 'Net Income',
          id: 7,
          interval: 'Bi-Weekly',
        },
      ],
      4890.92
    );

    expect(items).toContainEqual({
      amount: 88302.5,
      category: 'Net Income',
      id: -100003,
      interval: 'Annual',
    });
    expect(items).toContainEqual({
      amount: 6792.5,
      category: 'Net Income',
      id: -100004,
      interval: 'Month',
    });
    expect(items).toContainEqual({
      amount: 3396.25,
      category: 'Net Income',
      id: 7,
      interval: 'Bi-Weekly',
    });
    expect(
      items.find((item) => item.category === 'Disposable Income' && item.interval === 'Month')
        ?.amount
    ).toBeCloseTo(1901.58);
    expect(
      items.find((item) => item.category === 'Disposable Income' && item.interval === 'Weekly')
        ?.amount
    ).toBeCloseTo(475.4);
  });
});
