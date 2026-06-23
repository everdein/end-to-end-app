package com.example.backend.api;

import com.example.backend.dto.financials.ExpenseBillRequest;
import com.example.backend.dto.financials.ExpenseBillResponse;
import com.example.backend.dto.financials.ExpenseSnapshotRequest;
import com.example.backend.dto.financials.ExpenseSnapshotResponse;
import com.example.backend.dto.financials.PayPeriodRequest;
import com.example.backend.service.FinancialsService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FinancialsController {

  private final FinancialsService financialsService;

  public FinancialsController(FinancialsService financialsService) {
    this.financialsService = financialsService;
  }

  @GetMapping("/api/financials/expenses")
  public ExpenseSnapshotResponse getMonthlyExpenses() {
    return financialsService.getSnapshot();
  }

  @PostMapping("/api/financials/expenses")
  @ResponseStatus(HttpStatus.CREATED)
  public ExpenseBillResponse addBill(@Valid @RequestBody ExpenseBillRequest request) {
    return financialsService.addBill(request);
  }

  @PutMapping("/api/financials/expenses/{id}")
  public ExpenseBillResponse updateBill(
      @PathVariable long id, @Valid @RequestBody ExpenseBillRequest request) {
    return financialsService.updateBill(id, request);
  }

  @DeleteMapping("/api/financials/expenses/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteBill(@PathVariable long id) {
    financialsService.deleteBill(id);
  }

  @PutMapping("/api/financials/pay-period")
  public ExpenseSnapshotResponse updatePayPeriod(@Valid @RequestBody PayPeriodRequest request) {
    return financialsService.updatePayPeriod(request);
  }

  @PutMapping("/api/financials/expenses/snapshot")
  public ExpenseSnapshotResponse saveSnapshot(@Valid @RequestBody ExpenseSnapshotRequest request) {
    return financialsService.saveSnapshot(request);
  }
}
