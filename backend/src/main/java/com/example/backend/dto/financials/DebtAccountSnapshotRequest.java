package com.example.backend.dto.financials;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

public record DebtAccountSnapshotRequest(
    Long id,
    @NotBlank(message = "Debt account is required") String account,
    @NotBlank(message = "Debt company is required") String company,
    @PositiveOrZero(message = "Debt amount must be positive") BigDecimal amount) {}
