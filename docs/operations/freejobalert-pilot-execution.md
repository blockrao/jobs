# FJA pilot execution — scratch only

This is the next milestone after the read-only feasibility review. It captures the exact reviewed 12-article sample, runs the existing file adapter and shared ingestion pipeline against a local scratch database, and compares the first and second run. It does not enable production scheduling or publish jobs.

## 1. Capture full HTML evidence

From the repository root, with Node dependencies installed:

```bash
npx tsx scripts/capture-fja-pilot.ts --out /tmp/fja-pilot.jsonl
```

The script is allowlisted to the 12 reviewed FreeJobAlert article URLs. It stores one JSONL record per successful capture, including the original URL, numeric article ID, fetched timestamp, parsed table rows, labelled links, full HTML and SHA-256 hash. It also writes `/tmp/fja-pilot.jsonl.report.json` with successes, failures and byte counts. It does not access the database.

Review the capture report first. A failed capture is a visible failure, not a reason to silently shrink the sample. Respect current source access rules; stop if access is denied or rate-limited.

## 2. Create a local scratch database

Use a disposable local PostgreSQL database with the JobOye schema/migrations and the minimum seed data required by the pipeline. Do not point `DATABASE_URL` at Supabase, staging, preview, or production. The WP-001 guard rejects remote hosts by default.

## 3. Run the real pipeline twice

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/joboye_scratch \
  npx tsx src/ingest/load-file.ts \
  --file /tmp/fja-pilot.jsonl \
  --out /tmp/fja-pilot-run1.json

DATABASE_URL=postgres://postgres:postgres@localhost:5432/joboye_scratch \
  npx tsx src/ingest/load-file.ts \
  --file /tmp/fja-pilot.jsonl \
  --out /tmp/fja-pilot-twice.json \
  --twice
```

The `--twice` option runs the same in-memory source batch through the shared pipeline twice and records the second-run action counts. It is suitable only for the disposable scratch database. Do not pass `--probe`; that mode performs promotion and time-travel simulation. Do not set `WP001_ALLOW_REMOTE_DB=yes`.

Use a fresh scratch database for the first-run baseline. The second command should be run on a separate, reset scratch database if you need comparable first-run counts; alternatively, run only the first command on the same scratch DB and use its `--twice` option for the replay check.

## 4. Required review of JSON reports

Compare:

- input record count, captured count, failures and article IDs;
- organization resolutions, held candidates and rejected records;
- source observations, insert/update/unchanged counts and all changed fields;
- post-table rows versus stated recruitment totals;
- missing and conflicting dates, including ASMC Bahraich, Burari Hospital and IRCON;
- official notification, application and issuer website URL classification;
- second-run inserted/updated/unchanged counts and all database table counts.

A successful idempotency run must not create additional source identities or canonical recruitment/post duplicates for unchanged source records. Existing-row updates must be explainable and limited to approved fields. Vacancy totals and post-level vacancy counts must remain distinct. Conflicting dates and unresolved organization identities must remain held for review.

## 5. Exit criteria

Do not advance to production scheduling until:

1. All 12 captures succeed or each failure has a documented, resolved cause and an explicitly approved replacement.
2. The real parser has been executed against captured HTML; extraction results are compared to the source and contradictions are preserved.
3. Canonical matching is evidence-based and every candidate receives a reconciliation class.
4. The same dataset is replayed twice in scratch and the second run is idempotent.
5. Scratch table counts and proposed changes reconcile, with zero unexpected public/approved publication.
6. A human-readable report lists blockers and is reviewed before any production write is considered.

## Important limitation

The capture script and run commands are committed as implementation scaffolding. They have not been executed by this ChatGPT session because no repository shell or local scratch PostgreSQL runtime is available through the connected GitHub/Supabase tools. Do not treat the existence of the script as a passing test; engineering must run it in the repository environment and attach the generated reports.
