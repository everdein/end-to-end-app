import { act, renderHook } from '@testing-library/react';
import { type FormEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DraftAssetAccount, DraftAssetCategory } from './financialsTypes';
import { useAssetAccountsDraft } from './useAssetAccountsDraft';

const preventDefault = vi.fn();
const submitEvent = { preventDefault } as unknown as FormEvent<HTMLFormElement>;

type AssetAccountsDraftHook = ReturnType<typeof useAssetAccountsDraft>;

function account(overrides: Partial<DraftAssetAccount> = {}): DraftAssetAccount {
  return {
    account: 'Retirement account',
    amount: 100,
    company: 'Example provider',
    id: 1,
    ...overrides,
  };
}

function category(overrides: Partial<DraftAssetCategory> = {}): DraftAssetCategory {
  return {
    accounts: [account()],
    key: 'retirement',
    label: 'Retirement',
    total: 100,
    ...overrides,
  };
}

function loadDraft(
  result: { readonly current: AssetAccountsDraftHook },
  draftAssetCategories: DraftAssetCategory[]
) {
  act(() => result.current.loadDraft({ draftAssetCategories }));
}

describe('useAssetAccountsDraft', () => {
  beforeEach(() => {
    preventDefault.mockClear();
  });

  it('loads asset categories and totals without marking the draft dirty', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useAssetAccountsDraft(onChange));

    loadDraft(result, [
      category(),
      category({ accounts: [], key: 'investments', label: 'Investments', total: 50 }),
    ]);

    expect(result.current.assetCategories.map(({ key }) => key)).toEqual([
      'retirement',
      'investments',
    ]);
    expect(result.current.totalTrackedAssets).toBe(150);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('adds a temporary asset account and recalculates its category total', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useAssetAccountsDraft(onChange));
    loadDraft(result, [category()]);

    act(() => result.current.updateAssetForm('account', ' Brokerage '));
    act(() => result.current.updateAssetForm('company', ' Example investments '));
    act(() => result.current.updateAssetForm('amount', '50.25'));
    act(() => result.current.submitAsset('retirement', submitEvent));

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(result.current.assetCategories[0]).toEqual(
      expect.objectContaining({
        accounts: [
          expect.objectContaining({ id: 1 }),
          {
            account: 'Brokerage',
            amount: 50.25,
            company: 'Example investments',
            id: -1,
          },
        ],
        total: 150.25,
      })
    );
    expect(result.current.editingAsset).toBeNull();
    expect(result.current.totalTrackedAssets).toBe(150.25);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('preserves the Rent Reserve anchor while editing it', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useAssetAccountsDraft(onChange));
    const rentReserve = account({ account: 'Rent Reserve' });
    loadDraft(result, [
      category({ accounts: [rentReserve], key: 'cash-savings', label: 'Cash & Savings' }),
    ]);

    act(() => result.current.startAssetEdit('cash-savings', rentReserve));
    act(() => result.current.updateAssetForm('account', 'Renamed reserve'));
    act(() => result.current.updateAssetForm('company', 'Updated provider'));
    act(() => result.current.updateAssetForm('amount', '125'));
    act(() => result.current.submitAsset('cash-savings', submitEvent));

    expect(result.current.assetCategories[0]).toEqual(
      expect.objectContaining({
        accounts: [
          {
            account: 'Rent Reserve',
            amount: 125,
            company: 'Updated provider',
            id: rentReserve.id,
          },
        ],
        total: 125,
      })
    );
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('protects Rent Reserve while removing ordinary asset accounts', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useAssetAccountsDraft(onChange));
    const rentReserve = account({ account: 'Rent Reserve' });
    const savings = account({ account: 'Emergency savings', amount: 50, id: 2 });
    loadDraft(result, [
      category({
        accounts: [rentReserve, savings],
        key: 'cash-savings',
        label: 'Cash & Savings',
        total: 150,
      }),
    ]);

    act(() => result.current.removeAsset('cash-savings', rentReserve.id));
    act(() => result.current.removeAsset('cash-savings', savings.id));

    expect(result.current.assetCategories[0]).toEqual(
      expect.objectContaining({ accounts: [rentReserve], total: 100 })
    );
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
