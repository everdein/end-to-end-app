package com.example.backend.dto.financials;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

public record AssetAccountSnapshotRequest(
    Long id,
    @NotBlank(message = "Asset account is required") String account,
    @NotBlank(message = "Asset company is required") String company,
    @PositiveOrZero(message = "Asset amount must be positive") BigDecimal amount) {}
