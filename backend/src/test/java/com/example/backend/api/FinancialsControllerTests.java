package com.example.backend.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend.service.FinancialsService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
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
  }
}
