package com.example.backend.dto.financials;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExpenseBillResponse(
    long id,
    String bill,
    int dueDay,
    String dueLabel,
    LocalDate dueDate,
    BigDecimal amount,
    String account,
    boolean paid,
    boolean inPayPeriod) {}
