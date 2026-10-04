-- Rollback for 20261004184250_a_070_recruitment_official_link_provenance.sql. Never applied automatically.
-- Drops the provenance column. Link values copied onto recruitments by the A-070
-- data promotion are restored from backup_20261005.recruitments (see A070 record).
alter table public.recruitments drop column if exists official_link_source;
