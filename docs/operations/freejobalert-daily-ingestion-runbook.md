# JobOye — FreeJobAlert Daily Ingestion Runbook

**Status:** Controlled pilot / no production promotion  
**Owner:** JobOye product + engineering  
**Source role:** FreeJobAlert (FJA) is a discovery and extraction source, not the authority of record. Official notifications and amendments remain authoritative.

## Objective

Run a repeatable daily process that discovers new or changed FJA articles, captures the source, extracts structured facts, reconciles each candidate against canonical recruitment hubs and posts, and produces an auditable import plan. No candidate is written to or published in canonical production tables during the pilot.

## Canonical identity rules

- Recruitment hubs own recruitment-level facts: organization, advertisement/notification identity, total recruitment vacancies, overall application window, official notification and recruitment-wide instructions.
- Post leaves own role-specific facts: post title/code, role vacancy count, qualification, experience, age rules, pay, selection requirements and role-specific deadlines where applicable.
- Match in this order: stable FJA article ID/source URL; exact official advertisement or notification number plus organization; official notification URL/document identity; then organization plus normalized recruitment title, dates and role evidence.
- Fuzzy title similarity is evidence for review, never the sole automatic merge criterion.
- Preserve original URLs. Canonicalize host/default port/trailing slash conservatively; retain query parameters unless known tracking-only parameters are explicitly allowlisted. Never lowercase URL paths or drop all query parameters blindly.
- Do not use inferred post/recruitment relationships as canonical identity. Explicit canonical IDs and the canonical recruitments/posts relationship take precedence.
- Shared FJA article URLs or shared portal URLs do not prove that all roles are the same post. One recruitment may have many role/post records.
- Never create a “first post” fallback, self-redirect, or duplicate hub to make a candidate fit.

## Daily workflow

### 1. Discover

- Retrieve https://www.freejobalert.com/new-updates/ and https://www.freejobalert.com/latest-notifications/.
- Extract article links matching /articles/<slug>-<numeric-id> and deduplicate discovery by numeric article ID while retaining the exact source URL.
- Track last successful crawl, source update timestamp, discovered IDs, failed URLs and pagination/crawl caps.
- Respect site access rules, identify the crawler honestly, throttle requests, retry transient errors with backoff, and stop on persistent access/rate-limit errors.
- Do not assume the first 50 links are the whole feed. Report caps and overflow explicitly.

### 2. Capture source evidence

For every candidate, retain exact FJA article URL and numeric external ID; fetch timestamp, HTTP status and content type; source update date if available; complete raw HTML or a clearly labelled capture failure; content hash; parser version and run ID; extracted links with labels and hostnames; and source text for fields not mapped into normalized columns.

A concatenation of title/description/eligibility is not a substitute for full HTML capture. A changed content hash should create a new observation and field-level diff, not an uncontrolled duplicate job.

### 3. Extract and normalize

Use the existing FJA adapter and article parser where compatible. Extract recruitment facts and role-level facts separately. Preserve raw source strings and normalize only when supported by explicit evidence.

- Dates: ISO date/timestamp with explicit interpretation of date-only values; retain original source text.
- Salary: numeric min/max, currency INR, and separate period (HOUR, DAY, WEEK, MONTH, YEAR) when explicit. Keep stipend context distinct from regular salary.
- Age: numeric bounds only when explicit; preserve reference date and relaxation rules separately.
- Vacancies: keep recruitment total separate from the sum of post-level vacancy counts; flag mismatches and partial tables.
- Links: distinguish exact official notification document, official recruitment page, application portal, and FJA article. A generic official homepage is not an exact notification.
- Missing values remain unknown. Do not infer official URLs, vacancies, dates or qualifications.
- Retain unparsed sections, held/review flags and unmapped fields in the report.

### 4. Reconcile against canonical data

Build a read-only candidate match report using canonical recruitment IDs/slugs and recruitment identity fields; canonical post IDs, role title/code, recruitment relationship and role facts; source IDs/URLs, official notification URLs, advertisement numbers and aliases; and redirects/prior ingestion observations where relevant.

Classify each candidate as one of:
1. EXISTING_RECRUITMENT_EXISTING_POST
2. EXISTING_RECRUITMENT_NEW_POST
3. NEW_RECRUITMENT_NEW_POST
4. DUPLICATE_SOURCE_OBSERVATION
5. AMBIGUOUS_REVIEW
6. REJECTED_INVALID_OR_EXPIRED (retain evidence and reason)

Each proposed match must include evidence and a human-readable rationale. Ambiguous cases must not be automatically promoted.

