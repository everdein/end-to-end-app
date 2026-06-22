package com.example.backend.dto.financials;

import java.time.LocalDate;

public record PayPeriodRequest(LocalDate startDate, LocalDate endDate) {}
