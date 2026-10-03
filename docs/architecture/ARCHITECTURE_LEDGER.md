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
| A-014 | Organization roles | A Recruitment has an issuing organization; a Post may have a different employing organization. One `organizationId` must not carry both meanings | ARCHITECTURAL | **Accepted 2026-10-03** (ARC-001 §4): three roles — issuing on Recruitment, employing on Post, conducting on Exam. Empirical validation deferred by design (U-07) | Gate 2 §22, §24: UPSC Advt 12/2026 stored as four recruitments under four departments | No physical change for employing organization before the U-07 check passes (increment 8, gating increment 10) |
| A-015 | Posting classification | Every raw posting is one of: recruitment notification, lifecycle notice, non-recruitment, unclear. Only the first may create a Recruitment | ARCHITECTURAL | Accepted | Gate 2 §23: 57 of 183 recruitment rows are not recruitments | Design |
| A-016 | Document vs event | A source document is not automatically a lifecycle event | ARCHITECTURAL | Accepted | Gate 1 decision D3 | Design |
| A-017 | Evidence | Evidence is a first-class link from a source document to a canonical fact, entity or event | ARCHITECTURAL | Accepted; nothing implements it | Governance Reset §8; Gate 2 §27: no structure records which fact came from which document | Design |
| A-018 | Lifecycle derivation | Canonical state is derived Evidence → Event → State machine → State. `postings.current_stage` is not the canonical lifecycle. No status backfill | ARCHITECTURAL | Accepted | Gate 2 §26: all 47 status/stage contradictions are misclassified rows | Design |
| A-019 | Lifecycle layering | Trigger → job → lifecycle domain service → state machine → event. The scheduler is replaceable and holds no lifecycle rule | ARCHITECTURAL | Accepted | Governance Reset §3 | Design; supersedes S-01 below |
| A-020 | Notification identity | Level-1 identity is the issuing organization plus the identifier exactly as the body writes it, including series prefix and year. Year is not a separate key component | ARCHITECTURAL | **Accepted 2026-10-03** (ARC-001 §3). Bare-number case closed by U-01 | Gate 2 §24: RRB `CEN 01/2024` vs `CEN RPF 01/2024` | Implement in increment 9; no constraint change before then |
| A-021 | Post candidates | Extraction produces evidence-backed candidates; no placeholder Post; a title-only candidate cannot become a Post | ARCHITECTURAL | Accepted; wording fixed by ARC-001 §7 rule 3: a weak source may yield a candidate with evidence and confidence, never a canonical Post by itself | Gate 2 §25: 5 of 201 postings have post names; source text is a snippet | Design |
| A-022 | Trust boundary | The public has no write path to canonical data and reads only through a public read model or approved API. Writes belong to privileged ingestion, resolution and administration services | ARCHITECTURAL | Accepted | Governance Reset §10 | Preserve; implement in current stack |
| A-023 | Trust boundary, current state | The current physical implementation violates A-022: 12 tables are writable by the public database role | DATA/MIGRATION | **CLOSED 2026-10-03** by SEC-001, migration `20261003104615` | Gate 2 evidence S1–S5, S14; SEC-01–SEC-04 = 0 violations | Guarded by contract tests SEC-01–SEC-04 |
| A-024 | Application authorization | Admin actions carry no authorization check of their own; cron endpoints do not fail closed; one unauthenticated endpoint calls a paid API | APPLICATION | Cron endpoints and admin actions fixed by SEC-001 (commit `cd3fa2d`), **deployed 2026-10-03** (`main` = `50317d2`). The paid-API endpoint remains open as A-039 | Gate 2 evidence S10–S12; SEC-05, SEC-06 pass | Owner: admin login and one admin mutation; confirm scheduler secret |
| A-025 | Migration boundary | Baseline snapshot of the live schema, historical files preserved as artifacts, one authoritative reproducible path forward, boundary and checksum recorded, nothing fabricated | DATA/OPERATIONAL | Accepted (extends A-011) | Gate 2 §21; Governance Reset §9 | Implement (MIG-001) |
| A-026 | Schema contract | The application schema must intentionally represent the real database contract. The 18 live-only columns are to be classified REQUIRED / INTENTIONAL DB-ONLY / LEGACY / UNKNOWN / REMOVE LATER, not copied | DATA/MIGRATION | Classification delivered by MIG-001 (`MIG001_COLUMN_CLASSIFICATION.md`): 8 DB-only, 3 legacy, 2 remove later, 5 unknown. ARC-001 §5 rule 5 settles the 5 unknown as derived from the evidence chain → REMOVE LATER (no column dropped) | Gate 1 §10; Phase 0 baseline §2 | Deliver with MIG-001 |
| A-027 | Indexability contract | Per page type: index, canonical, sitemap and primary schema. Search and filter views are noindex, out of the sitemap, without JobPosting or hreflang; canonical behaviour is set by the central policy | ARCHITECTURAL | Accepted | Gate 1 decision D4 | Implement with A-007 |
| A-028 | Sitemap | Eligibility and `lastmod` derive from the domain model; freshness is a stated SLA. The generation mechanism is not architectural | ARCHITECTURAL (contract) / APPLICATION (mechanism) | **Decided 2026-10-03** (SEO-001 D1): 24 hours. A newly eligible or newly ineligible canonical URL must be reflected within 24 hours without requiring an unrelated application deployment | Gate 2 §29 | Decide SLA; mechanism later |
| A-029 | Authority vocabulary | `source.authority` is the single authority vocabulary; `postings.source_type` duplicates it | ARCHITECTURAL | Accepted | Governance Reset §8; Gate 2 §27 | Retire the duplicate later, separately |
| A-030 | Official documents | Official-document retrieval is the common prerequisite for notification identity, post extraction and lifecycle dates | ARCHITECTURAL/DATA | Accepted finding; unscheduled | Gate 2 §24–§27: 0 of 208 documents are official | Schedule |
| A-031 | Invariant enforcement | Contract suite baseline: 61 pass, 15 fail, 24 skipped | APPLICATION | Accepted baseline (frozen) | W1A-001 | Preserve; failures close as their wave lands |
| A-032 | Scheduler configuration | The lifecycle endpoint accepts only POST; ingestion has not written on its schedule; secret handling is weak | INFRASTRUCTURE/OPERATIONAL | Deferred — not forgotten | Gate 2 §28 | Operational correction outside the core workstream |
| A-033 | Governance fields | Review, publishing, quality, verification and index-tier fields need an explicit owner before `postings` becomes a raw layer | ARCHITECTURAL/DATA | Accepted; mapping open | Protocol §16 | Map before legacy retirement |
| A-034 | Eligibility and selection process | Both are in the ontology; their tables exist and are empty; neither has been analysed | ARCHITECTURAL | **Accepted 2026-10-03** (ARC-001 §2 rule 4): value structures owned by a Post, with Recruitment-level defaults | Phase 0 baseline §1 | Implement with increment 10 |
| A-035 | Lifecycle vocabulary | Final enum, including whether an explicit unknown state exists | ARCHITECTURAL | **Accepted 2026-10-03** (ARC-001 §6): seven states including UNKNOWN; milestones are events | Gate 2 §26: 74 rows have an open stage and no deadline | Implement in increment 11 |
| A-036 | Orphan lifecycle notice | A lifecycle notice never creates a Recruitment by itself | ARCHITECTURAL | **Accepted 2026-10-03** (ARC-001 §7, U-02): held UNRESOLVED, retried, creates nothing | Governance Reset §8; Gate 2 §23 | Implement in increments 7 and 11 |
| A-037 | Unverified items | Deployment of commit `704725e`, and the HTTP contract suite, have never been verified against production | OPERATIONAL | Partly resolved 2026-10-03: the repository host records successful production deployments of `704725e` (2026-10-02) and `50317d2` (2026-10-03). Which deployment project serves the public domain is not established from here (A-046). HTTP suite still not run | Phase 0 report §12; deployment records | Run once from a machine with access |
| A-038 | Default privileges | Root cause of A-023: the schema's default privileges grant the public roles full rights on every new table, sequence and function, so each new object is born open | DATA/MIGRATION | **CLOSED 2026-10-03** by SEC-001 for the migration owner role | SEC-04 = 0 violations | Objects created by any other role are outside this protection: see A-040 |
| A-039 | Unauthenticated paid-API endpoint | `/api/query/normalize` calls a paid API with no authentication or rate limit | APPLICATION | Open — P2 | Gate 2 evidence | Later; not in SEC-001 |
| A-040 | Migration authority | All future production schema changes occur through the authoritative migration path and the approved ownership/privilege model. Direct production DDL or object creation outside that path is not an accepted production mechanism | DATA/OPERATIONAL | Accepted — in force from MIG-001 | SEC-001 approval §4; `supabase/migrations/README.md` | Preserve |
| A-041 | Broken database function | `refresh_posting_urgency_states()` reads a table that does not exist, so search and urgency values are populated on only 5 postings | DATA/MIGRATION | Open — P1 | MIG-001 baseline `functions/refresh_posting_urgency_states.sql` | Schedule; not in SEC-001 |
| A-042 | Unused organization-role enum | An enum `organization_role` (EXAM_AUTHORITY, RECRUITING_BODY, EMPLOYER) exists live and is used by no column. Relevant prior art for A-014 | ARCHITECTURAL (input) | Not adopted (ARC-001 §4): roles sit on relationships | MIG-001 baseline `02_objects.txt` | Remove at legacy retirement |
| A-043 | Function search path | All 9 database functions have a mutable `search_path` (provider linter warning) | DATA/MIGRATION | Open — P2 | Security advisor after SEC-001 | Later; fold into the lifecycle increment, which retires several of them |
| A-044 | Lifecycle endpoint method | The lifecycle endpoint accepts only POST while the scheduler issues GET, so it is not invoked successfully regardless of SEC-001 | INFRASTRUCTURE | Deferred (with A-032) | Gate 2 §28; local check during SEC-001 | Operational correction outside the core workstream |
| A-045 | Organizations hub renders empty | After the 2026-10-03 deployment `/organizations` loads but lists no organizations, while the database holds 125. The page swallows data errors and renders an empty list. Not caused by the database change in SEC-001 as far as evidence shows (application connects as the owner role; no database error logged since the migration); whether it pre-dates the deployment is unknown | APPLICATION | Open — P1, DEFERRED (not part of SEC-001 or of the SEO policy). Observed empty once at 11:03 UTC, minutes after the production build; observed populated (125 organizations) at about 11:20 UTC with no change made. Consistent with a build-time render that had no data and a later regeneration; cause not established | External fetch 2026-10-03; database log query | Establish cause before SEC-001 closes; fix in its own increment |
| A-046 | Deployment target ambiguity | Four deployment projects build every commit of this repository. The owner reports the account was changed; which project serves the public domain is not recorded | INFRASTRUCTURE / OPERATIONAL | Open — P2. The browser session available on 2026-10-03 was signed in to a different hosting account with no access to the team that owns the four projects, so the serving project could not be read | Deployment records for `50317d2` | Owner to confirm the serving project; retire the others later |
| A-047 | Logical architecture | `ARC001_LOGICAL_ARCHITECTURE.md` is the authoritative, technology-independent logical reference: ontology, identity, organization roles, provenance, lifecycle, ingestion and resolution | ARCHITECTURAL | **Accepted and frozen 2026-10-03** (ARC-001 CLOSED) | Owner approval with three textual corrections, 2026-10-03 | Preserve; change only on concrete contradictory evidence |
| A-048 | Source Document versions | A retrieved version is immutable; a changed re-retrieval is a new immutable version linked to the same external-document identity where that can be established. Versioning is a property of Source Document, not a separate entity | ARCHITECTURAL | Accepted 2026-10-03 (ARC-001 §5) | ARC-001 review correction 2 | Implement in increment 8 |
| A-049 | Exam cycle | A qualifying test is an Exam; its yearly cycle is not modelled. A possible "exam cycle" entity | ARCHITECTURAL | DEFERRED BY DESIGN until after legacy retirement | ARC-001 §8, U-08 | Revisit after increment 14 |
| A-050 | SEO-001 decisions | D2: `/recruitments/*` and `/positions/*` are `noindex, follow` until increment 13 — they are not canonical public projections yet. D3: dedicated Hindi listing pages deferred; cookie-switched listings remain English canonical pages. D4: unattached lifecycle notices are not exposed as canonical Recruitments; existing job-page treatment remains until the read projection work. JobPosting eligibility consumes the ARC-001 lifecycle and public representation; SEO defines no lifecycle rule | ARCHITECTURAL | Accepted 2026-10-03 | Owner decision on the SEO-001 pre-change report | Implement in SEO-001 steps 1–3 |

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
| U-07 | Validation of issuing vs employing organization against official examples | Model **CLOSED 2026-10-03** (ARC-001 §4). Empirical validation DEFERRED BY DESIGN → increment 8, gating increment 10 |
| U-08 | Scope of admissions, scholarships and qualifying tests | **CLOSED 2026-10-03** (ARC-001 §8): none is a Recruitment; admissions and scholarships are outside the canonical model; exam cycle deferred (A-049) |

