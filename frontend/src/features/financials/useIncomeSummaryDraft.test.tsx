import { act, renderHook } from '@testing-library/react';
import { type FormEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DraftIncomeSummaryItem } from './financialsTypes';
import { useIncomeSummaryDraft } from './useIncomeSummaryDraft';

const preventDefault = vi.fn();
const submitEvent = { preventDefault } as unknown as FormEvent<HTMLFormElement>;

type IncomeSummaryDraftHook = ReturnType<typeof useIncomeSummaryDraft>;

function item(overrides: Partial<DraftIncomeSummaryItem> = {}): DraftIncomeSummaryItem {
  return {
    amount: 1000,
    category: 'Net Income',
    id: 1,
    interval: 'Bi-Weekly',
    ...overrides,
  };
}

function loadDraft(
  result: { readonly current: IncomeSummaryDraftHook },
  draftIncomeSummaryItems: DraftIncomeSummaryItem[]
) {
  const primaryPaycheck = draftIncomeSummaryItems.find(
    ({ category, interval }) => category === 'Net Income' && interval === 'Bi-Weekly'
  );

  act(() => {
    result.current.loadDraft({
      draftIncomeSummaryItems,
      incomeSummaryForm: primaryPaycheck
        ? {
            amount: String(primaryPaycheck.amount),
            category: primaryPaycheck.category,
            interval: primaryPaycheck.interval,
          }
        : { amount: '', category: 'Net Income', interval: 'Bi-Weekly' },
    });
  });
}

function derivedAmount(
  result: { readonly current: IncomeSummaryDraftHook },
  category: string,
  interval: string
) {
  return result.current.derivedIncomeSummaryItems.find(
    (summary) => summary.category === category && summary.interval === interval
  )?.amount;
}

describe('useIncomeSummaryDraft', () => {
  beforeEach(() => {
    preventDefault.mockClear();
  });

  it('sorts sources and recalculates derived income when monthly withdrawals change', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ withdrawals }) => useIncomeSummaryDraft(onChange, withdrawals),
      { initialProps: { withdrawals: 600 } }
    );
    loadDraft(result, [
      item({ amount: 100, category: 'Side Income', id: 2, interval: 'Month' }),
      item(),
    ]);

    expect(result.current.sourceIncomeSummaryItems.map(({ category }) => category)).toEqual([
      'Net Income',
      'Side Income',
    ]);
    expect(result.current.primaryPaycheckIncome?.amount).toBe(1000);
    expect(derivedAmount(result, 'Net Income', 'Month')).toBe(2000);
    expect(derivedAmount(result, 'Disposable Income', 'Month')).toBe(1400);

    rerender({ withdrawals: 800 });

    expect(derivedAmount(result, 'Disposable Income', 'Month')).toBe(1200);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('adds a temporary income source and restores the primary paycheck form', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useIncomeSummaryDraft(onChange, 0));
    loadDraft(result, [item()]);

    act(() => result.current.updateIncomeSummaryForm('category', ' Bonus '));
    act(() => result.current.updateIncomeSummaryForm('interval', ' Month '));
    act(() => result.current.updateIncomeSummaryForm('amount', '250'));
    act(() => result.current.submitIncomeSummaryItem(submitEvent));

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(result.current.sourceIncomeSummaryItems).toContainEqual({
      amount: 250,
      category: 'Bonus',
      id: -1,
      interval: 'Month',
    });
    expect(result.current.incomeSummaryForm).toEqual({
      amount: '1000',
      category: 'Net Income',
      interval: 'Bi-Weekly',
    });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('updates a matching source instead of creating a duplicate', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useIncomeSummaryDraft(onChange, 0));
    loadDraft(result, [
      item(),
      item({ amount: 100, category: 'Side Income', id: 2, interval: 'Month' }),
    ]);

    act(() => result.current.updateIncomeSummaryForm('category', ' side income '));
    act(() => result.current.updateIncomeSummaryForm('interval', ' month '));
    act(() => result.current.updateIncomeSummaryForm('amount', '200'));
    act(() => result.current.submitIncomeSummaryItem(submitEvent));

    expect(result.current.sourceIncomeSummaryItems).toHaveLength(2);
    expect(result.current.sourceIncomeSummaryItems).toContainEqual({
      amount: 200,
      category: 'side income',
      id: 2,
      interval: 'month',
    });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('preserves the primary paycheck category and interval while editing', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useIncomeSummaryDraft(onChange, 0));
    const primaryPaycheck = item();
    loadDraft(result, [primaryPaycheck]);

    act(() => result.current.startIncomeSummaryItemEdit(primaryPaycheck));
    act(() => result.current.updateIncomeSummaryForm('category', 'Changed'));
    act(() => result.current.updateIncomeSummaryForm('interval', 'Annual'));
    act(() => result.current.updateIncomeSummaryForm('amount', '1200'));
    act(() => result.current.submitIncomeSummaryItem(submitEvent));

    expect(result.current.sourceIncomeSummaryItems).toEqual([
      { amount: 1200, category: 'Net Income', id: 1, interval: 'Bi-Weekly' },
    ]);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('protects the primary paycheck while removing an ordinary source', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useIncomeSummaryDraft(onChange, 0));
    const primaryPaycheck = item();
    const sideIncome = item({ amount: 100, category: 'Side Income', id: 2, interval: 'Month' });
    loadDraft(result, [primaryPaycheck, sideIncome]);

    act(() => result.current.startIncomeSummaryItemEdit(sideIncome));
    act(() => result.current.removeIncomeSummaryItem(primaryPaycheck.id));
    act(() => result.current.removeIncomeSummaryItem(sideIncome.id));

    expect(result.current.sourceIncomeSummaryItems).toEqual([primaryPaycheck]);
    expect(result.current.editingIncomeSummaryItemId).toBeNull();
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
