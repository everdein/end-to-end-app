package com.example.backend.dto.financials;

import java.math.BigDecimal;

public record IncomeSummaryItemResponse(
    long id, String category, String interval, BigDecimal amount) {}
