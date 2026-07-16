delete from financial_record_snapshot
where workspace_id is null;

drop index uq_financial_record_snapshot_active_unowned;

alter table financial_record_snapshot
    drop constraint ck_financial_record_snapshot_workspace_required,
    alter column workspace_id set not null;
