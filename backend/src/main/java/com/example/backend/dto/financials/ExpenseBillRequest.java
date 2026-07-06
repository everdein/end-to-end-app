package com.example.backend.dto.financials;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

/**
 * Money Handling Standard (Production-Grade)
 *
 * <p>This record uses BigDecimal for precise decimal arithmetic required in financial calculations.
 * This prevents floating-point rounding errors that accumulate in money calculations (e.g., 0.1 +
 * 0.2 != 0.3 in IEEE 754).
 *
 * <p>Contract: All monetary fields must be BigDecimal in both Request and Response DTOs. Service
 * layer uses BigDecimal for all arithmetic (summation, subtraction, etc.). JSON serialization:
 * BigDecimal → decimal number string for safe transport.
 */
public record ExpenseBillRequest(
    @NotBlank(message = "Bill name is required") String bill,
    @Min(value = 1, message = "Due day must be between 1 and 31")
        @Max(value = 31, message = "Due day must be between 1 and 31")
        int dueDay,
    @NotNull(message = "Amount is required") @PositiveOrZero(message = "Amount must be positive")
        BigDecimal amount,
    @NotBlank(message = "Account is required") String account,
    boolean paid) {}
