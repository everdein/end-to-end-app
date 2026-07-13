import { type FormEvent, useCallback, useMemo, useState } from 'react';

import { isRentReserveAccount } from './financialsAnchors';
import {
  emptyAssetForm,
  type FinancialsDraftState,
  formToAssetAccount,
  recalculateAssetCategory,
  toAssetForm,
} from './financialsDraft';
import type { AssetFormState, DraftAssetAccount, DraftAssetCategory } from './financialsTypes';

type AssetAccountsDraftSource = Pick<FinancialsDraftState, 'draftAssetCategories'>;

export function useAssetAccountsDraft(onChange: () => void) {
  const [assetForm, setAssetForm] = useState<AssetFormState>(emptyAssetForm);
  const [draftAssetCategories, setDraftAssetCategories] = useState<DraftAssetCategory[]>([]);
  const [editingAsset, setEditingAsset] = useState<{ categoryKey: string; id: number } | null>(
    null
  );
  const [nextDraftAssetId, setNextDraftAssetId] = useState(-1);

  const loadDraft = useCallback((draft: AssetAccountsDraftSource) => {
    setAssetForm(emptyAssetForm);
    setDraftAssetCategories(draft.draftAssetCategories);
    setEditingAsset(null);
  }, []);

  const totalTrackedAssets = useMemo(
    () => draftAssetCategories.reduce((total, category) => total + category.total, 0),
    [draftAssetCategories]
  );

  function updateAssetForm<K extends keyof AssetFormState>(key: K, value: AssetFormState[K]) {
    setAssetForm((current) => ({ ...current, [key]: value }));
  }

  function submitAsset(categoryKey: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setDraftAssetCategories((current) =>
      current.map((category) => {
        if (category.key !== categoryKey) {
          return category;
        }

        if (editingAsset?.categoryKey === categoryKey) {
          return recalculateAssetCategory({
            ...category,
            accounts: category.accounts.map((account) =>
              account.id === editingAsset.id
                ? formToAssetAccount(
                    account.id,
                    isRentReserveAccount(account)
                      ? { ...assetForm, account: account.account }
                      : assetForm
                  )
                : account
            ),
          });
        }

        return recalculateAssetCategory({
          ...category,
          accounts: [...category.accounts, formToAssetAccount(nextDraftAssetId, assetForm)],
        });
      })
    );

    if (!editingAsset) {
      setNextDraftAssetId((current) => current - 1);
    }
    cancelAssetEdit();
    onChange();
  }

  function startAssetEdit(categoryKey: string, account: DraftAssetAccount) {
    setEditingAsset({ categoryKey, id: account.id });
    setAssetForm(toAssetForm(account));
  }

  function cancelAssetEdit() {
    setEditingAsset(null);
    setAssetForm(emptyAssetForm);
  }

  function removeAsset(categoryKey: string, id: number) {
    setDraftAssetCategories((current) =>
      current.map((category) =>
        category.key === categoryKey
          ? recalculateAssetCategory({
              ...category,
              accounts: category.accounts.filter(
                (account) => account.id !== id || isRentReserveAccount(account)
              ),
            })
          : category
      )
    );
    onChange();
  }

  return {
    assetCategories: draftAssetCategories,
    assetForm,
    cancelAssetEdit,
    editingAsset,
    loadDraft,
    removeAsset,
    startAssetEdit,
    submitAsset,
    totalTrackedAssets,
    updateAssetForm,
  };
}
