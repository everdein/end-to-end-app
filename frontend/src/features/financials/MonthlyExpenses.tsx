import './MonthlyExpenses.css';

import { type FormEvent, useEffect, useMemo, useState } from 'react';

import type {
  AssetAccount,
  AssetCategory,
  AssetCategorySnapshotRequest,
  ExpenseBill,
  ExpenseBillSnapshotRequest,
} from '../../api/endpoints/financials';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { fetchMonthlyExpenses, saveExpenseSnapshot } from './financialsSlice';

type BillFormState = {
  bill: string;
  dueDay: string;
  amount: string;
  account: string;
  paid: boolean;
};

type DraftBill = {
  id: number;
  bill: string;
  dueDay: number;
  dueLabel: string;
  dueDate: string;
  amount: number;
  account: string;
  paid: boolean;
  inPayPeriod: boolean;
};

type AssetFormState = {
  account: string;
  company: string;
  amount: string;
};

type DraftAssetAccount = AssetAccount;

type DraftAssetCategory = {
  key: string;
  label: string;
  total: number;
  accounts: DraftAssetAccount[];
};

type FinancialTab =
  | 'overview'
  | 'monthly-withdrawals'
  | 'retirement'
  | 'investments'
  | 'cash-savings'
  | 'insurance-benefits';

const emptyForm: BillFormState = {
  bill: '',
  dueDay: '1',
  amount: '',
  account: 'Check',
  paid: false,
};

const emptyAssetForm: AssetFormState = {
  account: '',
  company: '',
  amount: '',
};

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function toForm(bill: DraftBill): BillFormState {
  return {
    bill: bill.bill,
    dueDay: String(bill.dueDay),
    amount: String(bill.amount),
    account: bill.account,
    paid: bill.paid,
  };
}

function toDraftBill(
  bill: ExpenseBill | DraftBill,
  payPeriodStart: string,
  payPeriodEnd: string
): DraftBill {
  const dueDate = dueDateForPeriod(bill.dueDay, payPeriodStart, payPeriodEnd);

  return {
    id: bill.id,
    bill: bill.bill,
    dueDay: bill.dueDay,
    dueLabel: ordinal(bill.dueDay),
    dueDate,
    amount: bill.amount,
    account: bill.account,
    paid: bill.paid,
    inPayPeriod: dueDate >= payPeriodStart && dueDate <= payPeriodEnd,
  };
}

function formToDraftBill(
  id: number,
  form: BillFormState,
  payPeriodStart: string,
  payPeriodEnd: string
): DraftBill {
  return toDraftBill(
    {
      id,
      bill: form.bill.trim(),
      dueDay: Number(form.dueDay),
      dueLabel: '',
      dueDate: '',
      amount: Number(form.amount),
      account: form.account.trim(),
      paid: form.paid,
      inPayPeriod: false,
    },
    payPeriodStart,
    payPeriodEnd
  );
}

function toSnapshotBill(bill: DraftBill): ExpenseBillSnapshotRequest {
  return {
    id: bill.id > 0 ? bill.id : null,
    bill: bill.bill,
    dueDay: bill.dueDay,
    amount: bill.amount,
    account: bill.account,
    paid: bill.paid,
  };
}

function toDraftAssetCategory(category: AssetCategory): DraftAssetCategory {
  return {
    ...category,
    accounts: category.accounts.map((account) => ({ ...account })),
  };
}

function toAssetForm(account: DraftAssetAccount): AssetFormState {
  return {
    account: account.account,
    company: account.company,
    amount: String(account.amount),
  };
}

function formToAssetAccount(id: number, form: AssetFormState): DraftAssetAccount {
  return {
    id,
    account: form.account.trim(),
    company: form.company.trim(),
    amount: Number(form.amount),
  };
}

function recalculateAssetCategory(category: DraftAssetCategory): DraftAssetCategory {
  return {
    ...category,
    total: category.accounts.reduce((total, account) => total + account.amount, 0),
  };
}

function toSnapshotCategory(category: DraftAssetCategory): AssetCategorySnapshotRequest {
  return {
    key: category.key,
    label: category.label,
    accounts: category.accounts.map((account) => ({
      id: account.id > 0 ? account.id : null,
      account: account.account,
      company: account.company,
      amount: account.amount,
    })),
  };
}

