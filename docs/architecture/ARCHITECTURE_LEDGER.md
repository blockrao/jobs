# JobOye architecture ledger

Cumulative record of findings and decisions since the start of the
architecture exercise. Entries are extended, never replaced. A-001 to A-013
are reproduced as issued in the Governance Reset instruction of 2026-10-03;
A-014 onward were added by change GOV-001.

**Governing rule.** Build the correct JobOye architecture first; map it onto
today's infrastructure second. Supabase, Vercel, Next.js and the scheduler are
the current implementation environment and do not constrain the domain model.

**Types.** ARCHITECTURAL (durable model or invariant) · APPLICATION (how code
implements it) · INFRASTRUCTURE (hosting, scheduler, provider) ·
DATA/MIGRATION (existing data, physical schema) · OPERATIONAL (monitoring,
procedures).

Every implementation change must cite a ledger item or create one.

## Ledger

| ID | Area | Finding / decision | Type | Status | Evidence | Action |
| --- | --- | --- | --- | --- | --- | --- |
| A-001 | Entity model | One immutable entity ID; slug is not identity | ARCHITECTURAL | Accepted | Phase 1/2 audit | Preserve |
| A-002 | Recruitment identity | Fuzzy matching is candidate discovery, not identity | ARCHITECTURAL | Accepted | Gate 2 | Implement |
| A-003 | Organization | Organization resolution requires canonical registry/evidence | ARCHITECTURAL | Accepted | Gate 2 | Implement |
| A-004 | Recruitment lifecycle | One authoritative lifecycle state machine + event history | ARCHITECTURAL | Accepted | Gate 2 | Design |
| A-005 | Provenance | Official source/document must become authoritative evidence chain | ARCHITECTURAL | Accepted | Gate 2 | Implement |
| A-006 | Post resolution | Post extraction precedes canonical Post resolution | ARCHITECTURAL | Accepted | Gate 2 | Implement |
| A-007 | SEO | Central SEO policy rather than page-by-page rules | ARCHITECTURAL | Accepted | Phase 1/2 | Implement |
| A-008 | Locale | Same entity ID across locales | ARCHITECTURAL | Accepted | Phase 2 | Preserve |
| A-009 | JobPosting | Only individual job/post leaf pages | ARCHITECTURAL | Accepted | Google validation | Preserve |
| A-010 | Legacy postings | Treat as migration/raw ingestion layer before retirement | ARCHITECTURAL/DATA | Accepted | Gate 2 | Implement gradually |
| A-011 | Migration history | Historical migrations cannot be reconstructed faithfully | DATA/OPERATIONAL | Accepted | Gate 2 | Establish boundary |
| A-012 | Vercel | Current deployment platform is not architectural | INFRASTRUCTURE | Deferred | Current discussion | Do not drive design |
| A-013 | Supabase | Current database provider is not architectural | INFRASTRUCTURE | Deferred | Current discussion | Do not drive design |
| A-014 | Organization roles | A Recruitment has an issuing organization; a Post may have a different employing organization. One `organizationId` must not carry both meanings | ARCHITECTURAL | **Accepted 2026-10-03** (ARC-001 §4): three roles — issuing on Recruitment, employing on Post, conducting on Exam. Empirical validation deferred by design (U-07) | Gate 2 §22, §24: UPSC Advt 12/2026 stored as four recruitments under four departments | No physical change for employing organization before the U-07 check passes (Official Document Acquisition, gating Post Extraction) |
| A-015 | Posting classification | Every raw posting is one of: recruitment notification, lifecycle notice, non-recruitment, unclear. Only the first may create a Recruitment | ARCHITECTURAL | Accepted | Gate 2 §23: 57 of 183 recruitment rows are not recruitments | Design |
| A-016 | Document vs event | A source document is not automatically a lifecycle event | ARCHITECTURAL | Accepted | Gate 1 decision D3 | Design |
| A-017 | Evidence | Evidence is a first-class link from a source document to a canonical fact, entity or event | ARCHITECTURAL | Accepted; nothing implements it | Governance Reset §8; Gate 2 §27: no structure records which fact came from which document | Design |
| A-018 | Lifecycle derivation | Canonical state is derived Evidence → Event → State machine → State. `postings.current_stage` is not the canonical lifecycle. No status backfill | ARCHITECTURAL | Accepted | Gate 2 §26: all 47 status/stage contradictions are misclassified rows | Design |
| A-019 | Lifecycle layering | Trigger → job → lifecycle domain service → state machine → event. The scheduler is replaceable and holds no lifecycle rule | ARCHITECTURAL | Accepted | Governance Reset §3 | Design; supersedes S-01 below |
| A-020 | Notification identity | Level-1 identity is the issuing organization plus the identifier exactly as the body writes it, including series prefix and year. Year is not a separate key component | ARCHITECTURAL | **Accepted 2026-10-03** (ARC-001 §3). Bare-number case closed by U-01 | Gate 2 §24: RRB `CEN 01/2024` vs `CEN RPF 01/2024` | Implement in Recruitment Identity; no constraint change before then |
| A-021 | Post candidates | Extraction produces evidence-backed candidates; no placeholder Post; a title-only candidate cannot become a Post | ARCHITECTURAL | Accepted; wording fixed by ARC-001 §7 rule 3: a weak source may yield a candidate with evidence and confidence, never a canonical Post by itself | Gate 2 §25: 5 of 201 postings have post names; source text is a snippet | Design |
| A-022 | Trust boundary | The public has no write path to canonical data and reads only through a public read model or approved API. Writes belong to privileged ingestion, resolution and administration services | ARCHITECTURAL | Accepted | Governance Reset §10 | Preserve; implement in current stack |
| A-023 | Trust boundary, current state | The current physical implementation violates A-022: 12 tables are writable by the public database role | DATA/MIGRATION | **CLOSED 2026-10-03** by SEC-001, migration `20261003104615` | Gate 2 evidence S1–S5, S14; SEC-01–SEC-04 = 0 violations | Guarded by contract tests SEC-01–SEC-04 |
| A-024 | Application authorization | Admin actions carry no authorization check of their own; cron endpoints do not fail closed; one unauthenticated endpoint calls a paid API | APPLICATION | **CLOSED 2026-10-03** with SEC-001: cron endpoints fail closed and admin actions verify the session, in production. The paid-API endpoint remains open as A-039 | Gate 2 evidence S10–S12; SEC-05, SEC-06 pass | Guarded by SEC-05, SEC-06 |
| A-025 | Migration boundary | Baseline snapshot of the live schema, historical files preserved as artifacts, one authoritative reproducible path forward, boundary and checksum recorded, nothing fabricated | DATA/OPERATIONAL | Accepted (extends A-011) | Gate 2 §21; Governance Reset §9 | Implement (MIG-001) |
| A-026 | Schema contract | The application schema must intentionally represent the real database contract. The 18 live-only columns are to be classified REQUIRED / INTENTIONAL DB-ONLY / LEGACY / UNKNOWN / REMOVE LATER, not copied | DATA/MIGRATION | Classification delivered by MIG-001 (`MIG001_COLUMN_CLASSIFICATION.md`): 8 DB-only, 3 legacy, 2 remove later, 5 unknown. ARC-001 §5 rule 5 settles the 5 unknown as derived from the evidence chain → REMOVE LATER (no column dropped) | Gate 1 §10; Phase 0 baseline §2 | Deliver with MIG-001 |
| A-027 | Indexability contract | Per page type: index, canonical, sitemap and primary schema. Search and filter views are noindex, out of the sitemap, without JobPosting or hreflang; canonical behaviour is set by the central policy | ARCHITECTURAL | Accepted | Gate 1 decision D4 | Implement with A-007 |
| A-028 | Sitemap | Eligibility and `lastmod` derive from the domain model; freshness is a stated SLA. The generation mechanism is not architectural | ARCHITECTURAL (contract) / APPLICATION (mechanism) | **Decided 2026-10-03** (SEO-001 D1): 24 hours. A newly eligible or newly ineligible canonical URL must be reflected within 24 hours without requiring an unrelated application deployment | Gate 2 §29 | Decide SLA; mechanism later |
| A-029 | Authority vocabulary | `source.authority` is the single authority vocabulary; `postings.source_type` duplicates it | ARCHITECTURAL | Accepted | Governance Reset §8; Gate 2 §27 | Retire the duplicate later, separately |
| A-030 | Official documents | Official-document retrieval is the common prerequisite for notification identity, post extraction and lifecycle dates | ARCHITECTURAL/DATA | Accepted finding; unscheduled | Gate 2 §24–§27: 0 of 208 documents are official | Schedule |
| A-031 | Invariant enforcement | Contract suite baseline: 61 pass, 15 fail, 24 skipped | APPLICATION | Accepted baseline (frozen) | W1A-001 | Preserve; failures close as their wave lands |
| A-032 | Scheduler configuration | The lifecycle endpoint accepts only POST; ingestion has not written on its schedule; secret handling is weak | INFRASTRUCTURE/OPERATIONAL | Deferred — not forgotten. Includes whether the scheduler secret is configured in production: operational only, decided 2026-10-03; if unset the endpoints refuse every caller, including the scheduler. Owner reports the scheduler secret was set in the hosting environment on 2026-10-03; it is not stored in the repository | Gate 2 §28 | Operational correction outside the core workstream |
| A-033 | Governance fields | Review, publishing, quality, verification and index-tier fields need an explicit owner before `postings` becomes a raw layer | ARCHITECTURAL/DATA | Accepted; mapping open | Protocol §16 | Map before legacy retirement |
| A-034 | Eligibility and selection process | Both are in the ontology; their tables exist and are empty; neither has been analysed | ARCHITECTURAL | **Accepted 2026-10-03** (ARC-001 §2 rule 4): value structures owned by a Post, with Recruitment-level defaults | Phase 0 baseline §1 | Implement with Post Extraction |
| A-035 | Lifecycle vocabulary | Final enum, including whether an explicit unknown state exists | ARCHITECTURAL | **Accepted 2026-10-03** (ARC-001 §6): seven states including UNKNOWN; milestones are events | Gate 2 §26: 74 rows have an open stage and no deadline | Implement in Lifecycle and Events |
| A-036 | Orphan lifecycle notice | A lifecycle notice never creates a Recruitment by itself | ARCHITECTURAL | **Accepted 2026-10-03** (ARC-001 §7, U-02): held UNRESOLVED, retried, creates nothing | Governance Reset §8; Gate 2 §23 | Implement in Posting Classification and Lifecycle and Events |
| A-037 | Unverified items | Deployment of commit `704725e`, and the HTTP contract suite, have never been verified against production | OPERATIONAL | Partly resolved 2026-10-03: the repository host records successful production deployments of `704725e` (2026-10-02) and `50317d2` (2026-10-03). Which deployment project serves the public domain is not established from here (A-046). HTTP suite still not run | Phase 0 report §12; deployment records | Run once from a machine with access |
| A-038 | Default privileges | Root cause of A-023: the schema's default privileges grant the public roles full rights on every new table, sequence and function, so each new object is born open | DATA/MIGRATION | **CLOSED 2026-10-03** by SEC-001 for the migration owner role | SEC-04 = 0 violations | Objects created by any other role are outside this protection: see A-040 |
| A-039 | Unauthenticated paid-API endpoint | `/api/query/normalize` calls a paid API with no authentication or rate limit | APPLICATION | **CLOSED 2026-10-04** (deployed `954743a`, live check passed): the paid (LLM) path needs `Authorization: Bearer $QUERY_NORMALIZE_SECRET`, fails closed when the secret is unset; the rules-based path stays public | Gate 2 evidence | Tests NA-1..5 and SEC-08; independent review: no bypass. Owner action: set `QUERY_NORMALIZE_SECRET` only if the paid path is wanted |
| A-040 | Migration authority | All future production schema changes occur through the authoritative migration path and the approved ownership/privilege model. Direct production DDL or object creation outside that path is not an accepted production mechanism | DATA/OPERATIONAL | Accepted — in force from MIG-001 | SEC-001 approval §4; `supabase/migrations/README.md` | Preserve |
| A-041 | Broken database function | `refresh_posting_urgency_states()` reads a table that does not exist, so search and urgency values are populated on only 5 postings | DATA/MIGRATION | **CLOSED 2026-10-04** (function repaired and run once; see A041 result) | MIG-001 baseline `functions/refresh_posting_urgency_states.sql` | Schedule; not in SEC-001 |
| A-042 | Unused organization-role enum | An enum `organization_role` (EXAM_AUTHORITY, RECRUITING_BODY, EMPLOYER) exists live and is used by no column. Relevant prior art for A-014 | ARCHITECTURAL (input) | Not adopted (ARC-001 §4): roles sit on relationships | MIG-001 baseline `02_objects.txt` | Remove at legacy retirement |
| A-043 | Function search path | All 9 database functions have a mutable `search_path` (provider linter warning) | DATA/MIGRATION | Open — P2 | Security advisor after SEC-001 | Later; fold into the lifecycle increment, which retires several of them |
| A-044 | Lifecycle endpoint method | The lifecycle endpoint accepts only POST while the scheduler issues GET, so it is not invoked successfully regardless of SEC-001 | INFRASTRUCTURE | Deferred (with A-032) | Gate 2 §28; local check during SEC-001 | Operational correction outside the core workstream |
| A-045 | Organizations hub renders empty | After the 2026-10-03 deployment `/organizations` loads but lists no organizations, while the database holds 125. The page swallows data errors and renders an empty list. Not caused by the database change in SEC-001 as far as evidence shows (application connects as the owner role; no database error logged since the migration); whether it pre-dates the deployment is unknown | APPLICATION | Open — P1, DEFERRED (not part of SEC-001 or of the SEO policy). Observed empty once at 11:03 UTC, minutes after the production build; observed populated (125 organizations) at about 11:20 UTC with no change made. Consistent with a build-time render that had no data and a later regeneration; cause not established | External fetch 2026-10-03; database log query | Establish cause before SEC-001 closes; fix in its own increment |
| A-046 | Deployment target ambiguity | Four deployment projects build every commit of this repository. The owner reports the account was changed; which project serves the public domain is not recorded | INFRASTRUCTURE / OPERATIONAL | **Resolved 2026-10-03: `asdf` is the serving project** (owner confirmed: it is the only project with the production environment settings). The owner deleted `jobs`, `jobes` and `jobing` on 2026-10-03; `asdf` is the only project | Deployment records for `50317d2` | Verify fixes live on `asdf`; consider renaming the project |
| A-047 | Logical architecture | `ARC001_LOGICAL_ARCHITECTURE.md` is the authoritative, technology-independent logical reference: ontology, identity, organization roles, provenance, lifecycle, ingestion and resolution | ARCHITECTURAL | **Accepted and frozen 2026-10-03** (ARC-001 CLOSED) | Owner approval with three textual corrections, 2026-10-03 | Preserve; change only on concrete contradictory evidence |
| A-048 | Source Document versions | A retrieved version is immutable; a changed re-retrieval is a new immutable version linked to the same external-document identity where that can be established. Versioning is a property of Source Document, not a separate entity | ARCHITECTURAL | Accepted 2026-10-03 (ARC-001 §5) | ARC-001 review correction 2 | Implement in Official Document Acquisition |
| A-049 | Exam cycle | A qualifying test is an Exam; its yearly cycle is not modelled. A possible "exam cycle" entity | ARCHITECTURAL | DEFERRED BY DESIGN until after legacy retirement | ARC-001 §8, U-08 | Revisit after Legacy Retirement |
| A-050 | SEO-001 decisions | D2: `/recruitments/*` and `/positions/*` are `noindex, follow` until Canonical Read Migration — they are not canonical public projections yet. D3: dedicated Hindi listing pages deferred; cookie-switched listings remain English canonical pages. D4: unattached lifecycle notices are not exposed as canonical Recruitments; existing job-page treatment remains until the read projection work. JobPosting eligibility consumes the ARC-001 lifecycle and public representation; SEO defines no lifecycle rule | ARCHITECTURAL | Accepted 2026-10-03 | Owner decision on the SEO-001 pre-change report | Implement in SEO-001 steps 1–3 |
| A-051 | Language of untranslated Hindi entity pages | An untranslated `/hi` entity URL currently receives `lang="hi"` from the URL/layout even though its content remains English. Current SEO treatment stands: `lang="hi"` + English canonical + `noindex, follow` + no hreflang + no sitemap | APPLICATION | Bounded finding (owner, 2026-10-03). SEO architecture not reopened | SEO-001 Step 3 result | Revisit only if later work requires indexed untranslated Hindi entity pages |
| A-052 | hreflang in HTTP headers bypasses the policy | The language middleware adds an HTTP `Link` header declaring en / hi / x-default alternates on every job, article, organization and exam URL, unconditionally — including pages the policy marks "no hreflang" (noindex, or no Hindi version). Step 2 verification inspected page metadata only, not response headers | APPLICATION (violates A-050 policy) | **Fixed on the Step 3 branch 2026-10-03** (owner approved): middleware `alternateLinks: false`. Contract LOC-09. Local build: no `Link` hreflang header on entity URLs. Not yet in production | `curl -D -` on `/jobs/{slug}`: `Link: …; rel="alternate"; hreflang=…` | Verify on preview, then deploy with Step 3 |
| A-053 | Automatic language redirect | A request for an English entity URL with a Hindi `Accept-Language` header, or the Hindi preference cookie, is redirected (307) to `/hi/…`. Search-engine guidance advises against redirecting by detected language. Googlebot normally sends no language header; other crawlers and agents may | APPLICATION | **Decided 2026-10-03: turned off** (`localeDetection: false`). Contract LOC-10. Local build: a Hindi `Accept-Language` header or the Hindi cookie no longer redirects an English entity URL. Home and `/jobs` listings already link Hindi-preference visitors to `/hi/jobs/…`; links from `/search`, discovery sections and recruitment pages go to the English page. Not yet in production | Local build: `Accept-Language: hi` → 307 to `/hi/jobs/…`; cookie → same | Verify on preview, then deploy with Step 3 |
| A-054 | English navigation on Hindi pages | The header chooses its language from the cookie in the browser, so the server HTML of a `/hi` page has English navigation around Hindi content | APPLICATION | Open — P2 | `src/components/header.tsx` | Schedule after SEO-001 |
| A-055 | "Has Hindi" is title-only | A Hindi version is treated as existing when the entity has a Hindi title/name. Description, eligibility and other fields fall back to English one by one, as does the meta description. The policy wording is "genuine Hindi content for its main fields" | APPLICATION | Open — P2 | `[locale]/jobs/[slug]/page.tsx` and siblings | Tighten the test; schedule after SEO-001 |
| A-056 | Multilingual product gaps | (a) No Hindi listing, category or home URLs (D3, deferred) — the largest gap for Hindi search. (b) Sitemap lists Hindi pages only as alternates, not as entries. (c) Hindi entity pages set no social-preview locale; job and article structured data carry no language. (d) The site font has no Devanagari glyphs. (e) Nothing targets Latin-script Hindi or spoken-question phrasing | PRODUCT / APPLICATION | Open — backlog | Fresh review 2026-10-03 | Product decision after SEO-001 closes |
| A-057 | Admin shows the error page | Owner reports "Something went wrong" when using `/admin` (2026-10-03). Not reproduced: on a local build the login page renders, rejects a wrong password and shows no browser error; the database logged no error in the period. The dashboard itself cannot be exercised without database access. Cause not established | APPLICATION | **Resolved 2026-10-03, cause not established.** The owner retried: `/admin` loads the dashboard and approve/reject both work on www.joboye.com. Never reproduced; consistent with a page opened before a deployment, but that is not proven | Owner report; local headless check; database log query | None; reopen if it recurs |
| A-058 | Production is not following `main` | Step 3 was put into production by redeploys made directly in the hosting dashboard, outside the preview gate. A later push of `main` (`5681e2c`) created no production deployment; the live site runs Step 3 without the A-052/A-053 fixes | OPERATIONAL / INFRASTRUCTURE | **Open — P1** | Owner's deployment list; live-site checks 2026-10-03 14:00 UTC | Owner: restore production deployment from `main` in the hosting dashboard; then verify A-052/A-053 live |
| A-059 | Daily deployment limit reached | The hosting plan allows 100 deployments per day. Four projects built every push, including documentation-only commits, and the limit was hit on 2026-10-03. The serving project (`asdf`) cannot deploy until the limit resets, so the A-052/A-053 fixes (in `main`) are not live. This also explains A-058 | OPERATIONAL | **Open until the limit resets** (about 24 hours). Working rule from now: no push while the limit is exhausted; afterwards one push per verified step, documentation batched with code, one connected project | Owner report 2026-10-03 | Owner: remove the three unused projects. After reset: deploy `main` on `asdf` once, verify, then V7 and SEO-001 closure |
| A-060 | JobPosting optional address fields | Google's validator reports two optional fields missing on job pages: `streetAddress` and `postalCode`. Not errors; the page is eligible. They can only be filled from an official document, never guessed | DATA | Open — backlog | Rich Results Test, 2026-10-03 | Supply from evidence in the Post Extraction increment; do not fabricate values |
| A-061 | Data Foundation track | The next phase runs two separate tracks: acquisition and canonical architecture. ARC-001 remains the architectural authority and is not reopened. DATA-000 is a bounded evidence audit (not a census, not a new architecture audit). DATA-001 is canonical data gap resolution and freeze: it compares findings with the frozen architecture and records only genuine gaps or contradictions, through the existing change-control process. DATA-000 authorizes no production data migration or canonical rewrite. A-039, A-041 and the pre-data safety gate stay on their own track: DATA-000 does not wait for them, DATA-004 cannot bypass the safety gate | ARCHITECTURAL (programme) | **Accepted 2026-10-03** (owner decision on the Team Alignment review) | Owner response "Architecture Response & Decisions", §1, §3, §5 | Execute DATA-000 once its plan is approved |
| A-062 | Organization Registry split | ORG-001A (registry contract and primitives: identity, immutable IDs, aliases, resolution outcomes, merge rules, relationships and hierarchy, identity contract) proceeds independently. ORG-001B (population: discovery, candidates, normalization, resolution, seeding, coverage measurement) waits for DATA-005. Replaces the single "Organization Registry" increment. The ORG-001 specification remains the contract for both parts. Proposed, not yet decided, for the ORG-001A pre-change report: the "shadow comparison" in the specification is comparison-only and switches no reads (SHADOW-001 owns Shadow Validation); the employing-organization link stays design-only until U-07 (A-014); schema is additive before the safety gate, and no foreign-key rewrite or merge happens before it | ARCHITECTURAL | **Accepted 2026-10-03** (split); proposed items open | Owner response §2; ORG-001 specification | ORG-001A pre-change report |
| A-063 | Acquisition path | One acquisition path: DATA-002 (acquisition architecture and source adapter contract) → DOC-001 (official document acquisition pilot, the former Official Document Acquisition increment, keeping its evidence requirements) → DATA-003 (ingestion and resolution contract) → DATA-004 (multi-source real-data integration pilot). DATA-004 is not a second document-acquisition exercise. Any production write by DOC-001 or DATA-004 requires the pre-data safety gate | ARCHITECTURAL / OPERATIONAL | **Accepted 2026-10-03** | Owner response §3, §4 | Design in DATA-002 |
| A-064 | Discovery source is not authority source | Aggregator data is discovery evidence, not automatically republishable content and not authority. Audit and acquisition architecture record per source: provenance, terms and usage restrictions, copyright and republication considerations, discovery-only suitability, whether it can be transformed into canonical facts, and what must be verified against authoritative documents | ARCHITECTURAL / OPERATIONAL | **Accepted 2026-10-03** | Owner response §8 | Apply in DATA-000 and DATA-002 |
| A-065 | Raw storage and volumes | DATA-002 establishes expected volumes of raw observations, source documents, document versions, extracted content, hashes and metadata, and evidence, then decides what belongs in the transactional database and what in object or document storage. The current database arrangement must not become an accidental architectural constraint. Owner constraint (no plan upgrade) is an input | ARCHITECTURAL / INFRASTRUCTURE | **Accepted 2026-10-03**; decision due in DATA-002 | Owner response §7 | Decide in DATA-002 |
| A-066 | Evidence grading; "knowledge graph" | External research is not unrestricted crawling. Audit findings are graded observed / sampled / inferred / unknown; a sample count is never presented as an estimate of the ecosystem or of coverage. "Knowledge graph" names the product and domain objective, not a technology: relational Postgres stays appropriate if it represents entities, relationships, evidence, temporal events, identity, provenance and projections | ARCHITECTURAL | **Accepted 2026-10-03** | Owner response §6, §9 | Apply in DATA-000 onward |
| A-067 | DEFECT (separate from WP-001): lifecycle cron method mismatch | `vercel.json` schedules `/api/cron/update-recruitment-lifecycle` (Vercel crons send GET) but the route exports only `POST`, so the scheduled call is expected to get 405 and the lifecycle job never runs. `/api/ingest` has no method check and needs `CRON_SECRET` (rejects when unset). Not fixed in WP-001; fix before relying on automated lifecycle. Hosting values (`DRY_RUN`, `CRON_SECRET`, invocation logs) not yet observed. **Expiry-protection check 2026-10-04:** JobPosting gate is date-based and safe without the cron; the public listing and home page (and, going forward, the sitemap) depend on the `is_expired` flag alone, and 18 of 19 approved postings past their last date are live on `/jobs` (2 on the home page); no Tier A posting is exposed yet (see ARCHITECTURE_CHANGELOG) | DEFECT | **Listing/sitemap gap CLOSED 2026-10-04** (6af06ad, Production, verified live). **Cron GET/POST defect remains OPEN, deferred** | Owner verification 2026-10-04; live check 2026-10-04 | Cron fix stays deferred. Distinction: JobPosting gate was already safe without the cron; listing and sitemap needed the date guard (added); cron remains deferred. Guard is `valid_through >= start of UTC day` (last date still counts, same rule as promotion; unknown date not excluded). Exam, commission, organization and category listings still have no expiry filter (observation, not in scope) |
| A-068 | DEFECT (found during A-041 verification): search code cannot run queries | `searchPostings` in `src/lib/search-queries.ts` calls `db.$client(sqlQuery, params)`; the `postgres` driver rejects a non-tagged call (`NOT_TAGGED_CALL`), the error is caught and an empty list is returned, so `/api/search/jobs` returns no results for any query even with correctly populated data (live: 0 results with and without `q`, 6 eligible rows). Reproduced on the scratch database. Not fixed here | DEFECT | **Open 2026-10-04** | A-041 verification | Queue it; do not pull forward |
| A-069 | Owner decision 2026-10-04: pre-data backup/restore gate waived | The owner waived the tested backup-and-restore gate (`WP001_BACKUP_GATE.md`) for the launch load; backups are handled separately through the owner's regular daily process. Compensating controls required in the load increment: additive-only load tagged with a batch id, aggregate before/after hashes of existing tables, a tested rollback by batch id on the scratch database, and no change to existing rows beyond the approved fill rules | DECISION | **Recorded 2026-10-04** | Owner message 2026-10-04 14:12 IST | Applies to the launch load only; merges, backfills and destructive migrations still need an approved pre-change report |

