package com.example.backend.dto.financials;

public record AssetAccountSnapshotRequest(Long id, String account, String company, double amount) {}
