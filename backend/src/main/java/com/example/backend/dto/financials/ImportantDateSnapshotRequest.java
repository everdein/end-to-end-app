package com.example.backend.dto.financials;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record ImportantDateSnapshotRequest(
    Long id,
    @NotNull(message = "Important date is required") LocalDate date,
    @NotBlank(message = "Important date event is required") String event,
    @NotBlank(message = "Important date type is required") String type) {}