## Frozen baselines

Unchanged. Later measurements are reported beside these, never over them.

- **Phase 0 / W1-A** — `docs/architecture/PHASE0_BASELINE.md`; contract suite
  61 / 15 / 24.
- **Gate 2** — `docs/architecture/GATE2_EVIDENCE.md`: 201 postings; 183
  recruitments; about 108 of 201 postings affected by organization problems;
  126 genuine-recruitment candidates and 57 other rows; 4 of 183 notification
  numbers; 4 of 201 postings linked to a Post; no official source documents.

## Superseded recommendations

Earlier recommendations that the infrastructure-independence principle
changes. The original text stays where it was written; this table is the
record of what replaced it.

| ID | Earlier recommendation | Where | Superseded by |
| --- | --- | --- | --- |
| S-01 | Extend the database function `refresh_recruitment_lifecycle()` and its trigger as the home of date-driven transitions | Phase 2 response §4 | A-019: lifecycle rules live in a domain service and state machine. The database function and trigger are legacy implementation to retire once that exists |
| S-02 | Seed `recruitments.status` from `postings.current_stage` | Phase 2 response §3–§4; Phase 0 report | A-018: state is derived from evidence-backed events; no backfill |
| S-03 | "Enable RLS and revoke grants" stated as the security requirement | Gate 2 §20 | A-022 is the requirement (trust boundary). RLS and grants are how the current stack meets it (A-023). The action is unchanged; its justification is |
| S-04 | Open decision D12: choose between Supabase CLI and the connector | Gate 2 §21 | A-025: the requirement is one authoritative, reproducible mechanism. Tool choice is OPERATIONAL and may change |
| S-05 | "Check the Vercel cron log" as step 3 of the core sequence | Gate 2, proposed order | A-032: deferred infrastructure item, outside the core workstream |
| S-06 | Time-based revalidation recommended as the sitemap fix | Gate 2 §29 | A-028: the SLA is the architectural decision; the mechanism is chosen afterwards |
| S-07 | Add unique indexes on `sources.slug` and `source_documents(source_id, external_id)` | Phase 1 audit; Phase 2 response §7 | Withdrawn at P0-001: both already exist |
| S-08 | `/search` client-side rendering rated a P1 defect | Phase 1 audit | Phase 2 specification §42: search is intentionally non-indexable |
| S-09 | Add `year` to the notification uniqueness key | Phase 2 response §5 | A-020 (proposed): year is part of the identifier as written |
| S-10 | Organization Registry as one increment immediately after SEO-001 | Implementation sequence row 5; HANDOFF item 4 | A-062: split into ORG-001A (independent) and ORG-001B (after DATA-005) |
| S-11 | Official Document Acquisition as a separate late increment (row 7) | Implementation sequence row 7 | A-063: DOC-001 inside the single acquisition path DATA-002 → DOC-001 → DATA-003 → DATA-004 |

