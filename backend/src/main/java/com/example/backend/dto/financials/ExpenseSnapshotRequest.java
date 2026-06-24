package com.example.backend.dto.financials;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public record ExpenseSnapshotRequest(
    @NotNull(message = "Pay period start date is required") LocalDate payPeriodStart,
    @NotNull(message = "Pay period end date is required") LocalDate payPeriodEnd,
    @NotNull(message = "Bills are required") List<@Valid ExpenseBillSnapshotRequest> bills,
    List<@Valid AnnualWithdrawalSnapshotRequest> annualWithdrawals,
    @NotNull(message = "Asset categories are required")
        List<@Valid AssetCategorySnapshotRequest> assetCategories,
    List<@Valid DebtAccountSnapshotRequest> debtAccounts,
    List<@Valid IncomeSummaryItemSnapshotRequest> incomeSummaryItems,
    @NotNull(message = "Income events are required")
        List<@Valid IncomeEventSnapshotRequest> incomeEvents,
    @NotNull(message = "Important dates are required")
        List<@Valid ImportantDateSnapshotRequest> importantDates) {}
