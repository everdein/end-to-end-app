create table if not exists financial_snapshot_document (
    id bigint generated always as identity primary key,
    active boolean not null default true,
    version bigint not null default 1,
    snapshot_json jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists uq_financial_snapshot_document_active
    on financial_snapshot_document (active)
    where active;
