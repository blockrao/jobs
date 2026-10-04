# WP-001 pre-data safety gate: tested backup and restore

Status: PROCEDURE, 2026-10-04. Approved in principle by the architect
(WP-001 Approval and Direction, section 8). Not yet run. **No production data
write until this gate passes and the result is recorded below.**

## Scorecard

| Item | Result |
| --- | --- |
| Gate | Dump completes, restore succeeds, counts and checksums match, backup retained |
| Run by | Owner, on his Mac. The database URL stays local; it is never given to the agent or committed |
| Compared by | Same SQL (`WP001_BACKUP_VERIFY.sql`) run on live (agent via connector, read only) and on the scratch restore (owner) |
| Status | NOT RUN |

## Steps (Mac, Terminal)

Needs Postgres 17 client tools and a scratch server (for example
`brew install postgresql@17`). Use a scratch server only, never the live URL
as a restore target.

1. Keep the URL in a local variable only:
   `read -s LIVE_URL` (paste the Supabase connection string, press Enter).
2. Dump (data and schema, public schema; Supabase-managed schemas are not needed):
   `pg_dump "$LIVE_URL" --schema=public --no-owner --no-privileges -Fc -f ~/supabase-dumps/jobs_$(date +%Y%m%d_%H%M).dump`
   Success: exit code 0 and a non-empty file. Check with
   `pg_restore --list <file> | head`.
3. Start a scratch database:
   `createdb jobs_restore_test` (local server).
4. Restore:
   `pg_restore --no-owner --no-privileges -d jobs_restore_test <file>`
   Errors about missing Supabase roles or extensions are noted, not ignored:
   copy them into the result below.
5. Run `WP001_BACKUP_VERIFY.sql` on the scratch database:
   `psql jobs_restore_test -f WP001_BACKUP_VERIFY.sql`
   and paste the output to the agent. The agent runs the same file on live
   through the read-only connector and compares line by line.
6. Retain the dump file (do not delete `~/supabase-dumps`). Record file name,
   size and date in the result block.
7. Repeat steps 2 to 6 immediately before the first production write (recovery
   point) and before any merge.

## Pass criteria

- Dump exit code 0, restore finishes, no unexplained errors.
- Exact row count equal for every public table.
- Checksum equal for the core tables (`organizations`, `postings`,
  `recruitments`, `source_documents`, `sources`).
- If live changed between dump and comparison (the daily ingest or lifecycle
  cron), counts may differ; then the dump is taken and compared in the same
  few minutes, or the difference is explained by `updated_at` and `created_at`.

## Also confirm

Supabase dashboard > Database > Backups: does the project have managed
backups? (Plan reads `free`; inferred none.) Record the answer here.

## Result (fill in after the run)

| Field | Value |
| --- | --- |
| Dump file / size / date | |
| Restore errors | |
| Counts match | |
| Checksums match | |
| Managed backups present | |
| Gate passed (date) | |