## Unresolved decisions

No decision is left simply "open". Each is closed or deferred by design to a
named increment.

| ID | Decision | Status |
| --- | --- | --- |
| U-01 | Notification identity where a body publishes a bare number with no year | **CLOSED 2026-10-03** (ARC-001 §8): a bare identifier is a Level 2 key; decides with issuing organization + notification date; stored as printed |
| U-02 | Lifecycle notice whose parent recruitment was never ingested | **CLOSED 2026-10-03** (ARC-001 §8): held as UNRESOLVED source document, retried, creates no Recruitment or Event. Public visibility of an unattached notice → SEO-001 |
| U-03 | Final lifecycle vocabulary, including an explicit unknown state | **CLOSED 2026-10-03** (ARC-001 §6): seven states including UNKNOWN |
| U-04 | Sitemap freshness SLA; 24 hours proposed | **CLOSED 2026-10-03** (SEO-001 D1): 24 hours, with the acceptance condition in A-028 |
| U-05 | May SEC-001 precede the migration boundary | **CLOSED 2026-10-03**: no. MIG-001 first (Execution Reset §5) |
| U-06 | Migration directory name | **CLOSED 2026-10-03**: `supabase/migrations/`, per Gate 1 D1; a physical location holding portable SQL |
| U-07 | Validation of issuing vs employing organization against official examples | Model **CLOSED 2026-10-03** (ARC-001 §4). Empirical validation DEFERRED BY DESIGN → Official Document Acquisition, gating Post Extraction |
| U-08 | Scope of admissions, scholarships and qualifying tests | **CLOSED 2026-10-03** (ARC-001 §8): none is a Recruitment; admissions and scholarships are outside the canonical model; exam cycle deferred (A-049) |

