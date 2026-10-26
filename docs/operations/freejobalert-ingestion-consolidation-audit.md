# FreeJobAlert Ingestion Consolidation Audit

**Audit date:** 2026-10-26  
**Scope:** repository paths, entrypoints, source identity, persistence boundaries, tests, and scheduling.  
**Status:** Static source review only. No crawler, migration, database write, production job, or test suite was executed as part of this audit.

## Executive decision

JobOye currently has multiple independent FreeJobAlert (FJA) collection and persistence paths. They are not interchangeable, and they do not share one end-to-end contract. Do not enable a schedule or promote the PR #97 pilot to production until one path is selected and the persistence boundary is agreed.

The target should be:

1. **Discover/capture** a bounded set of FJA article URLs and retain immutable HTML + retrieval timestamp + SHA-256.
2. **Extract** through one shared, fixture-tested parser into source-reported candidate facts with field-level evidence and explicit conflicts.
3. **Stage** candidates in one inventory/staging model, keyed by a stable FJA article ID and versioned content hash.
4. **Reconcile** against canonical Recruitment/Post identity without organization/title-only matching or first-post fallback.
5. **Verify** material facts against the official notice; keep FJA and official evidence distinct.
6. **Promote** only reviewed candidates through one explicit, auditable promotion boundary.
7. **Schedule** only one selected collector after pilot, idempotency, conflict, and rollback gates pass.

## Entry-point inventory

| Path | What it does | Persistence / risk | Recommendation |
|---|---|---|---|
| `src/ingest/adapters/freejobalert.ts` | Live homepage/latest-notifications/government-jobs discovery; fetches up to 50 detail pages; uses table parsing plus `parseFreeJobAlertArticle` / `mergeArticleFacts`. | Feeds the general `processRaw` pipeline and its normal posting writer. It is not an immutable capture-first staging path. Source key is `ext-1`. | Keep only if FJA remains an explicitly enabled live adapter. Do not treat it as the staging/promotion system. Gate or disable it during the staged pilot so it cannot run in parallel. |
| `src/enrich/freejobalert-article.ts` + `src/ingest/enrich-facts.ts` | Shared section-based article extractor and fill-only merge with held/review facts. | Good shared logic, but callers use different outer discovery, persistence, and identity conventions. | Retain as the shared parser layer; add fixtures for all known page layouts and explicit conflict behavior. |
| `scripts/capture-fja-pilot.ts` on PR #97 + `src/ingest/adapters/freejobalert-file.ts` | Fixed URL list capture to JSONL; file adapter converts records to `RawPosting` and optionally invokes the shared parser. | Capture itself is local/evidence-only. Replay through `src/ingest/load-file.ts` uses `processRaw`, which writes to the normal JobOye posting pipeline in a **scratch database**. It does not write into the `fja_job_inventory` / `fja_post_inventory` staging model. | Keep as a bounded parser/replay test only. The scratch guard is essential. Do not reinterpret successful replay as proof that a production staging architecture is ready. |
| `src/ingest/load-file.ts` | FJA file replay through the general ingestion pipeline, with scratch-database guard and dry-run/promotion diagnostics. | Writes normal pipeline tables in scratch; `--probe` is a mutating simulation and must not be used on production. | Keep for scratch-only regression/idempotency tests. Validate its flags and exact write behavior before running. |
| `src/ingest/run-file.ts` | Older generic multi-source JSONL replay through `processRaw`. | Default dry-run, but `DRY_RUN=false` enables database writes and there is no local-only guard in this entrypoint. | Mark as legacy/general-purpose; do not use for the FJA pilot. Consider adding the same scratch guard or consolidating it with `load-file.ts`. |
| `scripts/fja-inventory.ts` | Large, separate FJA crawler (pilot/queue/full/window modes), article extraction, post decomposition, content hashing, raw HTML artifact capture, and inventory persistence. | Can write to `public.fja_job_inventory`, `public.fja_post_inventory`, `public.fja_source_captures`, and `public.source_observations`. `FJA_DRY_RUN` must be explicitly set to get no-DB mode; with a DB URL and dry-run off it writes. This is a second full collection + persistence system. | Treat as legacy candidate pending reconciliation with PR #97. Do not run it until its schema and operational status are reconciled. Either deliberately adopt this staging model and adapt PR #97 to feed it, or retire it after data/migration review—do not maintain two competing staging contracts. |
| `scripts/promote-fja-to-canonical.ts` | Reads FJA inventory candidates and sends them through `writePostingsToDB`. | `FJA_PROMOTE_DRY_RUN` is true only when set to `1`; otherwise the script takes the live-write path. It is a separate canonical promotion mechanism. | High-risk legacy entrypoint. Keep disabled operationally; change to explicit write opt-in before reuse, and route approved candidates through one documented promotion API. |
| `src/app/api/ingest/route.ts` | Fetches FJA `/new-updates/` embedded JSON and upserts daily digest rows. Both GET and POST call the same handler. | Writes to `raw_notifications`, not the FJA inventory or canonical post pipeline. Auth requires `CRON_SECRET`. | Treat as a separate digest-only path; decide whether it is needed. Do not confuse it with article-level capture/extraction/reconciliation. |
| `scripts/ingest-daily-digest.py` | Parses a saved digest HTML file and writes to `raw_notifications`. | Second writer for the same digest staging table, with a separate parser and execution path. | Keep only if local digest-file ingestion is a supported workflow; otherwise retire after checking its consumers. |
| `scripts/extract-freejobalert-open-updates.ts` + `.github/workflows/freejobalert-research-extraction.yml` | Research-only crawler of the update listing, saving article evidence and artifacts; supports manual dispatch. | Workflow also triggers on pushes to `main` when the extractor/workflow changes. No DB write is visible in this script path, but a code push can trigger network crawling. | Research utility, not the production ingestion path. Prefer manual dispatch only unless push-triggered research runs are intentionally required. |
| `scripts/snapshot-freejobalert-facts.ts` | Separate research/sitemap snapshot collector; supports explicit URL file or sitemap discovery. | Local evidence files, no DB write in this script. Default `MAX_PAGES` is 100000, so an unconfigured invocation is not a small pilot. | Retain only as a research utility if needed; require explicit bounded input for pilot use. Do not run a broad crawl by default. |
| `scripts/enrich-from-fja.py`, `src/scripts/fja-enrich-run.ts`, `src/scripts/fja-enrich-sql.ts` | Older enrichment/SQL workflows. The Python script can update `posts` and upsert `post_enrichments` when explicitly run with write mode; the SQL script emits post updates. | Additional route for changing canonical post facts outside the candidate verification boundary. | Audit consumers and outputs before reuse. No FJA enrichment write should run during the pilot. |
| `scripts/discover-fja-articles.py`, `scripts/phase2b-fja-discovery-standalone.py`, `scripts/fetch-fja-for-fixed-orgs.py`, `scripts/export-fja-inventory.py`, `scripts/fja-normalize.ts` | Earlier discovery, fixed-organization extraction, export, and normalization utilities. | Overlapping research formats and partial extraction logic; some may still be useful as one-off tools. | Inventory owners/consumers and mark supported vs archived. Do not add more parallel entrypoints. |

