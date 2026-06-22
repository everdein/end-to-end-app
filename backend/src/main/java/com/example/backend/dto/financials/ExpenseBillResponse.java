package com.example.backend.dto.financials;

import java.time.LocalDate;

public record ExpenseBillResponse(
    long id,
    String bill,
    int dueDay,
    String dueLabel,
    LocalDate dueDate,
    double amount,
    String account,
    boolean paid,
    boolean inPayPeriod) {}
