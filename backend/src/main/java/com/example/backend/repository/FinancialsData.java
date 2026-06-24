package com.example.backend.repository;

import java.time.LocalDate;
import java.util.List;

public record FinancialsData(
    LocalDate payPeriodStart,
    LocalDate payPeriodEnd,
    List<ExpenseBill> bills,
    List<AnnualWithdrawal> annualWithdrawals,
    List<AssetAccount> assetAccounts,
    List<DebtAccount> debtAccounts,
    List<IncomeSummaryItem> incomeSummaryItems,
    List<IncomeEvent> incomeEvents,
    List<ImportantDate> importantDates) {

  public static FinancialsData empty() {
    return new FinancialsData(
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
}
