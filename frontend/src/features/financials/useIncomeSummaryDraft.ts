import { type FormEvent, useCallback, useMemo, useState } from 'react';

import {
  isPrimaryPaycheck,
  PRIMARY_PAYCHECK_CATEGORY,
  PRIMARY_PAYCHECK_INTERVAL,
} from './financialsAnchors';
import {
  buildDerivedIncomeSummaryItems,
  emptyIncomeSummaryForm,
  type FinancialsDraftState,
  formToIncomeSummaryItem,
  toIncomeSummaryForm,
} from './financialsDraft';
import type { DraftIncomeSummaryItem, IncomeSummaryFormState } from './financialsTypes';

type IncomeSummaryDraftSource = Pick<
  FinancialsDraftState,
  'draftIncomeSummaryItems' | 'incomeSummaryForm'
>;

export function useIncomeSummaryDraft(onChange: () => void, totalMonthlyWithdrawals: number) {
  const [draftIncomeSummaryItems, setDraftIncomeSummaryItems] = useState<DraftIncomeSummaryItem[]>(
    []
  );
  const [editingIncomeSummaryItemId, setEditingIncomeSummaryItemId] = useState<number | null>(null);
  const [incomeSummaryForm, setIncomeSummaryForm] =
    useState<IncomeSummaryFormState>(emptyIncomeSummaryForm);
  const [nextDraftIncomeSummaryItemId, setNextDraftIncomeSummaryItemId] = useState(-1);

  const loadDraft = useCallback((draft: IncomeSummaryDraftSource) => {
    setDraftIncomeSummaryItems(draft.draftIncomeSummaryItems);
    setEditingIncomeSummaryItemId(null);
    setIncomeSummaryForm(draft.incomeSummaryForm);
  }, []);

  const sourceIncomeSummaryItems = useMemo(
    () =>
      [...draftIncomeSummaryItems].sort(
        (left, right) =>
          left.category.localeCompare(right.category) || left.interval.localeCompare(right.interval)
      ),
    [draftIncomeSummaryItems]
  );
  const derivedIncomeSummaryItems = useMemo(
    () => buildDerivedIncomeSummaryItems(draftIncomeSummaryItems, totalMonthlyWithdrawals),
    [draftIncomeSummaryItems, totalMonthlyWithdrawals]
  );
  const primaryPaycheckIncome = derivedIncomeSummaryItems.find(isPrimaryPaycheck);

  function updateIncomeSummaryForm<K extends keyof IncomeSummaryFormState>(
    key: K,
    value: IncomeSummaryFormState[K]
  ) {
    setIncomeSummaryForm((current) => ({ ...current, [key]: value }));
  }

  function submitIncomeSummaryItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const editingSource =
      editingIncomeSummaryItemId === null
        ? null
        : draftIncomeSummaryItems.find((item) => item.id === editingIncomeSummaryItemId);
    const sourceForm: IncomeSummaryFormState =
      editingSource && isPrimaryPaycheck(editingSource)
        ? {
            ...incomeSummaryForm,
            category: PRIMARY_PAYCHECK_CATEGORY,
            interval: PRIMARY_PAYCHECK_INTERVAL,
          }
        : {
            ...incomeSummaryForm,
            category: incomeSummaryForm.category.trim(),
            interval: incomeSummaryForm.interval.trim(),
          };
    const matchingSource =
      editingIncomeSummaryItemId === null
        ? draftIncomeSummaryItems.find((item) => incomeSummarySourceMatches(item, sourceForm))
        : null;
    const targetId =
      editingIncomeSummaryItemId ?? matchingSource?.id ?? nextDraftIncomeSummaryItemId;
    const updatedSource = formToIncomeSummaryItem(targetId, sourceForm);
    const hasExistingSource = draftIncomeSummaryItems.some((item) => item.id === targetId);
    const nextIncomeSummaryItems = hasExistingSource
      ? draftIncomeSummaryItems.map((item) => (item.id === targetId ? updatedSource : item))
      : [...draftIncomeSummaryItems, updatedSource];

    setDraftIncomeSummaryItems(nextIncomeSummaryItems);
    if (!hasExistingSource) {
      setNextDraftIncomeSummaryItemId((current) => current - 1);
    }
    setEditingIncomeSummaryItemId(null);
    setIncomeSummaryForm(defaultIncomeSummaryForm(nextIncomeSummaryItems));
    onChange();
  }

  function startIncomeSummaryItemEdit(item: DraftIncomeSummaryItem) {
    setEditingIncomeSummaryItemId(item.id);
    setIncomeSummaryForm(toIncomeSummaryForm(item));
  }

  function cancelIncomeSummaryItemEdit() {
    setEditingIncomeSummaryItemId(null);
    setIncomeSummaryForm(defaultIncomeSummaryForm(draftIncomeSummaryItems));
  }

  function removeIncomeSummaryItem(id: number) {
    setDraftIncomeSummaryItems((current) =>
      current.filter((item) => item.id !== id || isPrimaryPaycheck(item))
    );
    if (editingIncomeSummaryItemId === id) {
      cancelIncomeSummaryItemEdit();
    }
    onChange();
  }

  return {
    derivedIncomeSummaryItems,
    draftIncomeSummaryItems,
    editingIncomeSummaryItemId,
    incomeSummaryForm,
    loadDraft,
    primaryPaycheckIncome,
    removeIncomeSummaryItem,
    sourceIncomeSummaryItems,
    startIncomeSummaryItemEdit,
    submitIncomeSummaryItem,
    cancelIncomeSummaryItemEdit,
    updateIncomeSummaryForm,
  };
}

function defaultIncomeSummaryForm(items: DraftIncomeSummaryItem[]): IncomeSummaryFormState {
  const primaryPaycheck = items.find(isPrimaryPaycheck);
  return primaryPaycheck ? toIncomeSummaryForm(primaryPaycheck) : emptyIncomeSummaryForm;
}

function incomeSummarySourceMatches(
  item: Pick<DraftIncomeSummaryItem, 'category' | 'interval'>,
  form: Pick<IncomeSummaryFormState, 'category' | 'interval'>
) {
  return (
    item.category.trim().toLowerCase() === form.category.trim().toLowerCase() &&
    item.interval.trim().toLowerCase() === form.interval.trim().toLowerCase()
  );
}
