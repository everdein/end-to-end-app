import { type FormEvent, useCallback, useMemo, useState } from 'react';

import {
  emptyAssetForm,
  type FinancialsDraftState,
  formToDebtAccount,
  toDebtForm,
} from './financialsDraft';
import type { AssetFormState, DraftDebtAccount } from './financialsTypes';

type DebtAccountsDraftSource = Pick<FinancialsDraftState, 'draftDebtAccounts'>;

export function useDebtAccountsDraft(onChange: () => void) {
  const [debtForm, setDebtForm] = useState<AssetFormState>(emptyAssetForm);
  const [draftDebtAccounts, setDraftDebtAccounts] = useState<DraftDebtAccount[]>([]);
  const [editingDebtId, setEditingDebtId] = useState<number | null>(null);
  const [nextDraftDebtId, setNextDraftDebtId] = useState(-1);

  const loadDraft = useCallback((draft: DebtAccountsDraftSource) => {
    setDebtForm(emptyAssetForm);
    setDraftDebtAccounts(draft.draftDebtAccounts);
    setEditingDebtId(null);
  }, []);

  const debtAccounts = useMemo(
    () => [...draftDebtAccounts].sort((left, right) => left.account.localeCompare(right.account)),
    [draftDebtAccounts]
  );
  const totalDebt = useMemo(
    () => draftDebtAccounts.reduce((total, account) => total + account.amount, 0),
    [draftDebtAccounts]
  );

  function updateDebtForm<K extends keyof AssetFormState>(key: K, value: AssetFormState[K]) {
    setDebtForm((current) => ({ ...current, [key]: value }));
  }

  function submitDebt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingDebtId) {
      setDraftDebtAccounts((current) =>
        current.map((account) =>
          account.id === editingDebtId ? formToDebtAccount(editingDebtId, debtForm) : account
        )
      );
    } else {
      setDraftDebtAccounts((current) => [...current, formToDebtAccount(nextDraftDebtId, debtForm)]);
      setNextDraftDebtId((current) => current - 1);
    }

    cancelDebtEdit();
    onChange();
  }

  function startDebtEdit(account: DraftDebtAccount) {
    setEditingDebtId(account.id);
    setDebtForm(toDebtForm(account));
  }

  function cancelDebtEdit() {
    setEditingDebtId(null);
    setDebtForm(emptyAssetForm);
  }

  function removeDebt(id: number) {
    setDraftDebtAccounts((current) => current.filter((account) => account.id !== id));
    onChange();
  }

  return {
    cancelDebtEdit,
    debtAccounts,
    debtForm,
    editingDebtId,
    loadDraft,
    removeDebt,
    startDebtEdit,
    submitDebt,
    totalDebt,
    updateDebtForm,
  };
}
