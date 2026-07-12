package com.example.backend.repository;

import java.time.LocalDate;
import java.util.List;

public record FinancialsData(
    Long version,
    LocalDate payPeriodStart,
    LocalDate payPeriodEnd,
    List<ExpenseBill> bills,
    List<AnnualWithdrawal> annualWithdrawals,
    List<AssetAccount> assetAccounts,
    List<DebtAccount> debtAccounts,
    List<IncomeSummaryItem> incomeSummaryItems,
    List<IncomeEvent> incomeEvents,
    List<ImportantDate> importantDates) {

  public FinancialsData {
    if (version == null || version < 1) {
      version = 1L;
    }
  }

  public FinancialsData(
      LocalDate payPeriodStart,
      LocalDate payPeriodEnd,
      List<ExpenseBill> bills,
      List<AnnualWithdrawal> annualWithdrawals,
      List<AssetAccount> assetAccounts,
      List<DebtAccount> debtAccounts,
      List<IncomeSummaryItem> incomeSummaryItems,
      List<IncomeEvent> incomeEvents,
      List<ImportantDate> importantDates) {
    this(
        1L,
        payPeriodStart,
        payPeriodEnd,
        bills,
        annualWithdrawals,
        assetAccounts,
        debtAccounts,
        incomeSummaryItems,
        incomeEvents,
        importantDates);
  }

  public static FinancialsData empty() {
    return new FinancialsData(
        1L,
        LocalDate.now().withDayOfMonth(1),
        LocalDate.now().withDayOfMonth(15),
        List.of(),
        List.of(),
        List.of(),
        List.of(),
        List.of(),
        List.of(),
        List.of());
  }

  public FinancialsData withVersion(long version) {
    return new FinancialsData(
        version,
        payPeriodStart,
        payPeriodEnd,
        bills,
        annualWithdrawals,
        assetAccounts,
        debtAccounts,
        incomeSummaryItems,
        incomeEvents,
        importantDates);
  }
}
