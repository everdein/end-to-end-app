package com.example.backend.dto.financials;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

public record IncomeSummaryItemSnapshotRequest(
    Long id,
    @NotBlank(message = "Income category is required") String category,
    @NotBlank(message = "Income interval is required") String interval,
    @PositiveOrZero(message = "Income amount must be positive") BigDecimal amount) {}