## Implementation sequence

Numbering normalized 2026-10-03 (bookkeeping only; the sequence itself is
unchanged). Each roadmap increment has exactly one number. SEC-001's
pre-change report, implementation and verification are phases of one
increment, not separate increments. MIG-001 is listed first because it was
executed before the SEC-001 database change.

**Old numbers.** Documents written before this normalization
(`ARC001_LOGICAL_ARCHITECTURE.md`, the SEO-001 pre-change report, earlier
changelog entries) use the previous numbering, which was one higher from
ARC-001 onward: old 6 Organization Registry, 7 Posting Classification,
8 Official Document Acquisition, 9 Recruitment Identity, 10 Post Extraction,
11 Lifecycle and Events, 12 Shadow Validation, 13 Canonical Read Migration,
14 Legacy Retirement, 15 Final Readiness Gate. Those documents are not
edited. From here on, increments are referred to by name.

Each increment follows PRE-CHANGE → APPROVAL → IMPLEMENTATION → VERIFICATION
→ RESULT → CLOSURE. Not reordered without a concrete dependency.

| # | Increment | Ledger | Live-site risk | Status |
| --- | --- | --- | --- | --- |
| 1 | MIG-001 migration boundary, baseline snapshot, column classification | A-025, A-026, A-040 | None | CLOSED 2026-10-03 |
| 2 | SEC-001 public trust boundary (pre-change, implementation, verification) | A-022–A-024, A-038 | Low; done | **CLOSED 2026-10-03.** Database migration `20261003104615` live and verified. Application changes (`cd3fa2d`) in production: `50317d2`, `58c508c` and `f75c325` were each deployed to production on all four projects, so the closure holds whichever one serves the domain (see A-046 correction). External: public data API denied; live pages load; unauthenticated admin and scheduler calls rejected; owner confirmed admin login and approve/reject on www.joboye.com |
| 3 | ARC-001 logical architecture | A-001–A-005, A-014–A-021, A-034–A-036, A-047–A-049 | None | **CLOSED 2026-10-03**. Documentation only |
| 4 | SEO-001 public representation policy | A-007, A-008, A-027, A-028, A-050 | **Controlled public representation and indexing changes**; no data or URL change; each step reversible | Pre-change report **APPROVED 2026-10-03** (four corrections and one wording refinement applied; decisions D1–D4). Owner direction 2026-10-03: SEC-001's two remaining owner checks do not block SEO-001; Step 1 authorized. Step 2 only after Step 1 passes V1–V5. **Step 1 implemented 2026-10-03** (`ede423c`), deployed to production (`58c508c`): V1–V5 pass. **Step 2 implemented and deployed 2026-10-03** (`main` = `f75c325`; four production deployments recorded successful): V1–V5 pass; contract failures 13 → 4. Policy recorded in `SEO001_PUBLIC_REPRESENTATION.md`. **Step 3 implemented 2026-10-03** (option (a), owner decision): V1–V5 pass; contract failures 4 → 2 (both owned by later increments). Step 3 is live in production (via dashboard redeploys, A-058) and its gate checks pass on real data except hreflang in HTTP headers, fixed in `8ca4e93` but not yet live. V6, V7 outstanding. SEO-001 OPEN |
| 5 | Organization Registry | A-003, A-014 | Low: canonical layer only | **Split 2026-10-03 (A-062):** ORG-001A registry contract and primitives (independent, pre-change report next); ORG-001B registry population after DATA-005 |
| 6 | Posting Classification | A-015, A-016 | Low | |
| 7 | Official Document Acquisition | A-005, A-017, A-030, A-048 | Low; **largest uncertainty** (see note) | **Renamed DOC-001 and moved into the acquisition path 2026-10-03 (A-063)**, after DATA-002 |
| 8 | Recruitment Identity | A-002, A-020 | Low | |
| 9 | Post Extraction | A-006, A-021 | Low | |
| 10 | Lifecycle and Events | A-004, A-018, A-019 | Low | |
| 11 | Shadow Validation | A-010 | None: comparison only | |
| 12 | Canonical Read Migration | A-010 | **First major source-of-truth migration for public pages** | |
| 13 | Legacy Retirement | A-010, A-033 | **Major irreversible cleanup stage** | |
| 14 | Final Readiness Gate | — | — | |

