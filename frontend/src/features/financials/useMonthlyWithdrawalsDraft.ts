import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { isRentWithdrawal } from './financialsAnchors';
import {
  emptyForm,
  type FinancialsDraftState,
  formToDraftBill,
  toDraftBill,
  toForm,
} from './financialsDraft';
import type { BillFormState, DraftBill } from './financialsTypes';

type MonthlyWithdrawalsDraftSource = Pick<
  FinancialsDraftState,
  'draftBills' | 'payPeriodEnd' | 'payPeriodStart'
>;

type MonthlyWithdrawalsDraftTotals = {
  paidTotal: number;
  payPeriodTotal: number;
  totalMonthlyExpenses: number;
  unpaidTotal: number;
};

export function useMonthlyWithdrawalsDraft(onChange: () => void) {
  const [draftBills, setDraftBills] = useState<DraftBill[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BillFormState>(emptyForm);
  const [nextDraftId, setNextDraftId] = useState(-1);
  const [payPeriodEnd, setPayPeriodEnd] = useState('');
  const [payPeriodStart, setPayPeriodStart] = useState('');

  const loadDraft = useCallback((draft: MonthlyWithdrawalsDraftSource) => {
    setDraftBills(draft.draftBills);
    setPayPeriodEnd(draft.payPeriodEnd);
    setPayPeriodStart(draft.payPeriodStart);
    setEditingId(null);
    setForm(emptyForm);
  }, []);

  useEffect(() => {
    if (payPeriodStart && payPeriodEnd) {
      setDraftBills((current) =>
        current.map((bill) => toDraftBill(bill, payPeriodStart, payPeriodEnd))
      );
    }
  }, [payPeriodEnd, payPeriodStart]);

  const sortedBills = useMemo(
    () => [...draftBills].sort((left, right) => left.dueDay - right.dueDay),
    [draftBills]
  );
  const totals = useMemo<MonthlyWithdrawalsDraftTotals>(() => {
    const totalMonthlyExpenses = draftBills.reduce((total, bill) => total + bill.amount, 0);
    const paidTotal = draftBills
      .filter((bill) => bill.paid)
      .reduce((total, bill) => total + bill.amount, 0);
    const payPeriodTotal = draftBills
      .filter((bill) => bill.inPayPeriod)
      .reduce((total, bill) => total + bill.amount, 0);

    return {
      paidTotal,
      payPeriodTotal,
      totalMonthlyExpenses,
      unpaidTotal: totalMonthlyExpenses - paidTotal,
    };
  }, [draftBills]);
  const selectedBill = sortedBills.find((bill) => bill.id === editingId);
  const formTitle = selectedBill ? `Edit ${selectedBill.bill}` : 'Add Bill';

  function updateForm<K extends keyof BillFormState>(key: K, value: BillFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submitBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingId) {
      setDraftBills((current) =>
        current.map((bill) =>
          bill.id === editingId
            ? formToDraftBill(
                editingId,
                isRentWithdrawal(bill) ? { ...form, bill: bill.bill } : form,
                payPeriodStart,
                payPeriodEnd
              )
            : bill
        )
      );
    } else {
      setDraftBills((current) => [
        ...current,
        formToDraftBill(nextDraftId, form, payPeriodStart, payPeriodEnd),
      ]);
      setNextDraftId((current) => current - 1);
    }

    setEditingId(null);
    setForm(emptyForm);
    onChange();
  }

  function startEdit(bill: DraftBill) {
    setEditingId(bill.id);
    setForm(toForm(bill));
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function removeBill(id: number) {
    setDraftBills((current) => current.filter((bill) => bill.id !== id || isRentWithdrawal(bill)));
    onChange();
  }

  function updatePayPeriodStart(value: string) {
    setPayPeriodStart(value);
    onChange();
  }

  function updatePayPeriodEnd(value: string) {
    setPayPeriodEnd(value);
    onChange();
  }

  return {
    cancelEdit,
    draftBills,
    editingId,
    form,
    formTitle,
    loadDraft,
    payPeriodEnd,
    payPeriodStart,
    removeBill,
    sortedBills,
    startEdit,
    submitBill,
    totals,
    updateForm,
    updatePayPeriodEnd,
    updatePayPeriodStart,
  };
}
