package com.example.backend.dto.financials;

public record ExpenseBillSnapshotRequest(
    Long id, String bill, int dueDay, double amount, String account, boolean paid) {}