**Dependency guardrails (owner direction 2026-10-03; from ARC-001).** Work is
not pulled forward to improve today's data.

- Recruitment identity is not resolved from weak aggregator evidence before
  Official Document Acquisition.
- No canonical Post is manufactured from today's weak titles.
- Lifecycle is not redesigned from currently stored stages.
- Public reads are not migrated before Shadow Validation.

**Pre-data safety gate (owner direction 2026-10-03; not a roadmap increment).**
Before Organization Registry or Posting Classification modifies production
data, backup and restore must be tested, not merely exist: a recoverable
production snapshot exists; a restoration is actually performed; the
procedure is documented; the recovery point suits the first data mutation.
The same discipline applies to every later data-rewriting increment.

**Standard requirement for every data-reconstruction increment (owner
direction 2026-10-03).** The increment must explicitly account for both the
existing baseline dataset and postings arriving while the increment is being
executed, without creating competing sources of truth. The live-ingestion
solution is established within the relevant increments and proven at Shadow
Validation.

**Bounded maintenance after SEO-001 closes, before the data sequence (owner
direction 2026-10-03; not roadmap increments, SEC-001 not reopened).** Each
is a small isolated change with its own verification: (1) A-039 — secure the
unauthenticated paid-API endpoint so an uncontrolled external caller cannot
generate third-party API expenditure; (2) A-041 — assess the database
function reading a missing table and fix it if bounded.

