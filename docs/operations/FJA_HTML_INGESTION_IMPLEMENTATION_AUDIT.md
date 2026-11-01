# FJA HTML ingestion — current implementation audit and activation blockers

**Audit basis:** read-only source inspection of `main` at `85ec65f82b1adbb5ebe79609805cbd4630bfd8a3` on 2026-11-01.  
**Status:** Activation blocked pending implementation and pilot evidence.

## Confirmed findings

1. `.github/workflows/freejobalert-research-extraction.yml` runs `scripts/extract-freejobalert-open-updates.ts`. It is research-only and exports artifacts; it does not write JobOye canonical records.
2. `src/app/api/ingest/route.ts` fetches FJA `/new-updates/` HTML, parses embedded JSON and upserts into `raw_notifications`. It does not fetch individual article pages, reconcile canonical entities or verify Hub/Leaf pages. Its `official_pdf_url` is only a URL string stored from the page data; this workflow must not fetch or parse that PDF.
3. `src/ingest/adapters/freejobalert.ts` reads three listing sources with a three-page listing cap and a 50-detail cap, then creates `RawPosting` inputs for the shared ingestion pipeline. This is not a complete backlog crawler or the approved daily incremental process.
4. `scripts/promote-fja-to-canonical.ts` calls `writePostingsToDB()`. The writer inserts/updates primary imported rows in `public.postings`; `src/ingest/promotion.ts` changes publication state on `postings`. The promotion script subsequently reads inferred relationships to `recruitments` and `posts` to construct page URLs. This does not yet prove that canonical Hub/Leaf entities and public page consumers are correct. Do not use this path for bulk promotion until audited and corrected.
5. `src/ingest/load-file.ts` uses the shared writer. Its `--probe` option deliberately mutates publication/lifecycle state for simulation and is restricted to a disposable local scratch database.
6. `.github/workflows/fja-canonical-promotion.yml` is manually dispatched with explicit write confirmations. It is not a daily schedule. The research workflow is read-only. The older daily runbook records an empty Vercel cron list at its audit time; re-check current deployment configuration before claiming any schedule is active.
7. Repository migrations and `src/db/fja-schema.ts` define FJA inventory tables, but the older daily runbook records that they were absent from a prior connected production-schema inspection. Confirm actual production migration state and table availability read-only.

## Required next actions

1. Audit the prior failed ingestion end to end: schema, writer, transaction boundaries, source URL persistence, Recruitment/Post relationships, publication state, public query filters and route rendering.
2. Decide whether to adapt the private FJA inventory and create a new canonical writer, or safely refactor the existing writer. Do not assume the current `postings` writer is suitable.
3. Run 5–10 representative FJA HTML articles through extraction and read-only duplicate reconciliation.
4. Implement/test canonical writes to `recruitments` and `posts`, with at least one linked Post Leaf per accepted recruitment.
5. Verify public API and rendered Hub/Leaf URLs before considering any larger backfill.
6. Only after pilot acceptance, build and activate daily incremental discovery with overlap, persisted watermark, retry queue, idempotency and alerts.

## Source restriction

The new FJA programme is HTML-only. No official notification PDF is to be fetched, downloaded, opened, parsed, OCR-ed or used as an extraction fallback. External links found in FJA HTML are stored as candidates with provenance; they are not independently verified by this process.

## Decision

**Do not activate the existing promotion workflow or daily scheduling for this programme yet.** The extraction foundation exists, but the current code inspected does not demonstrate the complete canonical-to-public-page delivery contract.
