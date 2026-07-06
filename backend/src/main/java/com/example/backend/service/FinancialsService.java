package com.example.backend.service;

import com.example.backend.dto.financials.AnnualWithdrawalResponse;
import com.example.backend.dto.financials.AnnualWithdrawalSnapshotRequest;
import com.example.backend.dto.financials.AssetAccountResponse;
import com.example.backend.dto.financials.AssetAccountSnapshotRequest;
import com.example.backend.dto.financials.AssetCategoryResponse;
import com.example.backend.dto.financials.AssetCategorySnapshotRequest;
import com.example.backend.dto.financials.DebtAccountResponse;
import com.example.backend.dto.financials.DebtAccountSnapshotRequest;
import com.example.backend.dto.financials.ExpenseBillRequest;
import com.example.backend.dto.financials.ExpenseBillResponse;
import com.example.backend.dto.financials.ExpenseBillSnapshotRequest;
import com.example.backend.dto.financials.ExpenseSnapshotRequest;
import com.example.backend.dto.financials.ExpenseSnapshotResponse;
import com.example.backend.dto.financials.ImportantDateResponse;
import com.example.backend.dto.financials.ImportantDateSnapshotRequest;
import com.example.backend.dto.financials.IncomeEventResponse;
import com.example.backend.dto.financials.IncomeEventSnapshotRequest;
import com.example.backend.dto.financials.IncomeSummaryItemResponse;
import com.example.backend.dto.financials.IncomeSummaryItemSnapshotRequest;
import com.example.backend.dto.financials.PayPeriodRequest;
import com.example.backend.repository.AnnualWithdrawal;
import com.example.backend.repository.AssetAccount;
import com.example.backend.repository.DebtAccount;
import com.example.backend.repository.ExpenseBill;
import com.example.backend.repository.FinancialsRepository;
import com.example.backend.repository.ImportantDate;
import com.example.backend.repository.IncomeEvent;
import com.example.backend.repository.IncomeSummaryItem;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FinancialsService {

  private static final DateTimeFormatter DISPLAY_DATE_FORMATTER =
      DateTimeFormatter.ofPattern("MM/dd/yyyy");
  private static final String RENT_WITHDRAWAL_NAME = "Rent";
  private static final String RENT_RESERVE_ACCOUNT_NAME = "Rent Reserve";
  private static final String PRIMARY_PAYCHECK_CATEGORY = "Net Income";
  private static final String PRIMARY_PAYCHECK_INTERVAL = "Bi-Weekly";

  private final FinancialsRepository financialsRepository;
  private final Clock clock;

  @Autowired
  public FinancialsService(FinancialsRepository financialsRepository) {
    this(financialsRepository, Clock.systemDefaultZone());
  }

  FinancialsService(FinancialsRepository financialsRepository, Clock clock) {
    this.financialsRepository = financialsRepository;
    this.clock = clock;
  }

  public ExpenseSnapshotResponse getSnapshot() {
    PayPeriodDatePolicy.PayPeriod payPeriod = currentPayPeriod();
    LocalDate startDate = payPeriod.startDate();
    LocalDate endDate = payPeriod.endDate();

    List<ExpenseBillResponse> bills =
        normalizeBills(financialsRepository.findAllBills()).stream()
            .map((bill) -> toResponse(bill, payPeriod))
            .toList();

    BigDecimal totalMonthlyExpenses = sum(bills.stream().map(ExpenseBillResponse::amount).toList());
    BigDecimal paidTotal =
        bills.stream()
            .filter(ExpenseBillResponse::paid)
            .map(ExpenseBillResponse::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    BigDecimal unpaidTotal = totalMonthlyExpenses.subtract(paidTotal);
    BigDecimal payPeriodTotal =
        bills.stream()
            .filter(ExpenseBillResponse::inPayPeriod)
            .map(ExpenseBillResponse::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    List<AnnualWithdrawalResponse> annualWithdrawals =
        financialsRepository.findAllAnnualWithdrawals().stream()
            .map((withdrawal) -> toResponse(withdrawal, payPeriod))
            .toList();
    BigDecimal totalAnnualWithdrawals =
        sum(annualWithdrawals.stream().map(AnnualWithdrawalResponse::amount).toList());
    BigDecimal annualPayPeriodTotal =
        annualWithdrawals.stream()
            .filter(AnnualWithdrawalResponse::inPayPeriod)
            .map(AnnualWithdrawalResponse::amount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    List<AssetCategoryResponse> assetCategories = assetCategories();
    BigDecimal totalTrackedAssets =
        sum(assetCategories.stream().map(AssetCategoryResponse::total).toList());
    List<DebtAccountResponse> debtAccounts = debtAccounts();
    BigDecimal totalDebt = sum(debtAccounts.stream().map(DebtAccountResponse::amount).toList());
    BigDecimal netWorth = totalTrackedAssets.subtract(totalDebt);
    List<IncomeSummaryItemResponse> incomeSummaryItems = incomeSummaryItems();
    List<IncomeEventResponse> incomeEvents = incomeEvents();
    List<ImportantDateResponse> importantDates = importantDates();

    return new ExpenseSnapshotResponse(
        startDate,
        endDate,
        totalMonthlyExpenses,
        paidTotal,
        unpaidTotal,
        payPeriodTotal,
        totalAnnualWithdrawals,
        annualPayPeriodTotal,
        totalTrackedAssets,
        totalDebt,
        netWorth,
        assetCategories,
        debtAccounts,
        incomeSummaryItems,
        bills,
        annualWithdrawals,
        incomeEvents,
        importantDates);
  }

  public ExpenseBillResponse addBill(ExpenseBillRequest request) {
    ExpenseBill created = financialsRepository.addBill(toBill(request, 0));
    return toResponse(created, currentPayPeriod());
  }

  public ExpenseBillResponse updateBill(long id, ExpenseBillRequest request) {
    ExpenseBill bill = toBill(request, id);
    ExpenseBill updated =
        financialsRepository
            .updateBill(id, bill)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bill not found"));
    return toResponse(updated, currentPayPeriod());
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
    List<ExpenseBill> bills = normalizeBills(request.bills().stream().map(this::toBill).toList());
    List<AnnualWithdrawal> annualWithdrawals =
        nullSafe(request.annualWithdrawals()).stream().map(this::toAnnualWithdrawal).toList();
    List<AssetAccount> assetAccounts =
        normalizeAssetAccounts(
            request.assetCategories().stream()
                .flatMap((category) -> toAssetAccounts(category).stream())
                .toList());
    List<DebtAccount> debtAccounts =
        nullSafe(request.debtAccounts()).stream().map(this::toDebtAccount).toList();
    List<IncomeSummaryItem> incomeSummaryItems =
        normalizeIncomeSummaryItems(
            nullSafe(request.incomeSummaryItems()).stream()
                .map(this::toIncomeSummaryItem)
                .toList());
    List<IncomeEvent> incomeEvents =
        request.incomeEvents().stream().map(this::toIncomeEvent).toList();
    List<ImportantDate> importantDates =
        request.importantDates().stream().map(this::toImportantDate).toList();
    financialsRepository.replaceSnapshot(
        request.payPeriodStart(),
        request.payPeriodEnd(),
        bills,
        annualWithdrawals,
        assetAccounts,
        debtAccounts,
        incomeSummaryItems,
        incomeEvents,
        importantDates);
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

  private void validateBill(String bill, int dueDay, BigDecimal amount, String account) {
    if (bill == null || bill.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bill name is required");
    }

    if (account == null || account.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Account is required");
    }

    if (dueDay < 1 || dueDay > 31) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Due day must be between 1 and 31");
    }

    if (amount == null || isNegative(amount)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Amount must be positive");
    }
  }

  private AnnualWithdrawal toAnnualWithdrawal(AnnualWithdrawalSnapshotRequest request) {
    validateAnnualWithdrawal(
        request.bill(), request.month(), request.day(), request.amount(), request.account());
    long id = request.id() == null ? 0 : request.id();
    return new AnnualWithdrawal(
        id,
        request.bill().trim(),
        request.month(),
        request.day(),
        request.amount(),
        request.account().trim(),
        request.paid());
  }

  private void validateAnnualWithdrawal(
      String bill, int month, int day, BigDecimal amount, String account) {
    if (bill == null || bill.isBlank()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Annual withdrawal name is required");
    }

    if (account == null || account.isBlank()) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Annual withdrawal account is required");
    }

    if (month < 1 || month > 12) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Month must be between 1 and 12");
    }

    if (day < 1 || day > YearMonth.of(2024, month).lengthOfMonth()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Day is not valid for month");
    }

    if (amount == null || isNegative(amount)) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Annual withdrawal amount must be positive");
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

  private void validateAssetAccount(String account, String company, BigDecimal amount) {
    if (account == null || account.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Asset account is required");
    }

    if (company == null || company.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Asset company is required");
    }

    if (amount == null || isNegative(amount)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Asset amount must be positive");
    }
  }

  private DebtAccount toDebtAccount(DebtAccountSnapshotRequest request) {
    validateDebtAccount(request.account(), request.company(), request.amount());
    long id = request.id() == null ? 0 : request.id();
    return new DebtAccount(
        id, request.account().trim(), request.company().trim(), request.amount());
  }

  private void validateDebtAccount(String account, String company, BigDecimal amount) {
    if (account == null || account.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debt account is required");
    }

    if (company == null || company.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debt company is required");
    }

    if (amount == null || isNegative(amount)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Debt amount must be positive");
    }
  }

  private IncomeSummaryItem toIncomeSummaryItem(IncomeSummaryItemSnapshotRequest request) {
    validateIncomeSummaryItem(request.category(), request.interval(), request.amount());
    long id = request.id() == null ? 0 : request.id();
    return new IncomeSummaryItem(
        id, request.category().trim(), request.interval().trim(), request.amount());
  }

  private void validateIncomeSummaryItem(String category, String interval, BigDecimal amount) {
    if (category == null || category.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Income category is required");
    }

    if (interval == null || interval.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Income interval is required");
    }

    if (amount == null || isNegative(amount)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Income amount must be positive");
    }
  }

  private IncomeEvent toIncomeEvent(IncomeEventSnapshotRequest request) {
    validateIncomeEvent(request.date(), request.label(), request.type(), request.checkNumber());
    long id = request.id() == null ? 0 : request.id();
    return new IncomeEvent(
        id, request.date(), request.label().trim(), request.type().trim(), request.checkNumber());
  }

  private void validateIncomeEvent(LocalDate date, String label, String type, Integer checkNumber) {
    if (date == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Income date is required");
    }

    if (label == null || label.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Income label is required");
    }

    if (type == null || type.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Income type is required");
    }

    if (checkNumber != null && checkNumber < 1) {
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Check number must be greater than zero");
    }
  }

  private ImportantDate toImportantDate(ImportantDateSnapshotRequest request) {
    validateImportantDate(request.date(), request.event(), request.type());
    long id = request.id() == null ? 0 : request.id();
    return new ImportantDate(id, request.date(), request.event().trim(), request.type().trim());
  }

  private void validateImportantDate(LocalDate date, String event, String type) {
    if (date == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Important date is required");
    }

    if (event == null || event.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Important date event is required");
    }

    if (type == null || type.isBlank()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Important date type is required");
    }
  }

  private List<ExpenseBill> normalizeBills(List<ExpenseBill> bills) {
    if (bills.stream().anyMatch(this::isRentWithdrawal)) {
      return bills;
    }

    ExpenseBill legacyRent =
        bills.stream()
            .filter((bill) -> bill.bill().toLowerCase().contains("rent"))
            .findFirst()
            .orElse(null);
    if (legacyRent != null) {
      return bills.stream()
          .map(
              (bill) ->
                  bill.id() == legacyRent.id()
                      ? new ExpenseBill(
                          bill.id(),
                          RENT_WITHDRAWAL_NAME,
                          bill.dueDay(),
                          bill.amount(),
                          bill.account(),
                          bill.paid())
                      : bill)
          .toList();
    }

    List<ExpenseBill> normalized = new ArrayList<>();
    normalized.add(
        new ExpenseBill(-100000, RENT_WITHDRAWAL_NAME, 1, BigDecimal.ZERO, "Check", false));
    normalized.addAll(bills);
    return normalized;
  }

  private List<AssetAccount> normalizeAssetAccounts(List<AssetAccount> accounts) {
    AssetAccount cashSavings =
        accounts.stream()
            .filter((account) -> account.categoryKey().equals("cash-savings"))
            .findFirst()
            .orElse(null);

    if (cashSavings == null) {
      List<AssetAccount> normalized = new ArrayList<>(accounts);
      normalized.add(
          new AssetAccount(
              -100001,
              "cash-savings",
              "Cash & Savings",
              RENT_RESERVE_ACCOUNT_NAME,
              "Credit Union",
              BigDecimal.ZERO));
      return normalized;
    }

    if (accounts.stream().anyMatch(this::isRentReserveAccount)) {
      return accounts;
    }

    AssetAccount legacyReserve =
        accounts.stream()
            .filter(
                (account) ->
                    account.categoryKey().equals("cash-savings")
                        && account.account().toLowerCase().contains("rent"))
            .findFirst()
            .orElse(null);
    if (legacyReserve != null) {
      return accounts.stream()
          .map(
              (account) ->
                  account.id() == legacyReserve.id()
                      ? new AssetAccount(
                          account.id(),
                          account.categoryKey(),
                          account.categoryLabel(),
                          RENT_RESERVE_ACCOUNT_NAME,
                          account.company(),
                          account.amount())
                      : account)
          .toList();
    }

    List<AssetAccount> normalized = new ArrayList<>(accounts);
    normalized.add(
        new AssetAccount(
            -100001,
            cashSavings.categoryKey(),
            cashSavings.categoryLabel(),
            RENT_RESERVE_ACCOUNT_NAME,
            "Credit Union",
            BigDecimal.ZERO));
    return normalized;
  }

  private List<IncomeSummaryItem> normalizeIncomeSummaryItems(List<IncomeSummaryItem> items) {
    if (items.stream().anyMatch(this::isPrimaryPaycheck)) {
      return items;
    }

    List<IncomeSummaryItem> normalized = new ArrayList<>(items);
    normalized.add(
        new IncomeSummaryItem(
            -100002, PRIMARY_PAYCHECK_CATEGORY, PRIMARY_PAYCHECK_INTERVAL, BigDecimal.ZERO));
    return normalized;
  }

  private boolean isRentWithdrawal(ExpenseBill bill) {
    return bill.bill().trim().equalsIgnoreCase(RENT_WITHDRAWAL_NAME);
  }

  private boolean isRentReserveAccount(AssetAccount account) {
    return account.account().trim().equalsIgnoreCase(RENT_RESERVE_ACCOUNT_NAME);
  }

  private boolean isPrimaryPaycheck(IncomeSummaryItem item) {
    return item.category().trim().equalsIgnoreCase(PRIMARY_PAYCHECK_CATEGORY)
        && item.interval().trim().equalsIgnoreCase(PRIMARY_PAYCHECK_INTERVAL);
  }

  private ExpenseBillResponse toResponse(
      ExpenseBill bill, PayPeriodDatePolicy.PayPeriod payPeriod) {
    LocalDate dueDate = PayPeriodDatePolicy.monthlyDueDate(bill.dueDay(), payPeriod);
    boolean inPayPeriod =
        !dueDate.isBefore(payPeriod.startDate()) && !dueDate.isAfter(payPeriod.endDate());

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

  private AnnualWithdrawalResponse toResponse(
      AnnualWithdrawal withdrawal, PayPeriodDatePolicy.PayPeriod payPeriod) {
    LocalDate dueDate =
        PayPeriodDatePolicy.annualDueDate(withdrawal.month(), withdrawal.day(), payPeriod);
    boolean inPayPeriod =
        !dueDate.isBefore(payPeriod.startDate()) && !dueDate.isAfter(payPeriod.endDate());

    return new AnnualWithdrawalResponse(
        withdrawal.id(),
        withdrawal.bill(),
        withdrawal.month(),
        withdrawal.day(),
        dateLabel(dueDate),
        dueDate,
        withdrawal.amount(),
        withdrawal.account(),
        withdrawal.paid(),
        inPayPeriod);
  }

  private List<AssetCategoryResponse> assetCategories() {
    Map<String, List<AssetAccountResponse>> accountsByCategory = new LinkedHashMap<>();
    Map<String, String> labelsByCategory = new LinkedHashMap<>();

    normalizeAssetAccounts(financialsRepository.findAllAssetAccounts())
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
              BigDecimal total =
                  sum(entry.getValue().stream().map(AssetAccountResponse::amount).toList());
              return new AssetCategoryResponse(
                  entry.getKey(), labelsByCategory.get(entry.getKey()), total, entry.getValue());
            })
        .toList();
  }

  private List<IncomeEventResponse> incomeEvents() {
    Map<YearMonth, Long> paycheckCountsByMonth = paycheckCountsByMonth();

    return financialsRepository.findAllIncomeEvents().stream()
        .map(
            (event) ->
                new IncomeEventResponse(
                    event.id(),
                    event.date(),
                    event.label(),
                    event.type(),
                    event.checkNumber(),
                    paycheckCountsByMonth
                        .getOrDefault(YearMonth.from(event.date()), 0L)
                        .intValue()))
        .toList();
  }

  private List<DebtAccountResponse> debtAccounts() {
    return financialsRepository.findAllDebtAccounts().stream()
        .map(
            (account) ->
                new DebtAccountResponse(
                    account.id(), account.account(), account.company(), account.amount()))
        .toList();
  }

  private List<IncomeSummaryItemResponse> incomeSummaryItems() {
    return normalizeIncomeSummaryItems(financialsRepository.findAllIncomeSummaryItems()).stream()
        .map(
            (item) ->
                new IncomeSummaryItemResponse(
                    item.id(), item.category(), item.interval(), item.amount()))
        .toList();
  }

  private Map<YearMonth, Long> paycheckCountsByMonth() {
    Map<YearMonth, Long> counts = new LinkedHashMap<>();
    financialsRepository.findAllIncomeEvents().stream()
        .filter((event) -> event.checkNumber() != null)
        .forEach((event) -> counts.merge(YearMonth.from(event.date()), 1L, Long::sum));
    return counts;
  }

  private List<ImportantDateResponse> importantDates() {
    return financialsRepository.findAllImportantDates().stream()
        .map(
            (importantDate) ->
                new ImportantDateResponse(
                    importantDate.id(),
                    importantDate.date(),
                    importantDate.event(),
                    importantDate.type()))
        .toList();
  }

  private PayPeriodDatePolicy.PayPeriod currentPayPeriod() {
    return PayPeriodDatePolicy.currentPayPeriod(
        financialsRepository.payPeriodStart(), financialsRepository.payPeriodEnd(), clock);
  }

  private String dateLabel(LocalDate date) {
    return date.format(DISPLAY_DATE_FORMATTER);
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

  private BigDecimal sum(List<BigDecimal> values) {
    return values.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  private boolean isNegative(BigDecimal amount) {
    return amount != null && amount.signum() < 0;
  }

  private <T> List<T> nullSafe(List<T> value) {
    return value == null ? List.of() : value;
  }
}
