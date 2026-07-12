package com.example.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.example.backend.dto.financials.AnnualWithdrawalSnapshotRequest;
import com.example.backend.dto.financials.AssetAccountSnapshotRequest;
import com.example.backend.dto.financials.AssetCategorySnapshotRequest;
import com.example.backend.dto.financials.DebtAccountSnapshotRequest;
import com.example.backend.dto.financials.ExpenseBillRequest;
import com.example.backend.dto.financials.ExpenseBillSnapshotRequest;
import com.example.backend.dto.financials.ExpenseSnapshotRequest;
import com.example.backend.dto.financials.ImportantDateSnapshotRequest;
import com.example.backend.dto.financials.IncomeEventSnapshotRequest;
import com.example.backend.dto.financials.IncomeSummaryItemSnapshotRequest;
import com.example.backend.dto.financials.PayPeriodRequest;
import com.example.backend.repository.FinancialsRepository;
import com.example.backend.repository.JsonFinancialsSnapshotStore;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

class FinancialsServiceTests {

  @TempDir private Path tempDir;

  @Test
  void returnsSeededMonthlyExpenseSnapshot() throws IOException {
    FinancialsService service = new FinancialsService(repository());

    var snapshot = service.getSnapshot();

    assertThat(snapshot.version()).isEqualTo(1);
    assertThat(snapshot.totalMonthlyExpenses()).isEqualByComparingTo("1450.00");
    assertThat(snapshot.totalAnnualWithdrawals()).isEqualByComparingTo("99.00");
    assertThat(snapshot.totalTrackedAssets()).isEqualByComparingTo("15000.00");
    assertThat(snapshot.totalDebt()).isEqualByComparingTo("500.00");
    assertThat(snapshot.netWorth()).isEqualByComparingTo("14500.00");
    assertThat(snapshot.bills()).isNotEmpty();
    assertThat(snapshot.annualWithdrawals()).hasSize(1);
    assertThat(snapshot.debtAccounts()).hasSize(1);
    assertThat(snapshot.assetCategories()).hasSize(2);
    assertThat(snapshot.incomeSummaryItems()).hasSize(2);
    assertThat(snapshot.incomeEvents()).hasSize(2);
    assertThat(snapshot.importantDates()).hasSize(1);
    assertThat(snapshot.bills()).anyMatch((bill) -> bill.bill().equals("Rent"));
    assertThat(snapshot.assetCategories())
        .anyMatch(
            (category) ->
                category.key().equals("cash-savings")
                    && category.accounts().stream()
                        .anyMatch((account) -> account.account().equals("Rent Reserve")));
    assertThat(snapshot.incomeSummaryItems())
        .anyMatch(
            (item) -> item.category().equals("Net Income") && item.interval().equals("Bi-Weekly"));
  }

  @Test
  void exportsSourceSnapshotForBackup() throws IOException {
    Clock clock = Clock.fixed(Instant.parse("2026-07-11T10:15:30Z"), ZoneOffset.UTC);
    FinancialsService service = new FinancialsService(repository(), clock);

    var backup = service.exportSnapshot();

    assertThat(backup.format()).isEqualTo("end-to-end-app.financial-snapshot.v1");
    assertThat(backup.exportedAt()).isEqualTo(Instant.parse("2026-07-11T10:15:30Z"));
    assertThat(backup.snapshot().version()).isEqualTo(1);
    assertThat(backup.snapshot().payPeriodStart()).isEqualTo(LocalDate.of(2026, 1, 1));
    assertThat(backup.snapshot().payPeriodEnd()).isEqualTo(LocalDate.of(2026, 1, 15));
    assertThat(backup.snapshot().bills())
        .anyMatch((bill) -> bill.id() == 1L && bill.bill().equals("Example Rent"));
    assertThat(backup.snapshot().assetCategories())
        .anyMatch(
            (category) ->
                category.key().equals("cash-savings")
                    && category.accounts().stream()
                        .anyMatch((account) -> account.account().equals("Emergency Fund")));
    assertThat(backup.snapshot().incomeEvents())
        .anyMatch((event) -> event.label().equals("Paycheck") && event.checkNumber() == 1);
  }