**Editorial fields (A-033).** Mapped to their future home in the migration
preparation before Canonical Read Migration; not a separate increment.

**Multilingual product work (A-054, A-055, A-056).** Deferred. Dedicated
Hindi listing and category URLs are product work and do not enter the
architecture sequence now.

**Official Document Acquisition** is a bounded technical/product increment.
Its reports must give explicit evidence on: source discovery; retrieval
reliability; document preservation and versioning; hashes; retrieval
timestamps; official-source authority; failure cases; rate limits and access
restrictions; reproducibility. Success on one portal is not evidence that
acquisition is solved generally.

**Parked — outside the roadmap unless new evidence makes one blocking.** No
informal increment is created for these. After SEO-001 the owner decides
whether to handle them as bounded maintenance/security work before the data
sequence. In priority order:

1. A-039 unauthenticated paid-API endpoint — now scheduled as bounded
   maintenance (above).
2. A-041 database function reading a missing table — now scheduled as
   bounded maintenance (above).
3. A-045 organizations listing observed empty once after a deployment.
4. A-032, A-044 scheduler and cron implementation, including the scheduler
   secret.
5. A-046 four deployment projects for one repository.
6. A-037 production HTTP suite never run; A-043 function search path.

## Programme direction: Data Foundation track (owner decision 2026-10-03, night)

