package com.example.backend.dto.financials;

import java.time.LocalDate;
import java.util.List;

public record ExpenseSnapshotResponse(
    LocalDate payPeriodStart,
    LocalDate payPeriodEnd,
    double totalMonthlyExpenses,
    double paidTotal,
    double unpaidTotal,
    double payPeriodTotal,
    double totalTrackedAssets,
    List<AssetCategoryResponse> assetCategories,
    List<ExpenseBillResponse> bills) {}
