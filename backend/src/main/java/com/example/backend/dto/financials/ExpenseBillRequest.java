package com.example.backend.dto.financials;

public record ExpenseBillRequest(
    String bill, int dueDay, double amount, String account, boolean paid) {}
