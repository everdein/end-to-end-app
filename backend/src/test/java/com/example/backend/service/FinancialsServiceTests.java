package com.example.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.backend.dto.financials.AssetAccountSnapshotRequest;
import com.example.backend.dto.financials.AssetCategorySnapshotRequest;
import com.example.backend.dto.financials.ExpenseBillRequest;
import com.example.backend.dto.financials.ExpenseBillSnapshotRequest;
import com.example.backend.dto.financials.ExpenseSnapshotRequest;
import com.example.backend.dto.financials.PayPeriodRequest;
import com.example.backend.repository.FinancialsRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;

class FinancialsServiceTests {

  @TempDir private Path tempDir;

  @Test
  void returnsSeededMonthlyExpenseSnapshot() throws IOException {
    FinancialsService service = new FinancialsService(repository());

    var snapshot = service.getSnapshot();

    assertThat(snapshot.totalMonthlyExpenses()).isCloseTo(1450.00, withinCents());
    assertThat(snapshot.totalTrackedAssets()).isCloseTo(15000.00, withinCents());
    assertThat(snapshot.bills()).isNotEmpty();
    assertThat(snapshot.assetCategories()).hasSize(2);
    assertThat(snapshot.bills().getFirst().bill()).isEqualTo("Example Rent");
  }

  @Test
  void createsUpdatesAndDeletesBill() throws IOException {
    FinancialsService service = new FinancialsService(repository());

    var created = service.addBill(new ExpenseBillRequest("Test Bill", 5, 42.50, "Check", false));
    assertThat(created.bill()).isEqualTo("Test Bill");
    assertThat(created.dueLabel()).isEqualTo("5th");

    var updated =
        service.updateBill(
            created.id(), new ExpenseBillRequest("Updated Bill", 6, 45, "Apple", true));
    assertThat(updated.bill()).isEqualTo("Updated Bill");
    assertThat(updated.amount()).isEqualTo(45);

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
  void savesSnapshotInOneBatch() throws IOException {
    FinancialsService service = new FinancialsService(repository());

    var saved =
        service.saveSnapshot(
            new ExpenseSnapshotRequest(
                LocalDate.of(2026, 6, 12),
                LocalDate.of(2026, 6, 26),
                List.of(
                    new ExpenseBillSnapshotRequest(1L, "Rent", 1, 2600, "Check", true),
                    new ExpenseBillSnapshotRequest(null, "New Bill", 15, 25, "Apple", false)),
                List.of(
                    new AssetCategorySnapshotRequest(
                        "retirement",
                        "Retirement",
                        List.of(
                            new AssetAccountSnapshotRequest(1L, "401k 10%", "Vanguard", 110653.42),
                            new AssetAccountSnapshotRequest(null, "Pension", "Example", 1000))))));

    assertThat(saved.bills()).hasSize(2);
    assertThat(saved.totalMonthlyExpenses()).isCloseTo(2625, withinCents());
    assertThat(saved.totalTrackedAssets()).isCloseTo(111653.42, withinCents());
    assertThat(saved.bills()).anyMatch((bill) -> bill.bill().equals("New Bill") && bill.id() > 0);
    assertThat(saved.assetCategories().getFirst().accounts())
        .anyMatch((account) -> account.account().equals("Pension") && account.id() > 0);
  }

  private FinancialsRepository repository() throws IOException {
    Path dataPath = tempDir.resolve("financials.local.json");
    Path examplePath = tempDir.resolve("financials.example.json");
    Files.writeString(
        examplePath,
        """
        {
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
          ]
        }
        """);
    return new FinancialsRepository(new ObjectMapper(), dataPath, examplePath);
  }

  private org.assertj.core.data.Offset<Double> withinCents() {
    return org.assertj.core.data.Offset.offset(0.01);
  }
}
