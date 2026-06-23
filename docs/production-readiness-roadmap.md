# Production Readiness Roadmap

This roadmap tracks the code review findings that should not get lost between
feature work. Items are ordered by expected return on investment and production
risk reduction.

## Phase 1 - Do Now

- [x] Make Snyk fail CI on high-severity issues instead of reporting only.
- [x] Add frontend coverage thresholds so test coverage cannot quietly regress.
- [x] Document the current API as a financial snapshot aggregate, even while the
      existing routes still include `expenses`.
- [x] Add projection unit tests for rent reserves, debt payoff, HYSA transfer,
      annual withdrawals, next pay period math, and date edge cases.
- [x] Extract projection logic from `FinancialsPage.tsx` into a pure domain
      module.
- [x] Replace fragile label guessing with protected projection anchors for rent,
      rent reserve, and primary paycheck rows.

## Phase 2 - Before Real Users

- [ ] Replace floating-point money values with integer cents or `BigDecimal`.
- [ ] Add DTO validation with `@Valid` and Bean Validation annotations.
- [ ] Centralize API error handling with consistent problem responses.
- [ ] Rename API routes to snapshot-oriented endpoints such as
      `/api/financials/snapshot`.
- [ ] Make local JSON writes atomic and keep a last-known-good backup.
- [ ] Add controller and persistence tests.
- [ ] Improve modal accessibility with focus management, Escape handling, and
      focus return.

## Phase 3 - Production Readiness

- [ ] Add authentication and authorization for all financial APIs.
- [ ] Move persistence to PostgreSQL with migrations and transactions.
- [ ] Add optimistic concurrency or snapshot versioning.
- [ ] Add end-to-end tests for core financial workflows.
- [ ] Add backend coverage reporting and thresholds.
- [ ] Harden CI/CD with dependency review, CodeQL, cache consistency, PR coverage
      summaries, and better job independence.
- [ ] Add production configuration guardrails for CORS, actuator exposure,
      logging, request size limits, and secure defaults.

## Phase 4 - Future Scaling

- [ ] Introduce API versioning before external clients depend on the contract.
- [ ] Add audit/history support for financial changes and projections.
- [ ] Add recurring income/payday generation.
- [ ] Add CSV/XLSX import and export tooling.
- [ ] Add observability with structured logs, request IDs, frontend error
      reporting, and basic metrics.
- [ ] Split frontend draft state by domain feature.
- [ ] Add multi-user support after auth and database foundations are mature.

## Current Priority

Start with Phase 1 in this order:

1. Snyk and coverage CI gates.
2. Snapshot terminology in documentation.
3. Projection logic extraction plus focused unit tests.
4. Protected projection anchors to remove fragile label guessing.
