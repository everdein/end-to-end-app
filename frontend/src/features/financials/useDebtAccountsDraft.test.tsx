import { act, renderHook } from '@testing-library/react';
import { type FormEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DraftDebtAccount } from './financialsTypes';
import { useDebtAccountsDraft } from './useDebtAccountsDraft';

const preventDefault = vi.fn();
const submitEvent = { preventDefault } as unknown as FormEvent<HTMLFormElement>;

type DebtAccountsDraftHook = ReturnType<typeof useDebtAccountsDraft>;

function account(overrides: Partial<DraftDebtAccount> = {}): DraftDebtAccount {
  return {
    account: 'Credit line',
    amount: 200,
    company: 'Example lender',
    id: 2,
    ...overrides,
  };
}

function loadDraft(
  result: { readonly current: DebtAccountsDraftHook },
  draftDebtAccounts: DraftDebtAccount[]
) {
  act(() => result.current.loadDraft({ draftDebtAccounts }));
}

describe('useDebtAccountsDraft', () => {
  beforeEach(() => {
    preventDefault.mockClear();
  });

  it('loads, sorts, and totals debt accounts without marking the draft dirty', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useDebtAccountsDraft(onChange));

    loadDraft(result, [account({ account: 'Loan', amount: 100, id: 1 }), account()]);

    expect(result.current.debtAccounts.map(({ account: name }) => name)).toEqual([
      'Credit line',
      'Loan',
    ]);
    expect(result.current.totalDebt).toBe(300);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('adds a temporary debt account and marks the aggregate draft dirty', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useDebtAccountsDraft(onChange));
    loadDraft(result, []);

    act(() => result.current.updateDebtForm('account', ' Personal loan '));
    act(() => result.current.updateDebtForm('company', ' Example lender '));
    act(() => result.current.updateDebtForm('amount', '75.50'));
    act(() => result.current.submitDebt(submitEvent));

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(result.current.debtAccounts).toEqual([
      {
        account: 'Personal loan',
        amount: 75.5,
        company: 'Example lender',
        id: -1,
      },
    ]);
    expect(result.current.editingDebtId).toBeNull();
    expect(result.current.totalDebt).toBe(75.5);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('edits a debt account and recalculates the total', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useDebtAccountsDraft(onChange));
    const debtAccount = account();
    loadDraft(result, [debtAccount]);

    act(() => result.current.startDebtEdit(debtAccount));
    act(() => result.current.updateDebtForm('amount', '125'));
    act(() => result.current.submitDebt(submitEvent));

    expect(result.current.debtAccounts).toEqual([
      expect.objectContaining({ amount: 125, id: debtAccount.id }),
    ]);
    expect(result.current.totalDebt).toBe(125);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('removes a debt account and clears an active editor when reloading', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useDebtAccountsDraft(onChange));
    const debtAccount = account();
    loadDraft(result, [debtAccount]);

    act(() => result.current.startDebtEdit(debtAccount));
    loadDraft(result, [debtAccount]);

    expect(result.current.editingDebtId).toBeNull();
    expect(onChange).not.toHaveBeenCalled();

    act(() => result.current.removeDebt(debtAccount.id));

    expect(result.current.debtAccounts).toEqual([]);
    expect(result.current.totalDebt).toBe(0);
    expect(onChange).toHaveBeenCalledOnce();
  });
});
