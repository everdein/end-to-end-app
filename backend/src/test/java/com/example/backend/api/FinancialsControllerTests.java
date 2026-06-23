package com.example.backend.api;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
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
    FinancialsService financialsService = mock(FinancialsService.class);
    MockMvc mockMvc = mockMvc(financialsService);

    mockMvc
        .perform(
            post("/api/financials/expenses")
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
  void mapsResponseStatusExceptionsToProblemDetails() throws Exception {
    FinancialsService financialsService = mock(FinancialsService.class);
    doThrow(new ResponseStatusException(HttpStatus.NOT_FOUND, "Bill not found"))
        .when(financialsService)
        .deleteBill(99);
    MockMvc mockMvc = mockMvc(financialsService);

    mockMvc
        .perform(delete("/api/financials/expenses/99"))
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
}
