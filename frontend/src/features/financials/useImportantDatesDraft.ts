import { type FormEvent, useCallback, useMemo, useState } from 'react';

import {
  emptyImportantDateForm,
  type FinancialsDraftState,
  formToImportantDate,
  getNextImportantDate,
  toImportantDateForm,
  withImportantDateStatuses,
} from './financialsDraft';
import type { DraftImportantDate, ImportantDateFormState } from './financialsTypes';

type ImportantDatesDraftSource = Pick<FinancialsDraftState, 'draftImportantDates'>;

export function useImportantDatesDraft(onChange: () => void, todayIso: string) {
  const [draftImportantDates, setDraftImportantDates] = useState<DraftImportantDate[]>([]);
  const [editingImportantDateId, setEditingImportantDateId] = useState<number | null>(null);
  const [importantDateForm, setImportantDateForm] =
    useState<ImportantDateFormState>(emptyImportantDateForm);
  const [nextDraftImportantDateId, setNextDraftImportantDateId] = useState(-1);

  const loadDraft = useCallback((draft: ImportantDatesDraftSource) => {
    setDraftImportantDates(draft.draftImportantDates);
    setEditingImportantDateId(null);
    setImportantDateForm(emptyImportantDateForm);
  }, []);

  const importantDates = useMemo(
    () => withImportantDateStatuses(draftImportantDates, todayIso),
    [draftImportantDates, todayIso]
  );
  const nextImportantDate = useMemo(
    () => getNextImportantDate(importantDates, todayIso),
    [importantDates, todayIso]
  );

  function updateImportantDateForm<K extends keyof ImportantDateFormState>(
    key: K,
    value: ImportantDateFormState[K]
  ) {
    setImportantDateForm((current) => ({ ...current, [key]: value }));
  }

  function submitImportantDate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingImportantDateId) {
      setDraftImportantDates((current) =>
        current.map((importantDate) =>
          importantDate.id === editingImportantDateId
            ? formToImportantDate(editingImportantDateId, importantDateForm)
            : importantDate
        )
      );
    } else {
      setDraftImportantDates((current) => [
        ...current,
        formToImportantDate(nextDraftImportantDateId, importantDateForm),
      ]);
      setNextDraftImportantDateId((current) => current - 1);
    }

    cancelImportantDateEdit();
    onChange();
  }

  function startImportantDateEdit(importantDate: DraftImportantDate) {
    setEditingImportantDateId(importantDate.id);
    setImportantDateForm(toImportantDateForm(importantDate));
  }

  function cancelImportantDateEdit() {
    setEditingImportantDateId(null);
    setImportantDateForm(emptyImportantDateForm);
  }

  function removeImportantDate(id: number) {
    setDraftImportantDates((current) => current.filter((importantDate) => importantDate.id !== id));
    onChange();
  }

  return {
    cancelImportantDateEdit,
    draftImportantDates,
    editingImportantDateId,
    importantDateForm,
    importantDates,
    loadDraft,
    nextImportantDate,
    removeImportantDate,
    startImportantDateEdit,
    submitImportantDate,
    updateImportantDateForm,
  };
}
