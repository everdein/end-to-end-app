package com.example.backend.api;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.dto.financials.ExpenseBillSnapshotRequest;
import com.example.backend.dto.financials.ExpenseSnapshotRequest;
import com.example.backend.dto.financials.FinancialSnapshotExportResponse;
import com.example.backend.service.FinancialsService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.server.ResponseStatusException;

class FinancialsControllerTests {

  @Test
  void rejectsInvalidBillRequestWithProblemDetails() throws Exception {
    MockMvc mockMvc = mockMvc(new TestFinancialsService());

    mockMvc
        .perform(
            post("/api/v1/financials/bills")
                .contentType("application/json")
                .content(
                    """
                        {
                          "bill": "",
                          "dueDay": 32,
                          "amount": -1,
                          "account": "",
                          "paid": false
                        }
                        """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.title").value("Invalid request"))
        .andExpect(jsonPath("$.errors").isArray());
  }

  @Test
  void rejectsBillRequestWithoutAmount() throws Exception {
    MockMvc mockMvc = mockMvc(new TestFinancialsService());

    mockMvc
        .perform(
            post("/api/v1/financials/bills")
                .contentType("application/json")
                .content(
                    """
                        {
                          "bill": "Internet",
                          "dueDay": 15,
                          "account": "Check",
                          "paid": false
                        }
                        """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.title").value("Invalid request"))
        .andExpect(jsonPath("$.errors").isArray());
  }

  @Test
  void mapsResponseStatusExceptionsToProblemDetails() throws Exception {
    MockMvc mockMvc = mockMvc(new TestFinancialsService());

    mockMvc
        .perform(delete("/api/v1/financials/bills/99"))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.detail").value("Bill not found"));
  }

  @Test
  void rejectsSnapshotSaveWithoutVersion() throws Exception {
    MockMvc mockMvc = mockMvc(new TestFinancialsService());

    mockMvc
        .perform(
            put("/api/v1/financials")
                .contentType("application/json")
                .content(
                    """
                        {
                          "payPeriodStart": "2026-06-12",
                          "payPeriodEnd": "2026-06-26",
                          "bills": [],
                          "annualWithdrawals": [],
                          "assetCategories": [],
                          "debtAccounts": [],
                          "incomeSummaryItems": [],
                          "incomeEvents": [],
                          "importantDates": []
                        }
                        """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.title").value("Invalid request"))
        .andExpect(jsonPath("$.errors").isArray());
  }

  @Test
  void exportsSnapshotBackupAsNoStoreAttachment() throws Exception {
    MockMvc mockMvc = mockMvc(new TestFinancialsService());

    mockMvc
        .perform(get("/api/v1/financials/export"))
        .andExpect(status().isOk())
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
        .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
        .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("attachment")))
        .andExpect(
            header()
                .string(
                    HttpHeaders.CONTENT_DISPOSITION, containsString("financial-snapshot-v7.json")))
        .andExpect(jsonPath("$.format").value("end-to-end-app.financial-snapshot.v1"))
        .andExpect(jsonPath("$.exportedAt").value("2026-07-11T10:15:30Z"))
        .andExpect(jsonPath("$.snapshot.version").value(7))
        .andExpect(jsonPath("$.snapshot.bills[0].bill").value("Rent"))
        .andExpect(jsonPath("$.snapshot.bills[0].dueLabel").doesNotExist());
  }

  private MockMvc mockMvc(FinancialsService financialsService) {
    LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
    validator.afterPropertiesSet();
    return MockMvcBuilders.standaloneSetup(new FinancialsController(financialsService))
        .setControllerAdvice(new ApiExceptionHandler())
        .setValidator(validator)
        .build();
  }

  private static class TestFinancialsService extends FinancialsService {

    TestFinancialsService() {
      super(null);
    }

    @Override
    public void deleteBill(long id) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bill not found");
    }

    @Override
    public FinancialSnapshotExportResponse exportSnapshot() {
      return new FinancialSnapshotExportResponse(
          "end-to-end-app.financial-snapshot.v1",
          Instant.parse("2026-07-11T10:15:30Z"),
          new ExpenseSnapshotRequest(
              7L,
              LocalDate.of(2026, 7, 1),
              LocalDate.of(2026, 7, 14),
              List.of(
                  new ExpenseBillSnapshotRequest(
                      1L, "Rent", 1, new BigDecimal("2600.00"), "Check", false)),
              List.of(),
              List.of(),
              List.of(),
              List.of(),
              List.of(),
              List.of()));
    }
  }
}