  @Test
  void createsUpdatesAndDeletesBill() throws IOException {
    FinancialsService service = new FinancialsService(repository());

    var created =
        service.addBill(new ExpenseBillRequest("Test Bill", 5, money("42.50"), "Check", false));
    assertThat(created.bill()).isEqualTo("Test Bill");
    assertThat(created.dueLabel()).isEqualTo("5th");

    var updated =
        service.updateBill(
            created.id(), new ExpenseBillRequest("Updated Bill", 6, money("45"), "Apple", true));
    assertThat(updated.bill()).isEqualTo("Updated Bill");
    assertThat(updated.amount()).isEqualByComparingTo("45");

    service.deleteBill(created.id());
    assertThat(service.getSnapshot().bills()).noneMatch((bill) -> bill.id() == created.id());
  }

  @Test
  void updatesPayPeriodAnchor() throws IOException {
    FinancialsService service = new FinancialsService(repository());

    var snapshot =
        service.updatePayPeriod(
            new PayPeriodRequest(LocalDate.of(2026, 6, 12), LocalDate.of(2026, 6, 26)));

    assertThat(snapshot.payPeriodStart()).isNotNull();
    assertThat(snapshot.payPeriodEnd()).isNotNull();
  }

  @Test
  void rollsSavedPayPeriodForwardToCurrentDate() throws IOException {
    Clock clock = Clock.fixed(Instant.parse("2026-06-22T12:00:00Z"), ZoneOffset.UTC);
    FinancialsService service = new FinancialsService(repository(), clock);

    var snapshot = service.getSnapshot();

    assertThat(snapshot.payPeriodStart()).isEqualTo(LocalDate.of(2026, 6, 15));
    assertThat(snapshot.payPeriodEnd()).isEqualTo(LocalDate.of(2026, 6, 29));
    assertThat(snapshot.bills())
        .anyMatch(
            (bill) ->
                bill.bill().equals("Example Savings Transfer")
                    && bill.dueDate().equals(LocalDate.of(2026, 6, 15))
                    && bill.inPayPeriod());
  }

  @Test
  void savesSnapshotInOneBatch() throws IOException {
    FinancialsService service = new FinancialsService(repository());
    long loadedVersion = service.getSnapshot().version();

    var saved =
        service.saveSnapshot(
            new ExpenseSnapshotRequest(
                loadedVersion,
                LocalDate.of(2026, 6, 12),
                LocalDate.of(2026, 6, 26),
                List.of(
                    new ExpenseBillSnapshotRequest(1L, "Rent", 1, money("2600"), "Check", true),
                    new ExpenseBillSnapshotRequest(
                        null, "New Bill", 15, money("25"), "Apple", false)),
                List.of(
                    new AnnualWithdrawalSnapshotRequest(
                        null, "Annual Renewal", 9, 18, money("99"), "Check", false)),
                List.of(
                    new AssetCategorySnapshotRequest(
                        "retirement",
                        "Retirement",
                        List.of(
                            new AssetAccountSnapshotRequest(
                                1L, "401k 10%", "Vanguard", money("110653.42")),
                            new AssetAccountSnapshotRequest(
                                null, "Pension", "Example", money("1000"))))),
                List.of(
                    new DebtAccountSnapshotRequest(null, "Apple", "Apple Card", money("2130.03")),
                    new DebtAccountSnapshotRequest(null, "Line of Credit", "BECU", money("0"))),
                List.of(
                    new IncomeSummaryItemSnapshotRequest(
                        null, "Disposable Income", "Bi-Weekly", money("1901.58"))),
                List.of(
                    new IncomeEventSnapshotRequest(
                        1L, LocalDate.of(2026, 6, 12), "Paycheck", "Paycheck", 12),
                    new IncomeEventSnapshotRequest(
                        null, LocalDate.of(2026, 6, 26), "Paycheck", "Paycheck", 13)),
                List.of(
                    new ImportantDateSnapshotRequest(
                        null, LocalDate.of(2026, 12, 25), "Christmas", "Holiday"))));

    assertThat(saved.version()).isEqualTo(loadedVersion + 1);
    assertThat(saved.bills()).hasSize(2);
    assertThat(saved.bills()).anyMatch((bill) -> bill.bill().equals("Rent"));
    assertThat(saved.annualWithdrawals()).hasSize(1);
    assertThat(saved.totalMonthlyExpenses()).isEqualByComparingTo("2625");
    assertThat(saved.totalAnnualWithdrawals()).isEqualByComparingTo("99");
    assertThat(saved.totalTrackedAssets()).isEqualByComparingTo("111653.42");
    assertThat(saved.totalDebt()).isEqualByComparingTo("2130.03");
    assertThat(saved.netWorth()).isEqualByComparingTo("109523.39");
    assertThat(saved.bills()).anyMatch((bill) -> bill.bill().equals("New Bill") && bill.id() > 0);
    assertThat(saved.assetCategories().getFirst().accounts())
        .anyMatch((account) -> account.account().equals("Pension") && account.id() > 0);
    assertThat(saved.debtAccounts())
        .anyMatch((account) -> account.account().equals("Apple") && account.id() > 0);
    assertThat(saved.incomeSummaryItems())
        .anyMatch((item) -> item.category().equals("Disposable Income") && item.id() > 0);
    assertThat(saved.incomeSummaryItems())
        .anyMatch(
            (item) ->
                item.category().equals("Net Income")
                    && item.interval().equals("Bi-Weekly")
                    && item.id() > 0);
    assertThat(saved.incomeEvents()).hasSize(2);
    assertThat(saved.incomeEvents().getFirst().checksInMonth()).isEqualTo(2);
    assertThat(saved.importantDates())
        .anyMatch((importantDate) -> importantDate.event().equals("Christmas"));
    assertThat(Files.exists(tempDir.resolve("financials.local.json.bak"))).isTrue();
  }

