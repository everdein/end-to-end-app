package com.example.backend.dto.financials;

import java.time.LocalDate;
import java.util.List;

public record ExpenseSnapshotRequest(
    LocalDate payPeriodStart,
    LocalDate payPeriodEnd,
    List<ExpenseBillSnapshotRequest> bills,
    List<AssetCategorySnapshotRequest> assetCategories) {}