function ordinal(day: number) {
  if (day >= 11 && day <= 13) {
    return `${day}th`;
  }

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function dueDateForPeriod(dueDay: number, payPeriodStart: string, payPeriodEnd: string) {
  const startDate = new Date(`${payPeriodStart}T00:00:00`);
  const endDate = new Date(`${payPeriodEnd}T00:00:00`);
  let dueDate = safeDate(startDate.getFullYear(), startDate.getMonth(), dueDay);

  if (dueDate < startDate && startDate.getMonth() !== endDate.getMonth()) {
    dueDate = safeDate(endDate.getFullYear(), endDate.getMonth(), dueDay);
  }

  return dueDate.toISOString().slice(0, 10);
}

function safeDate(year: number, monthIndex: number, day: number) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(day, daysInMonth));
}

export default function MonthlyExpenses() {
  const dispatch = useAppDispatch();
  const { snapshot, status, saving, error } = useAppSelector((state) => state.financials);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BillFormState>(emptyForm);
  const [draftBills, setDraftBills] = useState<DraftBill[]>([]);
  const [payPeriodStart, setPayPeriodStart] = useState('');
  const [payPeriodEnd, setPayPeriodEnd] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [nextDraftId, setNextDraftId] = useState(-1);
  const [activeTab, setActiveTab] = useState<FinancialTab>('overview');
  const [draftAssetCategories, setDraftAssetCategories] = useState<DraftAssetCategory[]>([]);
  const [editingAsset, setEditingAsset] = useState<{ categoryKey: string; id: number } | null>(
    null
  );
  const [assetForm, setAssetForm] = useState<AssetFormState>(emptyAssetForm);
  const [nextDraftAssetId, setNextDraftAssetId] = useState(-1);

  useEffect(() => {
    dispatch(fetchMonthlyExpenses());
  }, [dispatch]);

  useEffect(() => {
    if (snapshot) {
      setPayPeriodStart(snapshot.payPeriodStart);
      setPayPeriodEnd(snapshot.payPeriodEnd);
      setDraftBills(
        snapshot.bills.map((bill) =>
          toDraftBill(bill, snapshot.payPeriodStart, snapshot.payPeriodEnd)
        )
      );
      setIsDirty(false);
      setEditingId(null);
      setForm(emptyForm);
      setDraftAssetCategories(snapshot.assetCategories.map(toDraftAssetCategory));
      setEditingAsset(null);
      setAssetForm(emptyAssetForm);
    }
  }, [snapshot]);

  useEffect(() => {
    if (payPeriodStart && payPeriodEnd) {
      setDraftBills((current) =>
        current.map((bill) => toDraftBill(bill, payPeriodStart, payPeriodEnd))
      );
    }
  }, [payPeriodStart, payPeriodEnd]);

  const sortedBills = useMemo(
    () => [...draftBills].sort((left, right) => left.dueDay - right.dueDay),
    [draftBills]
  );

  const totals = useMemo(() => {
    const totalMonthlyExpenses = draftBills.reduce((total, bill) => total + bill.amount, 0);
    const paidTotal = draftBills
      .filter((bill) => bill.paid)
      .reduce((total, bill) => total + bill.amount, 0);
    const payPeriodTotal = draftBills
      .filter((bill) => bill.inPayPeriod)
      .reduce((total, bill) => total + bill.amount, 0);

    return {
      totalMonthlyExpenses,
      paidTotal,
      unpaidTotal: totalMonthlyExpenses - paidTotal,
      payPeriodTotal,
    };
  }, [draftBills]);

  const selectedBill = sortedBills.find((bill) => bill.id === editingId);
  const formTitle = selectedBill ? `Edit ${selectedBill.bill}` : 'Add Bill';
  const assetCategories = draftAssetCategories;
  const totalTrackedAssets = assetCategories.reduce((total, category) => total + category.total, 0);
  const retirement = assetCategories.find((category) => category.key === 'retirement');
  const investments = assetCategories.find((category) => category.key === 'investments');
  const cashSavings = assetCategories.find((category) => category.key === 'cash-savings');
  const insuranceBenefits = assetCategories.find(
    (category) => category.key === 'insurance-benefits'
  );

  function updateForm<K extends keyof BillFormState>(key: K, value: BillFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submitBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingId) {
      setDraftBills((current) =>
        current.map((bill) =>
          bill.id === editingId
            ? formToDraftBill(editingId, form, payPeriodStart, payPeriodEnd)
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
    setIsDirty(true);
  }

  async function saveDraft() {
    await dispatch(
      saveExpenseSnapshot({
        payPeriodStart,
        payPeriodEnd,
        bills: sortedBills.map(toSnapshotBill),
        assetCategories: assetCategories.map(toSnapshotCategory),
      })
    );
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
    setDraftBills((current) => current.filter((bill) => bill.id !== id));
    setIsDirty(true);
  }

  function resetDraft() {
    if (!snapshot) {
      return;
    }

    setPayPeriodStart(snapshot.payPeriodStart);
    setPayPeriodEnd(snapshot.payPeriodEnd);
    setDraftBills(
      snapshot.bills.map((bill) =>
        toDraftBill(bill, snapshot.payPeriodStart, snapshot.payPeriodEnd)
      )
    );
    setDraftAssetCategories(snapshot.assetCategories.map(toDraftAssetCategory));
    cancelEdit();
    cancelAssetEdit();
    setIsDirty(false);
  }

  function updatePayPeriodStart(value: string) {
    setPayPeriodStart(value);
    setIsDirty(true);
  }

  function updatePayPeriodEnd(value: string) {
    setPayPeriodEnd(value);
    setIsDirty(true);
  }

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
              account.id === editingAsset.id ? formToAssetAccount(account.id, assetForm) : account
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
    setIsDirty(true);
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
              accounts: category.accounts.filter((account) => account.id !== id),
            })
          : category
      )
    );
    setIsDirty(true);
  }

  return (
    <main className="expenses-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Personal finance</p>
          <h1>Financials</h1>
        </div>
      </header>

      <nav aria-label="Financial sections" className="tabs">
        {[
          ['overview', 'Overview'],
          ['monthly-withdrawals', 'Monthly Withdrawals'],
          ['retirement', 'Retirement'],
          ['investments', 'Investments'],
          ['cash-savings', 'Cash & Savings'],
          ['insurance-benefits', 'Insurance / Benefits'],
        ].map(([tab, label]) => (
          <button
            aria-current={activeTab === tab ? 'page' : undefined}
            className={activeTab === tab ? 'active' : undefined}
            key={tab}
            onClick={() => setActiveTab(tab as FinancialTab)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      {isDirty && <p className="status">You have unsaved changes.</p>}
      {status === 'loading' && <p className="status">Loading financials...</p>}
      {error && <p className="error">{error}</p>}

      {snapshot && (
        <>
          {activeTab === 'overview' && (
            <Overview
              assetCategories={assetCategories}
              totalTrackedAssets={totalTrackedAssets}
              withdrawalTotal={totals.totalMonthlyExpenses}
            />
          )}

          {activeTab === 'monthly-withdrawals' && (
            <MonthlyWithdrawalsTab
              cancelEdit={cancelEdit}
              editingId={editingId}
              form={form}
              formTitle={formTitle}
              isDirty={isDirty}
              payPeriodEnd={payPeriodEnd}
              payPeriodStart={payPeriodStart}
              removeBill={removeBill}
              resetDraft={resetDraft}
              saveDraft={saveDraft}
              saving={saving}
              sortedBills={sortedBills}
              startEdit={startEdit}
              submitBill={submitBill}
              totals={totals}
              updateForm={updateForm}
              updatePayPeriodEnd={updatePayPeriodEnd}
              updatePayPeriodStart={updatePayPeriodStart}
            />
          )}

          {activeTab === 'retirement' && retirement && (
            <AssetTable
              assetForm={assetForm}
              cancelAssetEdit={cancelAssetEdit}
              category={retirement}
              editingAsset={editingAsset}
              removeAsset={removeAsset}
              startAssetEdit={startAssetEdit}
              submitAsset={submitAsset}
              updateAssetForm={updateAssetForm}
            />
          )}
          {activeTab === 'investments' && investments && (
            <AssetTable
              assetForm={assetForm}
              cancelAssetEdit={cancelAssetEdit}
              category={investments}
              editingAsset={editingAsset}
              removeAsset={removeAsset}
              startAssetEdit={startAssetEdit}
              submitAsset={submitAsset}
              updateAssetForm={updateAssetForm}
            />
          )}
          {activeTab === 'cash-savings' && cashSavings && (
            <AssetTable
              assetForm={assetForm}
              cancelAssetEdit={cancelAssetEdit}
              category={cashSavings}
              editingAsset={editingAsset}
              removeAsset={removeAsset}
              startAssetEdit={startAssetEdit}
              submitAsset={submitAsset}
              updateAssetForm={updateAssetForm}
            />
          )}
          {activeTab === 'insurance-benefits' && insuranceBenefits && (
            <AssetTable
              assetForm={assetForm}
              cancelAssetEdit={cancelAssetEdit}
              category={insuranceBenefits}
              editingAsset={editingAsset}
              removeAsset={removeAsset}
              startAssetEdit={startAssetEdit}
              submitAsset={submitAsset}
              updateAssetForm={updateAssetForm}
            />
          )}
        </>
      )}
    </main>
  );
}

function Overview({
  assetCategories,
  totalTrackedAssets,
  withdrawalTotal,
}: {
  assetCategories: AssetCategory[];
  totalTrackedAssets: number;
  withdrawalTotal: number;
}) {
  return (
    <>
      <section aria-label="Financial overview" className="summary-grid">
        <div>
          <span>Tracked assets</span>
          <strong>{currency.format(totalTrackedAssets)}</strong>
        </div>
        <div>
          <span>Monthly withdrawals</span>
          <strong>{currency.format(withdrawalTotal)}</strong>
        </div>
        {assetCategories.slice(0, 2).map((category) => (
          <div key={category.key}>
            <span>{category.label}</span>
            <strong>{currency.format(category.total)}</strong>
          </div>
        ))}
      </section>
      <section className="table-wrap">
        <table>
          <caption>Asset category totals</caption>
          <thead>
            <tr>
              <th>Category</th>
              <th>Accounts</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {assetCategories.map((category) => (
              <tr key={category.key}>
                <td>{category.label}</td>
                <td>{category.accounts.length}</td>
                <td className="amount">{currency.format(category.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>Total tracked assets</td>
              <td className="amount">{currency.format(totalTrackedAssets)}</td>
            </tr>
          </tfoot>
        </table>
      </section>
    </>
  );
}

function MonthlyWithdrawalsTab({
  cancelEdit,
  editingId,
  form,
  formTitle,
  isDirty,
  payPeriodEnd,
  payPeriodStart,
  removeBill,
  resetDraft,
  saveDraft,
  saving,
  sortedBills,
  startEdit,
  submitBill,
  totals,
  updateForm,
  updatePayPeriodEnd,
  updatePayPeriodStart,
}: {
  cancelEdit: () => void;
  editingId: number | null;
  form: BillFormState;
  formTitle: string;
  isDirty: boolean;
  payPeriodEnd: string;
  payPeriodStart: string;
  removeBill: (id: number) => void;
  resetDraft: () => void;
  saveDraft: () => Promise<void>;
  saving: boolean;
  sortedBills: DraftBill[];
  startEdit: (bill: DraftBill) => void;
  submitBill: (event: FormEvent<HTMLFormElement>) => void;
  totals: {
    totalMonthlyExpenses: number;
    paidTotal: number;
    unpaidTotal: number;
    payPeriodTotal: number;
  };
  updateForm: <K extends keyof BillFormState>(key: K, value: BillFormState[K]) => void;
  updatePayPeriodEnd: (value: string) => void;
  updatePayPeriodStart: (value: string) => void;
}) {
  return (
    <>
      <section className="withdrawals-header">
        <div>
          <h2>Monthly Withdrawals</h2>
          <p>Cash outflows for bills, subscriptions, transfers, and savings contributions.</p>
        </div>
        <div className="pay-period">
          <label>
            Pay period start
            <input
              onChange={(event) => updatePayPeriodStart(event.target.value)}
              type="date"
              value={payPeriodStart}
            />
          </label>
          <label>
            Pay period end
            <input
              onChange={(event) => updatePayPeriodEnd(event.target.value)}
              type="date"
              value={payPeriodEnd}
            />
          </label>
          <div className="save-actions">
            <button disabled={saving || !isDirty} onClick={() => void saveDraft()} type="button">
              Save Changes
            </button>
            <button className="ghost" disabled={!isDirty} onClick={resetDraft} type="button">
              Reset
            </button>
          </div>
        </div>
      </section>

      <section aria-label="Withdrawal summary" className="summary-grid">
        <div>
          <span>Monthly total</span>
          <strong>{currency.format(totals.totalMonthlyExpenses)}</strong>
        </div>
        <div>
          <span>Paid</span>
          <strong>{currency.format(totals.paidTotal)}</strong>
        </div>
        <div>
          <span>Unpaid</span>
          <strong>{currency.format(totals.unpaidTotal)}</strong>
        </div>
        <div>
          <span>In pay period</span>
          <strong>{currency.format(totals.payPeriodTotal)}</strong>
        </div>
      </section>

      <section className="expenses-layout">
        <div className="table-wrap">
          <table>
            <caption>
              Withdrawals from {payPeriodStart} to {payPeriodEnd} are highlighted.
            </caption>
            <thead>
              <tr>
                <th>Withdrawal</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Account</th>
                <th>Paid</th>
                <th>Pay Period</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {sortedBills.map((bill) => (
                <tr className={bill.inPayPeriod ? 'in-period' : undefined} key={bill.id}>
                  <td>{bill.bill}</td>
                  <td>{bill.dueLabel}</td>
                  <td className="amount">{currency.format(bill.amount)}</td>
                  <td>{bill.account}</td>
                  <td>
                    <span className={bill.paid ? 'pill paid' : 'pill unpaid'}>
                      {bill.paid ? 'Paid' : 'Open'}
                    </span>
                  </td>
                  <td>{bill.inPayPeriod ? bill.dueDate : '-'}</td>
                  <td className="actions">
                    <button onClick={() => startEdit(bill)} type="button">
                      Edit
                    </button>
                    <button className="ghost" onClick={() => removeBill(bill.id)} type="button">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>Total</td>
                <td className="amount">{currency.format(totals.totalMonthlyExpenses)}</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          </table>
        </div>

        <form className="bill-form" onSubmit={submitBill}>
          <h2>{formTitle}</h2>
          <label>
            Withdrawal
            <input
              onChange={(event) => updateForm('bill', event.target.value)}
              required
              value={form.bill}
            />
          </label>
          <label>
            Due day
            <input
              max={31}
              min={1}
              onChange={(event) => updateForm('dueDay', event.target.value)}
              required
              type="number"
              value={form.dueDay}
            />
          </label>
          <label>
            Amount
            <input
              min={0}
              onChange={(event) => updateForm('amount', event.target.value)}
              required
              step="0.01"
              type="number"
              value={form.amount}
            />
          </label>
          <label>
            Account
            <input
              onChange={(event) => updateForm('account', event.target.value)}
              required
              value={form.account}
            />
          </label>
          <label className="checkbox-row">
            <input
              checked={form.paid}
              onChange={(event) => updateForm('paid', event.target.checked)}
              type="checkbox"
            />
            Paid
          </label>
          <div className="form-actions">
            <button type="submit">{editingId ? 'Update Draft' : 'Add to Draft'}</button>
            {editingId && (
              <button className="ghost" onClick={cancelEdit} type="button">
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
    </>
  );
}

function AssetTable({
  assetForm,
  cancelAssetEdit,
  category,
  editingAsset,
  removeAsset,
  startAssetEdit,
  submitAsset,
  updateAssetForm,
}: {
  assetForm: AssetFormState;
  cancelAssetEdit: () => void;
  category: DraftAssetCategory;
  editingAsset: { categoryKey: string; id: number } | null;
  removeAsset: (categoryKey: string, id: number) => void;
  startAssetEdit: (categoryKey: string, account: DraftAssetAccount) => void;
  submitAsset: (categoryKey: string, event: FormEvent<HTMLFormElement>) => void;
  updateAssetForm: <K extends keyof AssetFormState>(key: K, value: AssetFormState[K]) => void;
}) {
  const isEditingThisCategory = editingAsset?.categoryKey === category.key;

  return (
    <section className="expenses-layout">
      <div className="table-wrap">
        <table>
          <caption>{category.label}</caption>
          <thead>
            <tr>
              <th>Account</th>
              <th>Company</th>
              <th>Amount</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {category.accounts.map((account) => (
              <tr key={account.id}>
                <td>{account.account}</td>
                <td>{account.company}</td>
                <td className="amount">{currency.format(account.amount)}</td>
                <td className="actions">
                  <button onClick={() => startAssetEdit(category.key, account)} type="button">
                    Edit
                  </button>
                  <button
                    className="ghost"
                    onClick={() => removeAsset(category.key, account.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>Total</td>
              <td className="amount">{currency.format(category.total)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <form className="bill-form" onSubmit={(event) => submitAsset(category.key, event)}>
        <h2>{isEditingThisCategory ? 'Edit Account' : 'Add Account'}</h2>
        <label>
          Account
          <input
            onChange={(event) => updateAssetForm('account', event.target.value)}
            required
            value={assetForm.account}
          />
        </label>
        <label>
          Company
          <input
            onChange={(event) => updateAssetForm('company', event.target.value)}
            required
            value={assetForm.company}
          />
        </label>
        <label>
          Amount
          <input
            min={0}
            onChange={(event) => updateAssetForm('amount', event.target.value)}
            required
            step="0.01"
            type="number"
            value={assetForm.amount}
          />
        </label>
        <div className="form-actions">
          <button type="submit">{isEditingThisCategory ? 'Update Draft' : 'Add to Draft'}</button>
          {isEditingThisCategory && (
            <button className="ghost" onClick={cancelAssetEdit} type="button">
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
