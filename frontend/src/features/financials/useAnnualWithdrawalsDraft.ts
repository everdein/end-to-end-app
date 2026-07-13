import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import {
  emptyAnnualWithdrawalForm,
  type FinancialsDraftState,
  formToAnnualWithdrawal,
  toAnnualWithdrawalForm,
  toDraftAnnualWithdrawal,
} from './financialsDraft';
import type { AnnualWithdrawalFormState, DraftAnnualWithdrawal } from './financialsTypes';

type AnnualWithdrawalsDraftSource = Pick<
  FinancialsDraftState,
  'annualWithdrawalForm' | 'draftAnnualWithdrawals'
>;

type AnnualWithdrawalsDraftTotals = {
  annualPayPeriodTotal: number;
  totalAnnualWithdrawals: number;
};

export function useAnnualWithdrawalsDraft(
  onChange: () => void,
  payPeriodStart: string,
  payPeriodEnd: string
) {
  const [annualWithdrawalForm, setAnnualWithdrawalForm] =
    useState<AnnualWithdrawalFormState>(emptyAnnualWithdrawalForm);
  const [draftAnnualWithdrawals, setDraftAnnualWithdrawals] = useState<DraftAnnualWithdrawal[]>([]);
  const [editingAnnualWithdrawalId, setEditingAnnualWithdrawalId] = useState<number | null>(null);
  const [nextDraftAnnualWithdrawalId, setNextDraftAnnualWithdrawalId] = useState(-1);

  const loadDraft = useCallback((draft: AnnualWithdrawalsDraftSource) => {
    setAnnualWithdrawalForm(draft.annualWithdrawalForm);
    setDraftAnnualWithdrawals(draft.draftAnnualWithdrawals);
    setEditingAnnualWithdrawalId(null);
  }, []);

  useEffect(() => {
    if (payPeriodStart && payPeriodEnd) {
      setDraftAnnualWithdrawals((current) =>
        current.map((withdrawal) =>
          toDraftAnnualWithdrawal(withdrawal, payPeriodStart, payPeriodEnd)
        )
      );
    }
  }, [payPeriodEnd, payPeriodStart]);

  const annualWithdrawals = useMemo(
    () =>
      [...draftAnnualWithdrawals].sort(
        (left, right) => left.month - right.month || left.day - right.day
      ),
    [draftAnnualWithdrawals]
  );
  const annualWithdrawalsInPayPeriod = useMemo(
    () => annualWithdrawals.filter((withdrawal) => withdrawal.inPayPeriod),
    [annualWithdrawals]
  );
  const totals = useMemo<AnnualWithdrawalsDraftTotals>(() => {
    const totalAnnualWithdrawals = draftAnnualWithdrawals.reduce(
      (total, withdrawal) => total + withdrawal.amount,
      0
    );
    const annualPayPeriodTotal = annualWithdrawalsInPayPeriod.reduce(
      (total, withdrawal) => total + withdrawal.amount,
      0
    );

    return { annualPayPeriodTotal, totalAnnualWithdrawals };
  }, [annualWithdrawalsInPayPeriod, draftAnnualWithdrawals]);

  function updateAnnualWithdrawalForm<K extends keyof AnnualWithdrawalFormState>(
    key: K,
    value: AnnualWithdrawalFormState[K]
  ) {
    setAnnualWithdrawalForm((current) => ({ ...current, [key]: value }));
  }

  function submitAnnualWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingAnnualWithdrawalId) {
      setDraftAnnualWithdrawals((current) =>
        current.map((withdrawal) =>
          withdrawal.id === editingAnnualWithdrawalId
            ? formToAnnualWithdrawal(
                editingAnnualWithdrawalId,
                annualWithdrawalForm,
                payPeriodStart,
                payPeriodEnd
              )
            : withdrawal
        )
      );
    } else {
      setDraftAnnualWithdrawals((current) => [
        ...current,
        formToAnnualWithdrawal(
          nextDraftAnnualWithdrawalId,
          annualWithdrawalForm,
          payPeriodStart,
          payPeriodEnd
        ),
      ]);
      setNextDraftAnnualWithdrawalId((current) => current - 1);
    }

    cancelAnnualWithdrawalEdit();
    onChange();
  }

  function startAnnualWithdrawalEdit(withdrawal: DraftAnnualWithdrawal) {
    setEditingAnnualWithdrawalId(withdrawal.id);
    setAnnualWithdrawalForm(toAnnualWithdrawalForm(withdrawal));
  }

  function cancelAnnualWithdrawalEdit() {
    setEditingAnnualWithdrawalId(null);
    setAnnualWithdrawalForm(emptyAnnualWithdrawalForm);
  }

  function removeAnnualWithdrawal(id: number) {
    setDraftAnnualWithdrawals((current) => current.filter((withdrawal) => withdrawal.id !== id));
    onChange();
  }

  return {
    annualWithdrawalForm,
    annualWithdrawals,
    annualWithdrawalsInPayPeriod,
    cancelAnnualWithdrawalEdit,
    editingAnnualWithdrawalId,
    loadDraft,
    removeAnnualWithdrawal,
    startAnnualWithdrawalEdit,
    submitAnnualWithdrawal,
    totals,
    updateAnnualWithdrawalForm,
  };
}