## Concrete conflicts found

### 1. Source identity is inconsistent

- Live adapter and file adapter use `source = "ext-1"`.
- Inventory and observation writes use `source_slug/source = "freejobalert"`.
- Digest rows are keyed by `digest_date + source_url`.
- The inventory candidate identity is `source_slug + external_id + source_post_key`.

These are different identity domains. The same FJA article can be represented in the general posting pipeline, the inventory tables, source observations, and digest table without a shared reconciliation key. Adopt one normalized source name and a documented crosswalk; use the numeric FJA article ID as source identity, but never as canonical JobOye identity.

### 2. Two different persistence architectures compete

- PR #97's file replay goes through the general JobOye ingestion pipeline and its normal posting tables, albeit on scratch and with review status safeguards.
- The older `fja-inventory.ts` path writes separate FJA inventory and post-candidate tables, then `promote-fja-to-canonical.ts` is a second step into the general posting writer.

The second path better matches a strict source-evidence → candidate staging → official verification → promotion boundary. The PR #97 replay is still valuable for testing parser behavior and general pipeline compatibility, but it is not evidence that the inventory-stage design has been replaced. Architecture must choose one canonical pilot contract.

### 3. The parser is shared, but field precedence differs by caller

The live adapter extracts labelled-table facts first, then calls `mergeArticleFacts` to fill missing fields and hold some suspicious values. The file adapter builds fields from flattened rows, then optionally merges article facts from captured HTML. The inventory crawler has its own detailed `detailFields` / post-candidate extraction and calls the shared article parser as an additional source.

