package com.example.backend.service;

import com.example.backend.dto.financials.AssetAccountResponse;
import com.example.backend.dto.financials.AssetAccountSnapshotRequest;
import com.example.backend.dto.financials.AssetCategoryResponse;
import com.example.backend.dto.financials.AssetCategorySnapshotRequest;
import com.example.backend.dto.financials.ExpenseBillRequest;
import com.example.backend.dto.financials.ExpenseBillResponse;
import com.example.backend.dto.financials.ExpenseBillSnapshotRequest;
import com.example.backend.dto.financials.ExpenseSnapshotRequest;
import com.example.backend.dto.financials.ExpenseSnapshotResponse;
import com.example.backend.dto.financials.PayPeriodRequest;
import com.example.backend.repository.AssetAccount;
import com.example.backend.repository.ExpenseBill;
import com.example.backend.repository.FinancialsRepository;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FinancialsService {

  private final FinancialsRepository financialsRepository;

  public FinancialsService(FinancialsRepository financialsRepository) {
    this.financialsRepository = financialsRepository;
  }

  public ExpenseSnapshotResponse getSnapshot() {
    LocalDate[] payPeriod = currentPayPeriod();
    LocalDate startDate = payPeriod[0];
    LocalDate endDate = payPeriod[1];

    List<ExpenseBillResponse> bills =
        financialsRepository.findAllBills().stream()
            .map((bill) -> toResponse(bill, startDate, endDate))
            .toList();

    double totalMonthlyExpenses = bills.stream().mapToDouble(ExpenseBillResponse::amount).sum();
    double paidTotal =
        bills.stream()
            .filter(ExpenseBillResponse::paid)
            .mapToDouble(ExpenseBillResponse::amount)
            .sum();
    double unpaidTotal = totalMonthlyExpenses - paidTotal;
    double payPeriodTotal =
        bills.stream()
            .filter(ExpenseBillResponse::inPayPeriod)
            .mapToDouble(ExpenseBillResponse::amount)
            .sum();
    List<AssetCategoryResponse> assetCategories = assetCategories();
    double totalTrackedAssets =
        assetCategories.stream().mapToDouble(AssetCategoryResponse::total).sum();

    return new ExpenseSnapshotResponse(
        startDate,
        endDate,
        totalMonthlyExpenses,
        paidTotal,
        unpaidTotal,
        payPeriodTotal,
        totalTrackedAssets,
        assetCategories,
        bills);
  }

  public ExpenseBillResponse addBill(ExpenseBillRequest request) {
    ExpenseBill created = financialsRepository.addBill(toBill(request, 0));
    LocalDate[] payPeriod = currentPayPeriod();
    return toResponse(created, payPeriod[0], payPeriod[1]);
  }

  public ExpenseBillResponse updateBill(long id, ExpenseBillRequest request) {
    ExpenseBill bill = toBill(request, id);
    ExpenseBill updated =
        financialsRepository
            .updateBill(id, bill)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bill not found"));
    LocalDate[] payPeriod = currentPayPeriod();
    return toResponse(updated, payPeriod[0], payPeriod[1]);
  }

  public void deleteBill(long id) {
    if (!financialsRepository.deleteBill(id)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bill not found");
    }
  }

  public ExpenseSnapshotResponse updatePayPeriod(PayPeriodRequest request) {
    validatePayPeriod(request.startDate(), request.endDate());
    financialsRepository.updatePayPeriod(request.startDate(), request.endDate());
    return getSnapshot();
  }

  public ExpenseSnapshotResponse saveSnapshot(ExpenseSnapshotRequest request) {
    validatePayPeriod(request.payPeriodStart(), request.payPeriodEnd());
    List<ExpenseBill> bills = request.bills().stream().map(this::toBill).toList();
    List<AssetAccount> assetAccounts =
        request.assetCategories().stream()
            .flatMap((category) -> toAssetAccounts(category).stream())
            .toList();
    financialsRepository.replaceSnapshot(
        request.payPeriodStart(), request.payPeriodEnd(), bills, assetAccounts);
    return getSnapshot();
  }

  private ExpenseBill toBill(ExpenseBillRequest request, long id) {
    validateBill(request.bill(), request.dueDay(), request.amount(), request.account());
    return new ExpenseBill(
        id,
        request.bill().trim(),
        request.dueDay(),
        request.amount(),
        request.account().trim(),
        request.paid());
  }

  private ExpenseBill toBill(ExpenseBillSnapshotRequest request) {
    validateBill(request.bill(), request.dueDay(), request.amount(), request.account());
    long id = request.id() == null ? 0 : request.id();
    return new ExpenseBill(
        id,
        request.bill().trim(),
        request.dueDay(),
        request.amount(),
        request.account().trim(),
        request.paid());
  }

  private void validateBill(String bill, int dueDay, double amount, String account) {
    if (bill == null || bill.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bill name is required");
    }

    if (account == null || account.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Account is required");
    }

    if (dueDay < 1 || dueDay > 31) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Due day must be between 1 and 31");
    }

    if (amount < 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be positive");
    }
  }

  private void validatePayPeriod(LocalDate startDate, LocalDate endDate) {
    if (endDate.isBefore(startDate)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Pay period end date must be on or after start date");
    }
  }

  private List<AssetAccount> toAssetAccounts(AssetCategorySnapshotRequest category) {
    if (category.key() == null || category.key().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Asset category key is required");
    }

    if (category.label() == null || category.label().isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Asset category label is required");
    }

    return category.accounts().stream()
        .map((account) -> toAssetAccount(category, account))
        .toList();
  }

  private AssetAccount toAssetAccount(
      AssetCategorySnapshotRequest category, AssetAccountSnapshotRequest account) {
    validateAssetAccount(account.account(), account.company(), account.amount());
    long id = account.id() == null ? 0 : account.id();
    return new AssetAccount(
        id,
        category.key().trim(),
        category.label().trim(),
        account.account().trim(),
        account.company().trim(),
        account.amount());
  }

  private void validateAssetAccount(String account, String company, double amount) {
    if (account == null || account.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Asset account is required");
    }

    if (company == null || company.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Asset company is required");
    }

    if (amount < 0) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Asset amount must be positive");
    }
  }

  private ExpenseBillResponse toResponse(ExpenseBill bill, LocalDate startDate, LocalDate endDate) {
    LocalDate dueDate = dueDateForPayPeriodMonth(bill.dueDay(), startDate, endDate);
    boolean inPayPeriod = !dueDate.isBefore(startDate) && !dueDate.isAfter(endDate);

    return new ExpenseBillResponse(
        bill.id(),
        bill.bill(),
        bill.dueDay(),
        ordinal(bill.dueDay()),
        dueDate,
        bill.amount(),
        bill.account(),
        bill.paid(),
        inPayPeriod);
  }

  private List<AssetCategoryResponse> assetCategories() {
    Map<String, List<AssetAccountResponse>> accountsByCategory = new LinkedHashMap<>();
    Map<String, String> labelsByCategory = new LinkedHashMap<>();

    financialsRepository
        .findAllAssetAccounts()
        .forEach(
            (account) -> {
              labelsByCategory.putIfAbsent(account.categoryKey(), account.categoryLabel());
              accountsByCategory
                  .computeIfAbsent(account.categoryKey(), (key) -> new java.util.ArrayList<>())
                  .add(
                      new AssetAccountResponse(
                          account.id(), account.account(), account.company(), account.amount()));
            });

    return accountsByCategory.entrySet().stream()
        .map(
            (entry) -> {
              double total =
                  entry.getValue().stream().mapToDouble(AssetAccountResponse::amount).sum();
              return new AssetCategoryResponse(
                  entry.getKey(), labelsByCategory.get(entry.getKey()), total, entry.getValue());
            })
        .toList();
  }

  private LocalDate[] currentPayPeriod() {
    LocalDate startDate = financialsRepository.payPeriodStart();
    LocalDate endDate = financialsRepository.payPeriodEnd();
    LocalDate today = LocalDate.now();
    long periodDays = ChronoUnit.DAYS.between(startDate, endDate) + 1;

    while (today.isAfter(endDate)) {
      startDate = startDate.plusDays(periodDays);
      endDate = endDate.plusDays(periodDays);
    }

    while (today.isBefore(startDate)) {
      startDate = startDate.minusDays(periodDays);
      endDate = endDate.minusDays(periodDays);
    }

    return new LocalDate[] {startDate, endDate};
  }

  private LocalDate dueDateForPayPeriodMonth(int dueDay, LocalDate startDate, LocalDate endDate) {
    LocalDate dueDate = safeDate(startDate.getYear(), startDate.getMonthValue(), dueDay);

    if (dueDate.isBefore(startDate) && startDate.getMonthValue() != endDate.getMonthValue()) {
      return safeDate(endDate.getYear(), endDate.getMonthValue(), dueDay);
    }

    return dueDate;
  }

  private LocalDate safeDate(int year, int month, int day) {
    LocalDate firstOfMonth = LocalDate.of(year, month, 1);
    int safeDay = Math.min(day, firstOfMonth.lengthOfMonth());
    return LocalDate.of(year, month, safeDay);
  }

  private String ordinal(int day) {
    if (day >= 11 && day <= 13) {
      return day + "th";
    }

    return switch (day % 10) {
      case 1 -> day + "st";
      case 2 -> day + "nd";
      case 3 -> day + "rd";
      default -> day + "th";
    };
  }
}
