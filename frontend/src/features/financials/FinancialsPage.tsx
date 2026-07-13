import './FinancialsPage.css';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { financialsService } from '../../api/endpoints/financials';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { AnnualWithdrawalsTab } from './AnnualWithdrawalsTab';
import { AssetTable } from './AssetTable';
import { ConfirmRemoveModal } from './ConfirmRemoveModal';
import { DebtTab } from './DebtTab';
import { isPrimaryPaycheck, isRentReserveAccount, isRentWithdrawal } from './financialsAnchors';
import {
  buildExpenseSnapshotRequest,
  createFinancialsDraft,
  getTodayIso,
  removalItemType,
} from './financialsDraft';
import { buildProjectionSummary } from './financialsProjection';
import { fetchMonthlyExpenses, saveExpenseSnapshot } from './financialsSlice';
import type {
  DraftAnnualWithdrawal,
  DraftAssetAccount,
  DraftBill,
  DraftDebtAccount,
  DraftImportantDate,
  DraftIncomeEvent,
  DraftIncomeSummaryItem,
  FinancialTab,
  PendingRemoval,
  ProjectionSummary,
} from './financialsTypes';
import { ImportantDatesTab } from './ImportantDatesTab';
import { IncomeCalendarTab } from './IncomeCalendarTab';
import { IncomeSummaryTab } from './IncomeSummaryTab';
import { MonthlyWithdrawalsTab } from './MonthlyWithdrawalsTab';
import { Overview } from './OverviewTab';
import { ProjectionTab } from './ProjectionTab';
import { SaveControls } from './SaveControls';
import { useAnnualWithdrawalsDraft } from './useAnnualWithdrawalsDraft';
import { useAssetAccountsDraft } from './useAssetAccountsDraft';
import { useDebtAccountsDraft } from './useDebtAccountsDraft';
import { useImportantDatesDraft } from './useImportantDatesDraft';
import { useIncomeCalendarDraft } from './useIncomeCalendarDraft';
import { useIncomeSummaryDraft } from './useIncomeSummaryDraft';
import { useMonthlyWithdrawalsDraft } from './useMonthlyWithdrawalsDraft';

type FinancialsPageProps = {
  onSignOut?: () => void;
};

