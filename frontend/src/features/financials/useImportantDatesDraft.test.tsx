import { act, renderHook } from '@testing-library/react';
import { type FormEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DraftImportantDate } from './financialsTypes';
import { useImportantDatesDraft } from './useImportantDatesDraft';

const preventDefault = vi.fn();
const submitEvent = { preventDefault } as unknown as FormEvent<HTMLFormElement>;

type ImportantDatesDraftHook = ReturnType<typeof useImportantDatesDraft>;

function importantDate(overrides: Partial<DraftImportantDate> = {}): DraftImportantDate {
  return {
    date: '2026-12-25',
    event: 'Christmas',
    id: 1,
    type: 'Holiday',
    ...overrides,
  };
}

function loadDraft(
  result: { readonly current: ImportantDatesDraftHook },
  draftImportantDates: DraftImportantDate[]
) {
  act(() => result.current.loadDraft({ draftImportantDates }));
}

describe('useImportantDatesDraft', () => {
  beforeEach(() => {
    preventDefault.mockClear();
  });

  it('sorts dates, assigns statuses, and identifies the next date', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useImportantDatesDraft(onChange, '2026-06-22'));
    loadDraft(result, [
      importantDate({ date: '2026-12-25', id: 3 }),
      importantDate({ date: '2026-01-01', event: 'New Year', id: 1 }),
      importantDate({ date: '2026-07-04', event: 'Independence Day', id: 2 }),
    ]);

    expect(result.current.importantDates.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: 1, status: 'passed' },
      { id: 2, status: 'next' },
      { id: 3, status: 'upcoming' },
    ]);
    expect(result.current.nextImportantDate?.id).toBe(2);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('adds a temporary date and resets the editor', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useImportantDatesDraft(onChange, '2026-06-22'));
    loadDraft(result, []);

    act(() => result.current.updateImportantDateForm('event', ' Birthday '));
    act(() => result.current.updateImportantDateForm('date', '2026-08-10'));
    act(() => result.current.updateImportantDateForm('type', ' Personal '));
    act(() => result.current.submitImportantDate(submitEvent));

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(result.current.draftImportantDates).toEqual([
      { date: '2026-08-10', event: 'Birthday', id: -1, type: 'Personal' },
    ]);
    expect(result.current.importantDateForm).toEqual({ date: '', event: '', type: 'Holiday' });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('updates an existing date without changing its identity', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useImportantDatesDraft(onChange, '2026-06-22'));
    const existingDate = importantDate();
    loadDraft(result, [existingDate]);

    act(() => result.current.startImportantDateEdit(existingDate));
    act(() => result.current.updateImportantDateForm('event', ' Winter Holiday '));
    act(() => result.current.updateImportantDateForm('type', ' Company Day Off '));
    act(() => result.current.submitImportantDate(submitEvent));

    expect(result.current.draftImportantDates).toEqual([
      {
        ...existingDate,
        event: 'Winter Holiday',
        type: 'Company Day Off',
      },
    ]);
    expect(result.current.editingImportantDateId).toBeNull();
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('cancels an edit without changing the draft', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useImportantDatesDraft(onChange, '2026-06-22'));
    const existingDate = importantDate();
    loadDraft(result, [existingDate]);

    act(() => result.current.startImportantDateEdit(existingDate));
    act(() => result.current.updateImportantDateForm('event', 'Changed'));
    act(() => result.current.cancelImportantDateEdit());

    expect(result.current.draftImportantDates).toEqual([existingDate]);
    expect(result.current.editingImportantDateId).toBeNull();
    expect(result.current.importantDateForm).toEqual({ date: '', event: '', type: 'Holiday' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a date from the draft', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useImportantDatesDraft(onChange, '2026-06-22'));
    loadDraft(result, [importantDate(), importantDate({ id: 2 })]);

    act(() => result.current.removeImportantDate(1));

    expect(result.current.draftImportantDates.map(({ id }) => id)).toEqual([2]);
    expect(onChange).toHaveBeenCalledOnce();
  });
});
