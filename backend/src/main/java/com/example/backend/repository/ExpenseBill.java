package com.example.backend.repository;

public record ExpenseBill(
    long id, String bill, int dueDay, double amount, String account, boolean paid) {

  public ExpenseBill withId(long id) {
    return new ExpenseBill(id, bill, dueDay, amount, account, paid);
  }
}
