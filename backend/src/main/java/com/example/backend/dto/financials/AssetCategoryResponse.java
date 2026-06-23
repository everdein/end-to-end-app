package com.example.backend.dto.financials;

import java.math.BigDecimal;
import java.util.List;

public record AssetCategoryResponse(
    String key, String label, BigDecimal total, List<AssetAccountResponse> accounts) {}
