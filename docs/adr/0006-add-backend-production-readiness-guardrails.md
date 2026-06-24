# 0006 Add Backend Production Readiness Guardrails

## Status

Accepted

## Context

The financials feature stores sensitive personal finance data and now has a
larger snapshot API surface. Before adding more features, the backend needs
stronger guardrails around data correctness, persistence safety, API
compatibility, and regression detection.

## Decision

Use `/api/v1/financials` as the versioned financial snapshot resource. Keep
granular bill operations under `/api/v1/financials/bills`.

Represent backend money values with `BigDecimal` in request DTOs, response
DTOs, repository records, and service totals. The frontend still receives JSON
numbers and can continue using TypeScript `number` until a future frontend
cents-based model is needed.

Validate request DTOs at the controller boundary with Bean Validation and
return consistent Problem Details-style API errors through centralized
controller advice.

Persist local JSON snapshots by writing a temporary file, backing up the last
saved snapshot, and replacing the live file atomically when the filesystem
supports it.

Enforce backend line coverage with JaCoCo during Maven verification. Compile
and run the backend on Java 21 LTS so current JaCoCo tooling can analyze the
generated class files reliably.

## Consequences

- Backend money calculations avoid binary floating-point drift.
- API clients get a clearer, versioned financials contract.
- Invalid requests fail earlier with a consistent error shape.
- Local snapshot writes are less likely to leave a corrupted file after a
  failed save.
- Coverage regressions can block CI instead of silently lowering confidence.
- Language features beyond Java 21 should be avoided until the project chooses
  to move beyond the Java 21 LTS baseline and coverage tooling supports that
  class file version directly.
