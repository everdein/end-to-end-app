import { act, renderHook } from '@testing-library/react';
import { type FormEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DraftBill } from './financialsTypes';
import { useMonthlyWithdrawalsDraft } from './useMonthlyWithdrawalsDraft';

const preventDefault = vi.fn();
const submitEvent = { preventDefault } as unknown as FormEvent<HTMLFormElement>;

function bill(overrides: Partial<DraftBill> = {}): DraftBill {
  return {
    account: 'Checking',
    amount: 100,
    bill: 'Utilities',
    dueDate: '2026-06-10',
    dueDay: 10,
    dueLabel: '10th',
    id: 2,
    inPayPeriod: true,
    paid: true,
    ...overrides,
  };
}

function loadDraft(
  result: ReturnType<
    typeof renderHook<ReturnType<typeof useMonthlyWithdrawalsDraft>, unknown>
  >['result'],
  draftBills: DraftBill[]
) {
  act(() => {
    result.current.loadDraft({
      draftBills,
      payPeriodEnd: '2026-06-15',
      payPeriodStart: '2026-06-01',
    });
  });
}

describe('useMonthlyWithdrawalsDraft', () => {
  beforeEach(() => {
    preventDefault.mockClear();
  });

  it('loads, sorts, and totals monthly bills without marking the draft dirty', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useMonthlyWithdrawalsDraft(onChange));

    loadDraft(result, [
      bill({ amount: 50, dueDay: 20, id: 3, inPayPeriod: false, paid: false }),
      bill(),
    ]);

    expect(result.current.sortedBills.map(({ id }) => id)).toEqual([2, 3]);
    expect(result.current.totals).toEqual({
      paidTotal: 100,
      payPeriodTotal: 100,
      totalMonthlyExpenses: 150,
      unpaidTotal: 50,
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('adds a temporary bill and marks the aggregate draft dirty', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useMonthlyWithdrawalsDraft(onChange));
    loadDraft(result, []);

    act(() => result.current.updateForm('bill', ' Internet '));
    act(() => result.current.updateForm('dueDay', '5'));
    act(() => result.current.updateForm('amount', '75.50'));
    act(() => result.current.updateForm('account', ' Checking '));
    act(() => result.current.submitBill(submitEvent));

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(result.current.sortedBills).toEqual([
      expect.objectContaining({
        account: 'Checking',
        amount: 75.5,
        bill: 'Internet',
        dueDate: '2026-06-05',
        id: -1,
        inPayPeriod: true,
      }),
    ]);
    expect(result.current.formTitle).toBe('Add Bill');
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('preserves the Rent anchor and removes ordinary bills', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useMonthlyWithdrawalsDraft(onChange));
    const rent = bill({ bill: 'Rent', id: 1 });
    const utilities = bill();
    loadDraft(result, [rent, utilities]);

    act(() => result.current.startEdit(rent));
    act(() => result.current.updateForm('bill', 'Renamed'));
    act(() => result.current.updateForm('amount', '125'));
    act(() => result.current.submitBill(submitEvent));
    act(() => result.current.removeBill(rent.id));
    act(() => result.current.removeBill(utilities.id));

    expect(result.current.sortedBills).toEqual([
      expect.objectContaining({ amount: 125, bill: 'Rent', id: rent.id }),
    ]);
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('recalculates bill dates when the pay period changes', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useMonthlyWithdrawalsDraft(onChange));
    loadDraft(result, [bill({ dueDay: 20, inPayPeriod: false })]);

    act(() => result.current.updatePayPeriodStart('2026-06-16'));
    act(() => result.current.updatePayPeriodEnd('2026-06-30'));

    expect(result.current.sortedBills[0]).toEqual(
      expect.objectContaining({ dueDate: '2026-06-20', inPayPeriod: true })
    );
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
