package com.example.backend.api;

import com.example.backend.dto.financials.ExpenseBillRequest;
import com.example.backend.dto.financials.ExpenseBillResponse;
import com.example.backend.dto.financials.ExpenseSnapshotRequest;
import com.example.backend.dto.financials.ExpenseSnapshotResponse;
import com.example.backend.dto.financials.FinancialSnapshotExportResponse;
import com.example.backend.dto.financials.PayPeriodRequest;
import com.example.backend.service.FinancialsService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Financials API v1
 *
 * <p>RESTful API for managing financial snapshots, expense bills, assets, and debts.
 *
 * <p>Endpoints: - GET /api/v1/financials → Retrieve current financial snapshot - PUT
 * /api/v1/financials → Save full financial snapshot - POST /api/v1/financials/bills → Create
 * expense bill - PUT /api/v1/financials/bills/{id} → Update expense bill - DELETE
 * /api/v1/financials/bills/{id} → Delete expense bill - PUT /api/v1/financials/pay-period → Update
 * pay period dates
 *
 * <p>Versioning: Explicit /api/v1/ prefix for future compatibility and clear deprecation path when
 * v2 is introduced.
 */
@RestController
@RequestMapping("/api/v1/financials")
public class FinancialsController {

  private final FinancialsService financialsService;

  public FinancialsController(FinancialsService financialsService) {
    this.financialsService = financialsService;
  }

  @GetMapping
  public ExpenseSnapshotResponse getSnapshot() {
    return financialsService.getSnapshot();
  }

  @GetMapping(value = "/export", produces = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<FinancialSnapshotExportResponse> exportSnapshot() {
    FinancialSnapshotExportResponse snapshotExport = financialsService.exportSnapshot();
    String filename = "financial-snapshot-v" + snapshotExport.snapshot().version() + ".json";

    return ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(filename).build().toString())
        .body(snapshotExport);
  }

  @PostMapping("/bills")
  @ResponseStatus(HttpStatus.CREATED)
  public ExpenseBillResponse addBill(@Valid @RequestBody ExpenseBillRequest request) {
    return financialsService.addBill(request);
  }

  @PutMapping("/bills/{id}")
  public ExpenseBillResponse updateBill(
      @PathVariable long id, @Valid @RequestBody ExpenseBillRequest request) {
    return financialsService.updateBill(id, request);
  }

  @DeleteMapping("/bills/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteBill(@PathVariable long id) {
    financialsService.deleteBill(id);
  }

  @PutMapping("/pay-period")
  public ExpenseSnapshotResponse updatePayPeriod(@Valid @RequestBody PayPeriodRequest request) {
    return financialsService.updatePayPeriod(request);
  }

  @PutMapping
  public ExpenseSnapshotResponse saveSnapshot(@Valid @RequestBody ExpenseSnapshotRequest request) {
    return financialsService.saveSnapshot(request);
  }
}
