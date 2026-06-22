package com.example.backend.dto.financials;

import java.util.List;

public record AssetCategorySnapshotRequest(
    String key, String label, List<AssetAccountSnapshotRequest> accounts) {}
