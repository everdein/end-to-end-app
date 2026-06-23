package com.example.backend.dto.financials;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AnnualWithdrawalResponse(
    long id,
    String bill,
    int month,
    int day,
    String dateLabel,
    LocalDate dueDate,
    BigDecimal amount,
    String account,
    boolean paid,
    boolean inPayPeriod) {}
