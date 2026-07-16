# 0028 Retire legacy snapshot migration administration

## Status

Accepted - implemented 2026-07-15

## Context

ADR 0014 made authenticated, workspace-scoped PostgreSQL relational tables the
only runtime persistence path. The repository temporarily retained the V2
JSONB document table, a V7 migration ledger, operator-only migration endpoints,
and guarded rollback scripts so an owner could preserve an older application
snapshot while adopting the relational workspace.

The repository owner has an independent source for re-entry and explicitly
waived recovery from the obsolete local JSON, JSONB document, unowned
relational rows, and migration ledger. Keeping that administration would add a
second data shape, Basic-authenticated endpoints, recovery scripts, repository
code, and tests for a transition that no longer has a supported caller.

## Decision

Retire legacy snapshot migration administration completely:

- Remove the migration controller, service, repository, DTOs, domain records,
  exception mapping, PowerShell migration/rollback scripts, and dedicated
  tests.
- Deny the `/api/v1/admin/**` namespace and retain Basic authentication only
  for protected metrics.
- Add Flyway V10 to drop `financial_snapshot_workspace_migration`, remove
  `source_document_id`, and drop `financial_snapshot_document`. Add V11 to
  delete unowned relational snapshots, remove their compatibility index and
  check, and make `financial_record_snapshot.workspace_id` non-null.
- Keep V1 through V9 immutable as historical Flyway evidence.
- Initialize the owner's empty workspace normally and re-enter current values
  from the independent source through the authenticated application.

## Consequences

- Applying V10/V11 irreversibly removes legacy JSONB, migration-ledger, and
  unowned relational data in that database. This is intentional and
  owner-approved; these migrations must not be applied where those sources
  still require recovery.
- PostgreSQL relational workspaces become the sole executable persistence
  model, and every financial snapshot has database-enforced workspace
  ownership.
- The application loses an unused operator attack surface and a substantial
  compatibility/test burden.
- Application JSON export and version-checked restore remain the supported
  user-level backup path; production database backups and restore drills remain
  separate deployment work.
