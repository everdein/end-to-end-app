drop table financial_snapshot_workspace_migration;

alter table financial_record_snapshot
    drop column source_document_id;

drop table financial_snapshot_document;
