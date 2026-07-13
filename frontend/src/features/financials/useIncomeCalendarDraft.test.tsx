import { act, renderHook } from '@testing-library/react';
import { type FormEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DraftIncomeEvent } from './financialsTypes';
import { useIncomeCalendarDraft } from './useIncomeCalendarDraft';

const preventDefault = vi.fn();
const submitEvent = { preventDefault } as unknown as FormEvent<HTMLFormElement>;

type IncomeCalendarDraftHook = ReturnType<typeof useIncomeCalendarDraft>;

function incomeEvent(overrides: Partial<DraftIncomeEvent> = {}): DraftIncomeEvent {
  return {
    checkNumber: 1,
    checksInMonth: 0,
    date: '2026-01-09',
    id: 1,
    label: 'Paycheck',
    type: 'Paycheck',
    ...overrides,
  };
}

function loadDraft(
  result: { readonly current: IncomeCalendarDraftHook },
  draftIncomeEvents: DraftIncomeEvent[]
) {
  act(() => result.current.loadDraft({ draftIncomeEvents }));
}

describe('useIncomeCalendarDraft', () => {
  beforeEach(() => {
    preventDefault.mockClear();
  });

  it('sorts loaded events, counts monthly paychecks, and identifies the current paycheck', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useIncomeCalendarDraft(onChange, '2026-01-15'));
    loadDraft(result, [
      incomeEvent({ checkNumber: 2, date: '2026-01-23', id: 2 }),
      incomeEvent(),
      incomeEvent({ checkNumber: null, date: '2026-02-01', id: 3, label: 'Bonus' }),
    ]);

    expect(result.current.incomeEvents.map(({ id }) => id)).toEqual([1, 2, 3]);
    expect(result.current.incomeEvents[0]).toMatchObject({ checksInMonth: 2, status: 'current' });
    expect(result.current.incomeEvents[1]).toMatchObject({ checksInMonth: 2, status: 'upcoming' });
    expect(result.current.incomeEvents[2]).toMatchObject({ checksInMonth: 0, status: 'upcoming' });
    expect(result.current.currentPaycheck?.id).toBe(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('adds a temporary event and resets the single-event editor', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useIncomeCalendarDraft(onChange, '2026-06-22'));
    loadDraft(result, []);

    act(() => result.current.updateIncomeEventForm('date', '2026-07-01'));
    act(() => result.current.updateIncomeEventForm('label', ' Bonus '));
    act(() => result.current.updateIncomeEventForm('type', ' Other '));
    act(() => result.current.updateIncomeEventForm('checkNumber', ''));
    act(() => result.current.submitIncomeEvent(submitEvent));

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(result.current.draftIncomeEvents).toEqual([
      {
        checkNumber: null,
        checksInMonth: 0,
        date: '2026-07-01',
        id: -1,
        label: 'Bonus',
        type: 'Other',
      },
    ]);
    expect(result.current.incomeEventForm).toEqual({
      checkNumber: '',
      date: '',
      label: '',
      type: 'Paycheck',
    });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('updates an existing event without changing its identity', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useIncomeCalendarDraft(onChange, '2026-06-22'));
    const existingEvent = incomeEvent();
    loadDraft(result, [existingEvent]);

    act(() => result.current.startIncomeEventEdit(existingEvent));
    act(() => result.current.updateIncomeEventForm('label', ' Updated Paycheck '));
    act(() => result.current.updateIncomeEventForm('checkNumber', '12'));
    act(() => result.current.submitIncomeEvent(submitEvent));

    expect(result.current.draftIncomeEvents).toEqual([
      {
        ...existingEvent,
        checkNumber: 12,
        label: 'Updated Paycheck',
      },
    ]);
    expect(result.current.editingIncomeEventId).toBeNull();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('replaces only numbered events in the generated year', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useIncomeCalendarDraft(onChange, '2026-06-22'));
    const oneTimeEvent = incomeEvent({
      checkNumber: null,
      date: '2026-03-01',
      id: 2,
      label: 'Bonus',
    });
    const priorYearEvent = incomeEvent({ date: '2025-12-26', id: 3 });
    loadDraft(result, [incomeEvent(), oneTimeEvent, priorYearEvent]);

    act(() => result.current.updateRecurringPaydayForm('firstPayDate', '2026-12-04'));
    act(() => result.current.updateRecurringPaydayForm('startingCheckNumber', '20'));
    act(() => result.current.submitRecurringPaydays(submitEvent));

    expect(result.current.draftIncomeEvents).toEqual(
      expect.arrayContaining([
        oneTimeEvent,
        priorYearEvent,
        expect.objectContaining({ checkNumber: 20, date: '2026-12-04', id: -1 }),
        expect.objectContaining({ checkNumber: 21, date: '2026-12-18', id: -2 }),
      ])
    );
    expect(result.current.draftIncomeEvents).toHaveLength(4);
    expect(result.current.draftIncomeEvents).not.toContainEqual(incomeEvent());
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('clears an incompatible first payday when the year changes and ignores invalid generation', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useIncomeCalendarDraft(onChange, '2026-06-22'));
    loadDraft(result, [incomeEvent()]);

    act(() => result.current.updateRecurringPaydayForm('firstPayDate', '2026-01-09'));
    act(() => result.current.updateRecurringPaydayForm('year', '2027'));
    act(() => result.current.submitRecurringPaydays(submitEvent));

    expect(result.current.recurringPaydayForm).toMatchObject({ firstPayDate: '', year: '2027' });
    expect(result.current.draftIncomeEvents).toEqual([incomeEvent()]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes an event from the draft', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useIncomeCalendarDraft(onChange, '2026-06-22'));
    loadDraft(result, [incomeEvent(), incomeEvent({ id: 2 })]);

    act(() => result.current.removeIncomeEvent(1));

    expect(result.current.draftIncomeEvents.map(({ id }) => id)).toEqual([2]);
    expect(onChange).toHaveBeenCalledOnce();
  });
});
