package com.example.backend.dto.financials;

import java.util.List;

public record AssetCategoryResponse(
    String key, String label, double total, List<AssetAccountResponse> accounts) {}