export default function FinancialsPage({ onSignOut }: FinancialsPageProps) {
  const dispatch = useAppDispatch();
  const { snapshot, status, saving, error } = useAppSelector((state) => state.financials);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const markDirty = useCallback(() => setIsDirty(true), []);
  const todayIso = useMemo(getTodayIso, []);
  const {
    cancelEdit,
    editingId,
    form,
    formTitle,
    loadDraft: loadMonthlyWithdrawalsDraft,
    payPeriodEnd,
    payPeriodStart,
    removeBill,
    sortedBills,
    startEdit,
    submitBill,
    totals: monthlyWithdrawalTotals,
    updateForm,
    updatePayPeriodEnd,
    updatePayPeriodStart,
  } = useMonthlyWithdrawalsDraft(markDirty);
  const {
    annualWithdrawalForm,
    annualWithdrawals,
    annualWithdrawalsInPayPeriod,
    cancelAnnualWithdrawalEdit,
    editingAnnualWithdrawalId,
    loadDraft: loadAnnualWithdrawalsDraft,
    removeAnnualWithdrawal,
    startAnnualWithdrawalEdit,
    submitAnnualWithdrawal,
    totals: annualWithdrawalTotals,
    updateAnnualWithdrawalForm,
  } = useAnnualWithdrawalsDraft(markDirty, payPeriodStart, payPeriodEnd);
  const [activeTab, setActiveTab] = useState<FinancialTab>('overview');
  const {
    assetCategories,
    assetForm,
    cancelAssetEdit,
    editingAsset,
    loadDraft: loadAssetAccountsDraft,
    removeAsset,
    startAssetEdit,
    submitAsset,
    totalTrackedAssets,
    updateAssetForm,
  } = useAssetAccountsDraft(markDirty);
  const {
    cancelDebtEdit,
    debtAccounts,
    debtForm,
    editingDebtId,
    loadDraft: loadDebtAccountsDraft,
    removeDebt,
    startDebtEdit,
    submitDebt,
    totalDebt,
    updateDebtForm,
  } = useDebtAccountsDraft(markDirty);
  const {
    cancelIncomeSummaryItemEdit,
    derivedIncomeSummaryItems,
    draftIncomeSummaryItems,
    editingIncomeSummaryItemId,
    incomeSummaryForm,
    loadDraft: loadIncomeSummaryDraft,
    primaryPaycheckIncome,
    removeIncomeSummaryItem,
    sourceIncomeSummaryItems,
    startIncomeSummaryItemEdit,
    submitIncomeSummaryItem,
    updateIncomeSummaryForm,
  } = useIncomeSummaryDraft(markDirty, monthlyWithdrawalTotals.totalMonthlyExpenses);
  const {
    cancelIncomeEventEdit,
    currentPaycheck,
    editingIncomeEventId,
    incomeEventForm,
    incomeEvents,
    loadDraft: loadIncomeCalendarDraft,
    recurringPaydayForm,
    removeIncomeEvent,
    startIncomeEventEdit,
    submitIncomeEvent,
    submitRecurringPaydays,
    updateIncomeEventForm,
    updateRecurringPaydayForm,
  } = useIncomeCalendarDraft(markDirty, todayIso);
  const {
    cancelImportantDateEdit,
    editingImportantDateId,
    importantDateForm,
    importantDates,
    loadDraft: loadImportantDatesDraft,
    nextImportantDate,
    removeImportantDate,
    startImportantDateEdit,
    submitImportantDate,
    updateImportantDateForm,
  } = useImportantDatesDraft(markDirty, todayIso);
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const loadSnapshotDraft = useCallback(
    (currentSnapshot: NonNullable<typeof snapshot>) => {
      const draft = createFinancialsDraft(currentSnapshot);

      loadMonthlyWithdrawalsDraft(draft);
      loadAnnualWithdrawalsDraft(draft);
      loadAssetAccountsDraft(draft);
      loadDebtAccountsDraft(draft);
      loadIncomeSummaryDraft(draft);
      loadIncomeCalendarDraft(draft);
      loadImportantDatesDraft(draft);
    },
    [
      loadAnnualWithdrawalsDraft,
      loadAssetAccountsDraft,
      loadDebtAccountsDraft,
      loadIncomeCalendarDraft,
      loadIncomeSummaryDraft,
      loadImportantDatesDraft,
      loadMonthlyWithdrawalsDraft,
    ]
  );

  useEffect(() => {
    dispatch(fetchMonthlyExpenses());
  }, [dispatch]);

  useEffect(() => {
    if (snapshot) {
      loadSnapshotDraft(snapshot);
      setIsDirty(false);
      setPendingRemoval(null);
    }
  }, [loadSnapshotDraft, snapshot, todayIso]);

  const totals = useMemo(() => {
    return {
      ...annualWithdrawalTotals,
      ...monthlyWithdrawalTotals,
    };
  }, [annualWithdrawalTotals, monthlyWithdrawalTotals]);
  const netWorth = totalTrackedAssets - totalDebt;
  const retirement = assetCategories.find((category) => category.key === 'retirement');
  const investments = assetCategories.find((category) => category.key === 'investments');
  const cashSavings = assetCategories.find((category) => category.key === 'cash-savings');
  const insuranceBenefits = assetCategories.find(
    (category) => category.key === 'insurance-benefits'
  );
  const projection = useMemo<ProjectionSummary>(() => {
    const paycheckIncome = primaryPaycheckIncome?.amount ?? 0;
    return buildProjectionSummary({
      annualWithdrawals,
      annualWithdrawalsInPayPeriod,
      cashSavings,
      paycheckIncome,
      payPeriodEnd,
      payPeriodStart,
      sortedBills,
      totalDebt,
    });
  }, [
    annualWithdrawals,
    annualWithdrawalsInPayPeriod,
    cashSavings,
    payPeriodEnd,
    payPeriodStart,
    primaryPaycheckIncome,
    sortedBills,
    totalDebt,
  ]);
  const navigationSections: Array<{
    items: Array<[FinancialTab, string]>;
    label: string;
  }> = [
    {
      label: 'Snapshot',
      items: [
        ['overview', 'Overview'],
        ['projection', 'Projection'],
      ],
    },
    {
      label: 'Cash Flow',
      items: [
        ['monthly-withdrawals', 'Monthly Withdrawals'],
        ['annual-withdrawals', 'Annual Withdrawals'],
        ['income-summary', 'Income Summary'],
        ['income-calendar', 'Income Calendar'],
      ],
    },
    {
      label: 'Balance Sheet',
      items: [
        ['retirement', 'Retirement'],
        ['investments', 'Investments'],
        ['cash-savings', 'Cash & Savings'],
        ['insurance-benefits', 'Insurance / Benefits'],
        ['debt', 'Debt'],
      ],
    },
    {
      label: 'Calendar',
      items: [['important-dates', 'Important Dates']],
    },
  ];

  async function saveDraft() {
    if (!snapshot) {
      return;
    }

    await dispatch(
      saveExpenseSnapshot(
        buildExpenseSnapshotRequest({
          annualWithdrawals,
          assetCategories,
          bills: sortedBills,
          debtAccounts,
          incomeEvents,
          incomeSummaryItems: draftIncomeSummaryItems,
          importantDates,
          payPeriodEnd,
          payPeriodStart,
          version: snapshot.version,
        })
      )
    );
  }

  async function exportBackup() {
    if (!snapshot) {
      return;
    }

    setExporting(true);
    setExportError(null);

    try {
      const blob = await financialsService.downloadSnapshotJson();
      downloadBlob(blob, `financial-snapshot-v${snapshot.version}.json`);
    } catch (unknownError) {
      setExportError(
        unknownError instanceof Error ? unknownError.message : 'Unable to export financial backup'
      );
    } finally {
      setExporting(false);
    }
  }

  function requestRemoveBill(bill: DraftBill) {
    if (isRentWithdrawal(bill)) {
      return;
    }

    setPendingRemoval({ id: bill.id, name: bill.bill, type: 'bill' });
  }

  function requestRemoveAnnualWithdrawal(withdrawal: DraftAnnualWithdrawal) {
    setPendingRemoval({ id: withdrawal.id, name: withdrawal.bill, type: 'annual-withdrawal' });
  }

  function resetDraft() {
    if (!snapshot) {
      return;
    }

    loadSnapshotDraft(snapshot);
    cancelEdit();
    cancelAnnualWithdrawalEdit();
    cancelAssetEdit();
    cancelDebtEdit();
    cancelIncomeSummaryItemEdit();
    cancelIncomeEventEdit();
    cancelImportantDateEdit();
    setPendingRemoval(null);
    setIsDirty(false);
  }

  function requestRemoveAsset(categoryKey: string, account: DraftAssetAccount) {
    if (isRentReserveAccount(account)) {
      return;
    }

    setPendingRemoval({
      categoryKey,
      id: account.id,
      name: account.account,
      type: 'asset',
    });
  }

  function requestRemoveDebt(account: DraftDebtAccount) {
    setPendingRemoval({ id: account.id, name: account.account, type: 'debt' });
  }

  function requestRemoveIncomeSummaryItem(item: DraftIncomeSummaryItem) {
    if (isPrimaryPaycheck(item)) {
      return;
    }

    setPendingRemoval({
      id: item.id,
      name: `${item.category} / ${item.interval}`,
      type: 'income-summary',
    });
  }

  function requestRemoveIncomeEvent(event: DraftIncomeEvent) {
    setPendingRemoval({ id: event.id, name: event.label, type: 'income' });
  }

  function requestRemoveImportantDate(importantDate: DraftImportantDate) {
    setPendingRemoval({ id: importantDate.id, name: importantDate.event, type: 'important-date' });
  }

  function confirmRemoval() {
    if (!pendingRemoval) {
      return;
    }

    if (pendingRemoval.type === 'bill') {
      removeBill(pendingRemoval.id);
    } else if (pendingRemoval.type === 'annual-withdrawal') {
      removeAnnualWithdrawal(pendingRemoval.id);
    } else if (pendingRemoval.type === 'asset') {
      removeAsset(pendingRemoval.categoryKey, pendingRemoval.id);
    } else if (pendingRemoval.type === 'debt') {
      removeDebt(pendingRemoval.id);
    } else if (pendingRemoval.type === 'income-summary') {
      removeIncomeSummaryItem(pendingRemoval.id);
    } else if (pendingRemoval.type === 'income') {
      removeIncomeEvent(pendingRemoval.id);
    } else {
      removeImportantDate(pendingRemoval.id);
    }

    setPendingRemoval(null);
  }

  return (
    <main className="expenses-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Personal finance</p>
          <h1>Financials</h1>
        </div>
        <div className="header-actions">
          {snapshot && (
            <SaveControls
              exporting={exporting}
              isDirty={isDirty}
              onExport={() => void exportBackup()}
              onReset={resetDraft}
              onSave={() => void saveDraft()}
              saving={saving}
            />
          )}
          {onSignOut && (
            <button className="ghost" onClick={onSignOut} type="button">
              Sign Out
            </button>
          )}
        </div>
      </header>

      <div className="financials-layout">
        <aside className="sidebar" aria-label="Financial sections">
          {navigationSections.map((section) => (
            <div className="sidebar-section" key={section.label}>
              <p>{section.label}</p>
              <nav>
                {section.items.map(([tab, label]) => (
                  <button
                    aria-current={activeTab === tab ? 'page' : undefined}
                    className={activeTab === tab ? 'active' : undefined}
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>
          ))}
        </aside>

        <section className="financials-content">
          {isDirty && <p className="status">You have unsaved changes.</p>}
          {status === 'loading' && <p className="status">Loading financials...</p>}
          {error && <p className="error">{error}</p>}
          {exportError && <p className="error">{exportError}</p>}

          {snapshot && (
            <>
              {activeTab === 'overview' && (
                <Overview
                  annualTotal={totals.totalAnnualWithdrawals}
                  assetCategories={assetCategories}
                  currentPaycheck={currentPaycheck}
                  nextImportantDate={nextImportantDate}
                  netWorth={netWorth}
                  primaryPaycheckIncome={primaryPaycheckIncome?.amount}
                  projection={projection}
                  totalDebt={totalDebt}
                  totalTrackedAssets={totalTrackedAssets}
                  withdrawalTotal={totals.totalMonthlyExpenses}
                />
              )}

              {activeTab === 'projection' && <ProjectionTab projection={projection} />}

              {activeTab === 'monthly-withdrawals' && (
                <MonthlyWithdrawalsTab
                  annualPayPeriodTotal={totals.annualPayPeriodTotal}
                  annualWithdrawalsInPayPeriod={annualWithdrawalsInPayPeriod}
                  cancelEdit={cancelEdit}
                  editingId={editingId}
                  form={form}
                  formTitle={formTitle}
                  payPeriodEnd={payPeriodEnd}
                  payPeriodStart={payPeriodStart}
                  requestRemoveBill={requestRemoveBill}
                  sortedBills={sortedBills}
                  startEdit={startEdit}
                  submitBill={submitBill}
                  totals={totals}
                  updateForm={updateForm}
                  updatePayPeriodEnd={updatePayPeriodEnd}
                  updatePayPeriodStart={updatePayPeriodStart}
                />
              )}

              {activeTab === 'annual-withdrawals' && (
                <AnnualWithdrawalsTab
                  annualWithdrawalForm={annualWithdrawalForm}
                  annualWithdrawals={annualWithdrawals}
                  cancelAnnualWithdrawalEdit={cancelAnnualWithdrawalEdit}
                  editingAnnualWithdrawalId={editingAnnualWithdrawalId}
                  requestRemoveAnnualWithdrawal={requestRemoveAnnualWithdrawal}
                  startAnnualWithdrawalEdit={startAnnualWithdrawalEdit}
                  submitAnnualWithdrawal={submitAnnualWithdrawal}
                  totals={totals}
                  updateAnnualWithdrawalForm={updateAnnualWithdrawalForm}
                />
              )}

              {activeTab === 'income-summary' && (
                <IncomeSummaryTab
                  cancelIncomeSummaryItemEdit={cancelIncomeSummaryItemEdit}
                  derivedIncomeSummaryItems={derivedIncomeSummaryItems}
                  editingIncomeSummaryItemId={editingIncomeSummaryItemId}
                  incomeSummaryForm={incomeSummaryForm}
                  requestRemoveIncomeSummaryItem={requestRemoveIncomeSummaryItem}
                  sourceIncomeSummaryItems={sourceIncomeSummaryItems}
                  startIncomeSummaryItemEdit={startIncomeSummaryItemEdit}
                  submitIncomeSummaryItem={submitIncomeSummaryItem}
                  updateIncomeSummaryForm={updateIncomeSummaryForm}
                />
              )}

              {activeTab === 'income-calendar' && (
                <IncomeCalendarTab
                  cancelIncomeEventEdit={cancelIncomeEventEdit}
                  editingIncomeEventId={editingIncomeEventId}
                  incomeEventForm={incomeEventForm}
                  incomeEvents={incomeEvents}
                  recurringPaydayForm={recurringPaydayForm}
                  requestRemoveIncomeEvent={requestRemoveIncomeEvent}
                  startIncomeEventEdit={startIncomeEventEdit}
                  submitRecurringPaydays={submitRecurringPaydays}
                  submitIncomeEvent={submitIncomeEvent}
                  updateIncomeEventForm={updateIncomeEventForm}
                  updateRecurringPaydayForm={updateRecurringPaydayForm}
                />
              )}

              {activeTab === 'retirement' && retirement && (
                <AssetTable
                  assetForm={assetForm}
                  cancelAssetEdit={cancelAssetEdit}
                  category={retirement}
                  editingAsset={editingAsset}
                  requestRemoveAsset={requestRemoveAsset}
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
                  requestRemoveAsset={requestRemoveAsset}
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
                  requestRemoveAsset={requestRemoveAsset}
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
                  requestRemoveAsset={requestRemoveAsset}
                  startAssetEdit={startAssetEdit}
                  submitAsset={submitAsset}
                  updateAssetForm={updateAssetForm}
                />
              )}

              {activeTab === 'debt' && (
                <DebtTab
                  cancelDebtEdit={cancelDebtEdit}
                  debtAccounts={debtAccounts}
                  debtForm={debtForm}
                  editingDebtId={editingDebtId}
                  requestRemoveDebt={requestRemoveDebt}
                  startDebtEdit={startDebtEdit}
                  submitDebt={submitDebt}
                  totalDebt={totalDebt}
                  updateDebtForm={updateDebtForm}
                />
              )}

              {activeTab === 'important-dates' && (
                <ImportantDatesTab
                  cancelImportantDateEdit={cancelImportantDateEdit}
                  editingImportantDateId={editingImportantDateId}
                  importantDateForm={importantDateForm}
                  importantDates={importantDates}
                  requestRemoveImportantDate={requestRemoveImportantDate}
                  startImportantDateEdit={startImportantDateEdit}
                  submitImportantDate={submitImportantDate}
                  updateImportantDateForm={updateImportantDateForm}
                />
              )}
            </>
          )}
        </section>
      </div>

      {pendingRemoval && (
        <ConfirmRemoveModal
          itemName={pendingRemoval.name}
          itemType={removalItemType(pendingRemoval)}
          onCancel={() => setPendingRemoval(null)}
          onConfirm={confirmRemoval}
        />
      )}
    </main>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
