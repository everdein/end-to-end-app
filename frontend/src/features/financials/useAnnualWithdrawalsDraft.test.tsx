import { act, renderHook } from '@testing-library/react';
import { type FormEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DraftAnnualWithdrawal } from './financialsTypes';
import { useAnnualWithdrawalsDraft } from './useAnnualWithdrawalsDraft';

const preventDefault = vi.fn();
const submitEvent = { preventDefault } as unknown as FormEvent<HTMLFormElement>;

type AnnualWithdrawalsDraftHook = ReturnType<typeof useAnnualWithdrawalsDraft>;

function annualWithdrawal(overrides: Partial<DraftAnnualWithdrawal> = {}): DraftAnnualWithdrawal {
  return {
    account: 'Checking',
    amount: 120,
    bill: 'Annual service',
    dateLabel: '06/10/2026',
    day: 10,
    dueDate: '2026-06-10',
    id: 2,
    inPayPeriod: true,
    month: 6,
    paid: true,
    ...overrides,
  };
}

function loadDraft(
  result: { readonly current: AnnualWithdrawalsDraftHook },
  draftAnnualWithdrawals: DraftAnnualWithdrawal[]
) {
  act(() => {
    result.current.loadDraft({
      annualWithdrawalForm: {
        account: 'Check',
        amount: '',
        bill: '',
        date: '2026-01-01',
        paid: false,
      },
      draftAnnualWithdrawals,
    });
  });
}

describe('useAnnualWithdrawalsDraft', () => {
  beforeEach(() => {
    preventDefault.mockClear();
  });

  it('loads, sorts, and totals annual withdrawals without marking the draft dirty', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useAnnualWithdrawalsDraft(onChange, '2026-06-01', '2026-06-15')
    );

    loadDraft(result, [
      annualWithdrawal({ amount: 80, day: 5, id: 3, inPayPeriod: false, month: 12, paid: false }),
      annualWithdrawal(),
    ]);

    expect(result.current.annualWithdrawals.map(({ id }) => id)).toEqual([2, 3]);
    expect(result.current.totals).toEqual({
      annualPayPeriodTotal: 120,
      totalAnnualWithdrawals: 200,
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('adds a temporary annual withdrawal and marks the aggregate draft dirty', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useAnnualWithdrawalsDraft(onChange, '2026-06-01', '2026-06-15')
    );
    loadDraft(result, []);

    act(() => result.current.updateAnnualWithdrawalForm('bill', ' Registration '));
    act(() => result.current.updateAnnualWithdrawalForm('date', '2026-06-10'));
    act(() => result.current.updateAnnualWithdrawalForm('amount', '45.50'));
    act(() => result.current.updateAnnualWithdrawalForm('account', ' Checking '));
    act(() => result.current.submitAnnualWithdrawal(submitEvent));

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(result.current.annualWithdrawals).toEqual([
      expect.objectContaining({
        account: 'Checking',
        amount: 45.5,
        bill: 'Registration',
        day: 10,
        dueDate: '2026-06-10',
        id: -1,
        inPayPeriod: true,
        month: 6,
      }),
    ]);
    expect(result.current.editingAnnualWithdrawalId).toBeNull();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('edits and removes an annual withdrawal', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useAnnualWithdrawalsDraft(onChange, '2026-06-01', '2026-06-15')
    );
    const withdrawal = annualWithdrawal();
    loadDraft(result, [withdrawal]);

    act(() => result.current.startAnnualWithdrawalEdit(withdrawal));
    act(() => result.current.updateAnnualWithdrawalForm('amount', '150'));
    act(() => result.current.submitAnnualWithdrawal(submitEvent));

    expect(result.current.annualWithdrawals).toEqual([
      expect.objectContaining({ amount: 150, id: withdrawal.id }),
    ]);

    act(() => result.current.removeAnnualWithdrawal(withdrawal.id));

    expect(result.current.annualWithdrawals).toEqual([]);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('recalculates annual dates when the pay period crosses into a new year', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ end, start }) => useAnnualWithdrawalsDraft(onChange, start, end),
      { initialProps: { end: '2026-12-15', start: '2026-12-01' } }
    );
    loadDraft(result, [annualWithdrawal({ day: 5, inPayPeriod: false, month: 1 })]);

    rerender({ end: '2027-01-10', start: '2026-12-20' });

    expect(result.current.annualWithdrawals[0]).toEqual(
      expect.objectContaining({ dueDate: '2027-01-05', inPayPeriod: true })
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});