## Implementation sequence

As fixed by the Execution Reset of 2026-10-03. Each increment has one
pre-change report and one result report. Not reordered without a concrete
dependency.

| # | Increment | Ledger | Status |
| --- | --- | --- | --- |
| 1 | SEC-001 pre-change report | A-022–A-024, A-038 | Approved 2026-10-03 |
| 2 | MIG-001 migration boundary, baseline snapshot, 18-column classification | A-025, A-026, A-040 | CLOSED 2026-10-03 |
| 3 | SEC-001 implementation, then verification | A-022–A-024, A-038 | Database part live and verified 2026-10-03. Application part deployed 2026-10-03 (`50317d2`). V7 PASS. Live homepage, job page, organization page PASS. Unauthenticated admin access and unauthenticated scheduler calls rejected: PASS. Pending owner: admin login, one admin mutation, scheduler secret configured, serving-project confirmation. **Not closed** |
| 4 | ARC-001 logical architecture specification | A-001–A-005, A-014–A-021, A-034–A-036, A-047–A-049 | **CLOSED 2026-10-03**. Documentation only; no code, schema or data changed |
| 5 | SEO-001 central SEO and locale policy | A-007, A-008, A-027, A-028, A-050 | Pre-change report approved in principle 2026-10-03 with four corrections (applied) and decisions D1–D4. Implementation waits for SEC-001 closure (sequencing decision, not an architectural dependency) |
| 6 | Organization registry | A-003, A-014 | |
| 7 | Posting classification | A-015, A-016 | |
| 8 | Official document acquisition | A-005, A-017, A-030 | |
| 9 | Recruitment identity resolution | A-002, A-020 | |
| 10 | Post extraction and resolution | A-006, A-021 | |
| 11 | Lifecycle and recruitment events | A-004, A-018, A-019 | |
| 12 | Shadow validation | A-010 | |
| 13 | Canonical read migration | A-010 | |
| 14 | Legacy retirement | A-010, A-033 | |
| 15 | Final launch / readiness gate | — | |

Tracked, not blocking: 18-column classification (with MIG-001), production
HTTP test and `704725e` verification (A-037), branch push, scheduler details
(A-032), sitemap mechanism (A-028), application hardening beyond SEC-001
(A-039).

## Scorecard

| Metric | After SEC-001 pre-change | After MIG-001 + SEC-001 | After ARC-001 |
| --- | --- | --- | --- |
| Contract test failures | 15 | 15 (same set; 8 new SEC tests pass) | 15 |
| Open P0s | 1 | 0 | 0 at database level |
| Unresolved decisions | 6 (all deferred by design) | 6 (all deferred by design) | 2 (U-04 → SEO-001; U-07 validation → increment 8), both deferred by design |
| — of which open architecture decisions (2026-10-03, after SEO-001 decisions) | | | 0 |
| — of which deferred empirical validation | | | 1 (U-07 validation → increment 8) |
| Implementation increments complete | 0 | 1 closed (MIG-001); SEC-001 deployed, awaiting V7 and remaining V8 | 2 closed (MIG-001, ARC-001); SEC-001 in final verification |
| Architecture decisions reopened | 0 | 0 | 0 |