  @Test
  void rejectsStaleSnapshotVersion() throws IOException {
    FinancialsService service = new FinancialsService(repository());
    long staleVersion = service.getSnapshot().version();

    service.addBill(new ExpenseBillRequest("Concurrent Bill", 9, money("10"), "Check", false));

    assertThatThrownBy(
            () ->
                service.saveSnapshot(
                    new ExpenseSnapshotRequest(
                        staleVersion,
                        LocalDate.of(2026, 6, 12),
                        LocalDate.of(2026, 6, 26),
                        List.of(
                            new ExpenseBillSnapshotRequest(
                                1L, "Rent", 1, money("2600"), "Check", true)),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of(),
                        List.of())))
        .isInstanceOf(ResponseStatusException.class)
        .satisfies(
            (exception) ->
                assertThat(((ResponseStatusException) exception).getStatusCode())
                    .isEqualTo(HttpStatus.CONFLICT));
  }

  private FinancialsRepository repository() throws IOException {
    Path dataPath = tempDir.resolve("financials.local.json");
    Path examplePath = tempDir.resolve("financials.example.json");
    Files.writeString(
        examplePath,
        """
        {
          "version": 1,
          "payPeriodStart": "2026-01-01",
          "payPeriodEnd": "2026-01-15",
          "bills": [
            {
              "id": 1,
              "bill": "Example Rent",
              "dueDay": 1,
              "amount": 1200.0,
              "account": "Checking",
              "paid": false
            },
            {
              "id": 2,
              "bill": "Example Savings Transfer",
              "dueDay": 15,
              "amount": 250.0,
              "account": "Savings",
              "paid": false
            }
          ],
          "annualWithdrawals": [
            {
              "id": 1,
              "bill": "Example Membership",
              "month": 1,
              "day": 15,
              "amount": 99.0,
              "account": "Checking",
              "paid": false
            }
          ],
          "assetAccounts": [
            {
              "id": 1,
              "categoryKey": "retirement",
              "categoryLabel": "Retirement",
              "account": "Example 401k",
              "company": "Example Provider",
              "amount": 10000.0
            },
            {
              "id": 2,
              "categoryKey": "cash-savings",
              "categoryLabel": "Cash & Savings",
              "account": "Emergency Fund",
              "company": "Example Bank",
              "amount": 5000.0
            }
          ],
          "debtAccounts": [
            {
              "id": 1,
              "account": "Example Credit Card",
              "company": "Example Bank",
              "amount": 500.0
            }
          ],
          "incomeSummaryItems": [
            {
              "id": 1,
              "category": "Net Income",
              "interval": "Annual",
              "amount": 75000.0
            }
          ],
          "incomeEvents": [
            {
              "id": 1,
              "date": "2026-01-09",
              "label": "Paycheck",
              "type": "Paycheck",
              "checkNumber": 1
            },
            {
              "id": 2,
              "date": "2026-01-23",
              "label": "Paycheck",
              "type": "Paycheck",
              "checkNumber": 2
            }
          ],
          "importantDates": [
            {
              "id": 1,
              "date": "2026-01-01",
              "event": "New Years",
              "type": "Holiday"
            }
          ]
        }
        """);
    return new FinancialsRepository(
        new JsonFinancialsSnapshotStore(new ObjectMapper(), dataPath, examplePath));
  }

  private BigDecimal money(String value) {
    return new BigDecimal(value);
  }
}
