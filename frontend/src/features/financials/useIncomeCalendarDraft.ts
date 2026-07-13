import { type FormEvent, useCallback, useMemo, useState } from 'react';

import {
  defaultRecurringPaydayForm,
  emptyIncomeEventForm,
  type FinancialsDraftState,
  formToIncomeEvent,
  generateRecurringPaydays,
  getCurrentPaycheck,
  isNumberedIncomeEventInYear,
  toIncomeEventForm,
  withIncomeEventStatuses,
} from './financialsDraft';
import type {
  DraftIncomeEvent,
  IncomeEventFormState,
  RecurringPaydayFormState,
} from './financialsTypes';

type IncomeCalendarDraftSource = Pick<FinancialsDraftState, 'draftIncomeEvents'>;

export function useIncomeCalendarDraft(onChange: () => void, todayIso: string) {
  const [draftIncomeEvents, setDraftIncomeEvents] = useState<DraftIncomeEvent[]>([]);
  const [editingIncomeEventId, setEditingIncomeEventId] = useState<number | null>(null);
  const [incomeEventForm, setIncomeEventForm] =
    useState<IncomeEventFormState>(emptyIncomeEventForm);
  const [recurringPaydayForm, setRecurringPaydayForm] = useState<RecurringPaydayFormState>(() =>
    defaultRecurringPaydayForm(todayIso)
  );
  const [nextDraftIncomeEventId, setNextDraftIncomeEventId] = useState(-1);

  const loadDraft = useCallback(
    (draft: IncomeCalendarDraftSource) => {
      setDraftIncomeEvents(draft.draftIncomeEvents);
      setEditingIncomeEventId(null);
      setIncomeEventForm(emptyIncomeEventForm);
      setRecurringPaydayForm(defaultRecurringPaydayForm(todayIso));
    },
    [todayIso]
  );

  const incomeEvents = useMemo(
    () => withIncomeEventStatuses(draftIncomeEvents, todayIso),
    [draftIncomeEvents, todayIso]
  );
  const currentPaycheck = useMemo(
    () => getCurrentPaycheck(incomeEvents, todayIso),
    [incomeEvents, todayIso]
  );

  function updateIncomeEventForm<K extends keyof IncomeEventFormState>(
    key: K,
    value: IncomeEventFormState[K]
  ) {
    setIncomeEventForm((current) => ({ ...current, [key]: value }));
  }

  function updateRecurringPaydayForm<K extends keyof RecurringPaydayFormState>(
    key: K,
    value: RecurringPaydayFormState[K]
  ) {
    setRecurringPaydayForm((current) => {
      const next = { ...current, [key]: value };
      return key === 'year' ? { ...next, firstPayDate: '' } : next;
    });
  }

  function submitIncomeEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingIncomeEventId) {
      setDraftIncomeEvents((current) =>
        current.map((incomeEvent) =>
          incomeEvent.id === editingIncomeEventId
            ? formToIncomeEvent(editingIncomeEventId, incomeEventForm)
            : incomeEvent
        )
      );
    } else {
      setDraftIncomeEvents((current) => [
        ...current,
        formToIncomeEvent(nextDraftIncomeEventId, incomeEventForm),
      ]);
      setNextDraftIncomeEventId((current) => current - 1);
    }

    cancelIncomeEventEdit();
    onChange();
  }

  function submitRecurringPaydays(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const generatedPaydays = generateRecurringPaydays(recurringPaydayForm, nextDraftIncomeEventId);
    if (generatedPaydays.length === 0) {
      return;
    }

    setDraftIncomeEvents((current) => {
      const retainedEvents = recurringPaydayForm.replaceExistingYear
        ? current.filter(
            (incomeEvent) => !isNumberedIncomeEventInYear(incomeEvent, recurringPaydayForm.year)
          )
        : current;
      return [...retainedEvents, ...generatedPaydays];
    });
    setNextDraftIncomeEventId((current) => current - generatedPaydays.length);
    onChange();
  }

  function startIncomeEventEdit(event: DraftIncomeEvent) {
    setEditingIncomeEventId(event.id);
    setIncomeEventForm(toIncomeEventForm(event));
  }

  function cancelIncomeEventEdit() {
    setEditingIncomeEventId(null);
    setIncomeEventForm(emptyIncomeEventForm);
  }

  function removeIncomeEvent(id: number) {
    setDraftIncomeEvents((current) => current.filter((event) => event.id !== id));
    onChange();
  }

  return {
    cancelIncomeEventEdit,
    currentPaycheck,
    draftIncomeEvents,
    editingIncomeEventId,
    incomeEventForm,
    incomeEvents,
    loadDraft,
    recurringPaydayForm,
    removeIncomeEvent,
    startIncomeEventEdit,
    submitIncomeEvent,
    submitRecurringPaydays,
    updateIncomeEventForm,
    updateRecurringPaydayForm,
  };
}