A value can therefore be present, absent, or treated as authoritative depending on the capture format and caller. Normalize all callers to one extraction envelope: raw source value, normalized candidate, source URL/hash, section/table evidence, parser version, confidence/review state, and conflict set. Do not let a merge silently erase contradictory values.

### 4. The promotion boundary is not uniform

- General `processRaw` writes through the standard posting pipeline.
- `promote-fja-to-canonical.ts` can invoke `writePostingsToDB` directly and is live by default unless `FJA_PROMOTE_DRY_RUN=1` is set.
- `scripts/enrich-from-fja.py` has a separate explicit `--write` route that updates canonical post data and enrichment rows.
- `src/ingest/run-file.ts` can write when `DRY_RUN=false`, without the local-only guard used by `load-file.ts`.

These paths make it difficult to guarantee that all FJA-derived facts pass through the same review/verification gate. Keep them unused until their guardrails and consumers are explicitly reviewed.

### 5. Scheduler and documentation drift

- `vercel.json` currently has an empty `crons` array.
- The API route comments describe a daily schedule, but the repository does not currently configure a Vercel cron for it.
- The current workflow is research-only and has a push trigger for changes to the research extractor; it is not a daily production scheduler.
- `docs/FJA_PILOT_RUNBOOK_V2.md` refers to `.github/workflows/fja-jobs-inventory.yml`, but that workflow path is not present in the current main-branch tree.
- The inventory migrations exist in Git, but the recent connected-project schema inspection did not find `public.fja_job_inventory`, `public.fja_post_inventory`, or `public.fja_source_captures` in the connected Supabase project. Treat the migration/runtime state as unresolved until migration history and the target database are reconciled.

There is no verified active daily scheduler in the current repository state. Do not add one until the staging path is selected and validated.

## Recommended consolidation plan

### Phase A — Freeze and choose

1. Keep PR #97 draft and bounded. Do not run it against any remote database.
2. Select one pilot persistence contract: **preferred target is a dedicated source inventory/staging layer**, with no canonical publication during capture or extraction.
3. Confirm whether the existing FJA inventory tables/migrations are still the intended model. Compare committed migrations with the connected database's migration history before applying anything.
4. Temporarily designate the legacy direct promotion and enrichment entrypoints as unsupported for this pilot; do not delete their data or migrations yet.

### Phase B — One capture and parser path

1. Keep the PR #97 fixed-URL capture as the evidence acquisition step, after engineering verifies it runs and respects source access controls.
2. Adapt the file adapter to feed the selected staging contract rather than the general posting writer if inventory staging is chosen.
3. Use one parser and one extraction envelope. Preserve raw HTML, hash, capture time, parser version, and per-fact evidence.
4. Add fixture tests for date conflicts, vacancy-total/table-sum mismatch, multiple posts, missing official links, social/aggregator URLs, and unchanged/changed capture hashes.
5. Ensure one article ID produces one inventory identity and one observation per content hash.

### Phase C — One reconciliation/promotion path

1. Match using stable source ID plus official advertisement/notice identity and explicit canonical relationships; never organization/title alone.
2. Keep conflicting source facts as held observations; resolve important dates/vacancy counts against official notices.
3. Require a reviewed candidate state and explicit write opt-in for promotion.
4. Route canonical changes through one promotion function and preserve an audit trail.

### Phase D — Retire duplicates after evidence

1. Search logs, GitHub Actions history, database migration history, and operational documentation for consumers of legacy scripts.
2. Retire duplicate digest writers if `raw_notifications` is not needed; otherwise define the digest path as a separate discovery-only product with one writer.
3. Archive or remove redundant research collectors only after their outputs are accounted for.
4. Remove stale workflow references and document the one supported command for capture, replay, review, and promotion.
5. Configure exactly one scheduler only after a successful scratch run, a second-run idempotency check, a changed-content test, and an approved rollback procedure.

## What was not done

- No script was executed and no network crawl was started.
- No migrations or database changes were applied.
- No production data was written or published.
- No source entrypoint was deleted or disabled by this audit.
- PR #97 remains a separate draft and was not changed by this audit.

The immediate decision is architectural, not just cleanup: choose whether the FJA pilot writes into the dedicated inventory staging model or the general posting pipeline. Once that is locked, the duplicate entrypoints can be retired safely instead of deleting a path that may still hold operational data or dependencies.
