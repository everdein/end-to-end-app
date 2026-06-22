package com.example.backend.repository;

public record AssetAccount(
    long id,
    String categoryKey,
    String categoryLabel,
    String account,
    String company,
    double amount) {

  public AssetAccount withId(long id) {
    return new AssetAccount(id, categoryKey, categoryLabel, account, company, amount);
  }
}
