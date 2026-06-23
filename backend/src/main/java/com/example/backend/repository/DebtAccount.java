package com.example.backend.repository;

import java.math.BigDecimal;

public record DebtAccount(long id, String account, String company, BigDecimal amount) {

  public DebtAccount withId(long id) {
    return new DebtAccount(id, account, company, amount);
  }
}