Governing interpretation of the implementation sequence (A-061 to A-066).
The numbered table above is kept as written; this section is the current
order and the mapping from the earlier names.

**Under review (owner, 2026-10-03, later that night).** The owner challenged
the scope of the data track as an endless-cycle risk. The sequence below is
on hold and DATA-000 must not be started; the real-work items (SEO-001
closure, A-039, A-041, tested backup and restore) are the open items. The
principles in A-061 (ARC-001 stays authoritative), A-064, A-065 and A-066
stand. A smaller replacement is proposed in `HANDOFF.md` and awaits the
owner's decision.

**Independent of the data track (own verification, unchanged):** SEO-001
closure; A-039; A-041; pre-data safety gate; ORG-001A.

**Data foundation:** DATA-000 bounded data foundation audit → DATA-001
canonical data gap resolution and freeze → DATA-002 acquisition architecture
and source adapter contract → DOC-001 official document acquisition pilot →
DATA-003 ingestion and resolution contract → DATA-004 multi-source real-data
integration pilot → DATA-005 architecture stress test.

**Canonical reconstruction:** ORG-001B registry population → CLASS-001 →
REC-001 → POST-001 → LIFE-001 → SHADOW-001 → READ-001 → RET-001 → GATE-001.

| Earlier name (table above) | Current name |
| --- | --- |
| 5 Organization Registry | ORG-001A (primitives), ORG-001B (population) |
| 6 Posting Classification | CLASS-001 |
| 7 Official Document Acquisition | DOC-001 |
| 8 Recruitment Identity | REC-001 |
| 9 Post Extraction | POST-001 (Post and Vacancy Resolution) |
| 10 Lifecycle and Events | LIFE-001 |
| 11 Shadow Validation | SHADOW-001 |
| 12 Canonical Read Migration | READ-001 |
| 13 Legacy Retirement | RET-001 |
| 14 Final Readiness Gate | GATE-001 |

