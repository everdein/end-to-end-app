package com.example.backend.repository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;

@Repository
public class FinancialsRepository {

  private final AtomicLong nextId = new AtomicLong(1);
  private final AtomicLong nextAssetId = new AtomicLong(1);
  private final ObjectMapper objectMapper;
  private final Path dataPath;
  private final Path examplePath;
  private final List<ExpenseBill> bills = new ArrayList<>();
  private final List<AssetAccount> assetAccounts = new ArrayList<>();
  private LocalDate payPeriodStart = LocalDate.now().withDayOfMonth(1);
  private LocalDate payPeriodEnd = LocalDate.now().withDayOfMonth(15);

  public FinancialsRepository(
      ObjectMapper objectMapper,
      @Value("${financials.data.path:data/financials.local.json}") Path dataPath,
      @Value("${financials.example-data.path:data/financials.example.json}") Path examplePath) {
    this.objectMapper = objectMapper;
    this.dataPath = dataPath;
    this.examplePath = examplePath;
    load();
  }

  public synchronized List<ExpenseBill> findAllBills() {
    return bills.stream().sorted(Comparator.comparingInt(ExpenseBill::dueDay)).toList();
  }

  public synchronized List<AssetAccount> findAllAssetAccounts() {
    return List.copyOf(assetAccounts);
  }

  public synchronized ExpenseBill addBill(ExpenseBill bill) {
    ExpenseBill created = bill.withId(nextId.getAndIncrement());
    bills.add(created);
    persist();
    return created;
  }

  public synchronized Optional<ExpenseBill> updateBill(long id, ExpenseBill bill) {
    for (int index = 0; index < bills.size(); index++) {
      if (bills.get(index).id() == id) {
        ExpenseBill updated = bill.withId(id);
        bills.set(index, updated);
        persist();
        return Optional.of(updated);
      }
    }

    return Optional.empty();
  }

  public synchronized boolean deleteBill(long id) {
    boolean removed = bills.removeIf((bill) -> bill.id() == id);
    if (removed) {
      persist();
    }
    return removed;
  }

  public synchronized void replaceSnapshot(
      LocalDate startDate,
      LocalDate endDate,
      List<ExpenseBill> replacementBills,
      List<AssetAccount> replacementAssetAccounts) {
    bills.clear();
    for (ExpenseBill bill : replacementBills) {
      long id = bill.id() > 0 ? bill.id() : nextId.getAndIncrement();
      bills.add(bill.withId(id));
      nextId.updateAndGet((current) -> Math.max(current, id + 1));
    }

    assetAccounts.clear();
    for (AssetAccount account : replacementAssetAccounts) {
      long id = account.id() > 0 ? account.id() : nextAssetId.getAndIncrement();
      assetAccounts.add(account.withId(id));
      nextAssetId.updateAndGet((current) -> Math.max(current, id + 1));
    }

    payPeriodStart = startDate;
    payPeriodEnd = endDate;
    persist();
  }

  public synchronized LocalDate payPeriodStart() {
    return payPeriodStart;
  }

  public synchronized LocalDate payPeriodEnd() {
    return payPeriodEnd;
  }

  public synchronized void updatePayPeriod(LocalDate startDate, LocalDate endDate) {
    payPeriodStart = startDate;
    payPeriodEnd = endDate;
    persist();
  }

  private void load() {
    try {
      ensureDataFile();
      FinancialsData data = objectMapper.readValue(dataPath.toFile(), FinancialsData.class);
      payPeriodStart = data.payPeriodStart();
      payPeriodEnd = data.payPeriodEnd();
      bills.clear();
      bills.addAll(data.bills());
      assetAccounts.clear();
      assetAccounts.addAll(data.assetAccounts());
      resetNextIds();
    } catch (IOException exception) {
      throw new IllegalStateException("Unable to load financial data from " + dataPath, exception);
    }
  }

  private void ensureDataFile() throws IOException {
    Path parent = dataPath.getParent();
    if (parent != null) {
      Files.createDirectories(parent);
    }

    if (Files.exists(dataPath)) {
      return;
    }

    if (Files.exists(examplePath)) {
      Files.copy(examplePath, dataPath);
      return;
    }

    persist();
  }

  private void persist() {
    try {
      Path parent = dataPath.getParent();
      if (parent != null) {
        Files.createDirectories(parent);
      }
      objectMapper
          .writerWithDefaultPrettyPrinter()
          .writeValue(
              dataPath.toFile(),
              new FinancialsData(payPeriodStart, payPeriodEnd, bills, assetAccounts));
    } catch (IOException exception) {
      throw new IllegalStateException("Unable to save financial data to " + dataPath, exception);
    }
  }

  private void resetNextIds() {
    long maxBillId = bills.stream().mapToLong(ExpenseBill::id).max().orElse(0);
    long maxAssetId = assetAccounts.stream().mapToLong(AssetAccount::id).max().orElse(0);
    nextId.set(maxBillId + 1);
    nextAssetId.set(maxAssetId + 1);
  }

  public record FinancialsData(
      LocalDate payPeriodStart,
      LocalDate payPeriodEnd,
      List<ExpenseBill> bills,
      List<AssetAccount> assetAccounts) {}
}
