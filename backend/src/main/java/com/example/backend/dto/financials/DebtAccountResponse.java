package com.example.backend.dto.financials;

import java.math.BigDecimal;

public record DebtAccountResponse(long id, String account, String company, BigDecimal amount) {}