Discipline (owner): evidence → bounded decision → implementation →
measurement → close. No broad audit without a concrete output; no schema
change without evidence; no canonical data rewrite before the relevant
contract is frozen; no acquisition system that writes directly into
canonical data; no irreversible migration before shadow validation; no
closed architecture decision reopened without a genuine contradiction.

## Scorecard

| Metric | After SEC-001 pre-change | After MIG-001 + SEC-001 | After ARC-001 | 2026-10-03 evening |
| --- | --- | --- | --- | --- |
| Contract test failures | 15 | 15 (same set; 8 new SEC tests pass) | 15 | 4 in production (Steps 1–2); 2 on the Step 3 branch |
| Open P0s | 1 | 0 | 0 at database level | 0 |
| Unresolved decisions | 6 (all deferred by design) | 6 (all deferred by design) | 2 (U-04 → SEO-001; U-07 validation → Official Document Acquisition), both deferred by design | — |
| — of which open architecture decisions (2026-10-03, after SEO-001 decisions) | | | 0 | 0 |
| — of which deferred empirical validation | | | 1 (U-07 validation → Official Document Acquisition) | 1 (U-07) |
| Implementation increments complete | 0 | 1 closed (MIG-001); SEC-001 deployed, awaiting V7 and remaining V8 | 2 closed (MIG-001, ARC-001); SEC-001 in final verification | 3 closed (MIG-001, SEC-001, ARC-001); SEO-001 open |
| Architecture decisions reopened | 0 | 0 | 0 | 0 |
