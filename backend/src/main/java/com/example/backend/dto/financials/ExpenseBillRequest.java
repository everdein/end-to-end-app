package com.example.backend.dto.financials;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

public record ExpenseBillRequest(
    @NotBlank(message = "Bill name is required") String bill,
    @Min(value = 1, message = "Due day must be between 1 and 31")
        @Max(value = 31, message = "Due day must be between 1 and 31")
        int dueDay,
    @PositiveOrZero(message = "Amount must be positive") BigDecimal amount,
    @NotBlank(message = "Account is required") String account,
    boolean paid) {}