### 5. Produce a dry-run import plan

Report discovered articles, successful captures, fetch failures and changed articles; candidates and role rows extracted; existing matches, proposed new records, duplicates, ambiguous and rejected records; official notification/application link coverage; missing/conflicting fields, vacancy mismatches and past deadlines; proposed inserts/updates/skips with target canonical IDs and exact fields that would change; and predicted second-run results for idempotency.

No production write, promotion, publication, sitemap update, redirect change or cron activation is allowed during the pilot. Dry-run mode must be enforced in code, not only by operator intention.

### 6. Validation gates before any future promotion

- Source HTML/capture retained or explicitly held with a reason.
- Stable source identity and no duplicate external ID.
- Recruitment/post match resolved.
- Exact official notification URL resolved where required by JobOye policy.
- Normalized dates, vacancy counts, salary period and age reference are internally consistent.
- Every field has a mapping destination or is retained as explicitly unmapped source content.
- Proposed hub/leaf relationship follows the canonical URL contract.
- Aggregator-derived facts cannot overwrite protected canonical fields.
- Replay is proven idempotent in scratch.
- Rendered hub/leaf, canonical tags, JobPosting JSON-LD and sitemap eligibility are checked outside production.

Manual official-source verification remains PENDING until a reviewer confirms it. FJA's own “verified” label is not JobOye verification.

## Current implementation notes from repository/schema inspection

- src/ingest/adapters/freejobalert.ts exists. It reads the homepage, latest notifications and government-jobs listing; deduplicates by numeric article ID; and currently caps detail fetches at 50.
- src/enrich/freejobalert-article.ts exists and extracts age, fee, salary, dates, selection, vacancy tables and important links from article sections.
- src/ingest/load-file.ts exists for captured-file replay and includes a scratch-database guard plus dry-run promotion reporting. Its --probe path is explicitly mutating/time-travel simulation and must not run against production.
- src/app/api/ingest/route.ts is a separate daily-digest ingestor. It parses FJA /new-updates/ embedded JSON and upserts into raw_notifications; that route alone does not prove full article capture, canonical matching, or hub/leaf publication.
- The connected Supabase project has public.recruitments, public.posts, public.postings, public.post_enrichments, public.source_documents and public.source_observations. The previously documented public.fja_job_inventory, public.fja_post_inventory and public.fja_source_captures tables were not found in the current project's schemas. A separate staging.fja_962_* set exists, but its notification and post-candidate tables currently contain zero rows.
- Existing canonical recruitment rows show that title-only matching is unsafe: multiple TISS, NLC, IRCON and other records exist, including records with missing source URLs or advertisement fields. Inspect canonical posts and explicit relationships, not just recruitment names.
- A previous production /api/ingest Playwright packaging error was recorded historically. This audit did not reproduce it because the controlled test does not invoke production ingestion.

## Controlled pilot protocol

1. Freeze 10–20 recent FJA articles, including single-role, multi-role, online, offline and walk-in patterns.
2. Capture and parse them in an isolated/local scratch environment or produce a source-evidence dataset without canonical writes.
3. Run the same dataset through the file-based adapter and dry-run matcher.
4. Compare extracted facts with visible FJA article evidence and check official-link classification.
5. Match against a read-only snapshot of canonical recruitment and post records.
6. Generate a human-readable report and import plan; run the same batch twice in scratch to test idempotency.
7. Stop and report blockers. Do not use --probe, apply: true, production cron, or canonical production writes in this pilot.
8. Owner reviews the report and explicitly approves a separate implementation/promotion phase.

## Acceptance criteria

- Every discovered candidate has a source URL and stable external ID or an explicit capture failure.
- Every candidate has a reconciliation class with evidence; ambiguous cases are held.
- No duplicate canonical insert is proposed for a stable source ID already ingested.
- Recruitment totals and role-level vacancies remain separate; mismatches are surfaced.
- Official notification, official application and FJA article URLs are not conflated.
- A second scratch run produces zero additional inserts for unchanged source content.
- Production canonical table counts and public pages remain unchanged throughout the pilot.

## Scheduling status discovered in the pilot

- The current main-branch vercel.json contains an empty crons array. Therefore, despite the comment in src/app/api/ingest/route.ts describing a daily 2 AM UTC schedule, this repository configuration does not currently declare a Vercel Cron schedule for it.
- Do not add a production cron as part of this feasibility run. First implement and validate the complete discovery → capture → extraction → reconciliation → dry-run report path in scratch. Scheduling should be a separate approved step, and the scheduled job must not publish unverified candidates.
