import type { FormEvent } from 'react';

import { currency } from './financialsFormatters';
import type { DraftIncomeSummaryItem, IncomeSummaryFormState } from './financialsTypes';

export function IncomeSummaryTab({
  incomeSummaryForm,
  incomeSummaryItems,
  submitIncomeSummaryItem,
  updateIncomeSummaryForm,
}: {
  incomeSummaryForm: IncomeSummaryFormState;
  incomeSummaryItems: DraftIncomeSummaryItem[];
  submitIncomeSummaryItem: (event: FormEvent<HTMLFormElement>) => void;
  updateIncomeSummaryForm: <K extends keyof IncomeSummaryFormState>(
    key: K,
    value: IncomeSummaryFormState[K]
  ) => void;
}) {
  const categories = Array.from(new Set(incomeSummaryItems.map((item) => item.category)));

  return (
    <>
      <section className="section-header">
        <div>
          <h2>Income Summary</h2>
          <p>
            Enter bi-weekly net income once. Annual, monthly, weekly, and disposable income values
            are calculated automatically.
          </p>
        </div>
      </section>

      <section className="expenses-layout">
        <div className="stacked-tables">
          {categories.map((category) => (
            <div className="table-wrap" key={category}>
              <table className="income-summary-table">
                <colgroup>
                  <col className="name-column" />
                  <col className="amount-column" />
                </colgroup>
                <caption>{category}</caption>
                <thead>
                  <tr>
                    <th>Interval</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {incomeSummaryItems
                    .filter((item) => item.category === category)
                    .map((item) => (
                      <tr key={item.id}>
                        <td>{item.interval}</td>
                        <td className="amount">{currency.format(item.amount)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <form className="bill-form" onSubmit={submitIncomeSummaryItem}>
          <h2>Income Source</h2>
          <p className="helper-text">Source field: Net Income / Bi-Weekly.</p>
          <label>
            Bi-weekly net income
            <input
              min={0}
              onChange={(event) => updateIncomeSummaryForm('amount', event.target.value)}
              required
              step="0.01"
              type="number"
              value={incomeSummaryForm.amount}
            />
          </label>
          <p className="helper-text">
            Disposable income is calculated from monthly net income minus monthly withdrawals.
          </p>
          <div className="form-actions">
            <button type="submit">Update Draft</button>
          </div>
        </form>
      </section>
    </>
  );
}
