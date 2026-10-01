# Content Architecture Redesign: Structure First, Scraping Second

**Status: implemented.** This document originally proposed the design below;
everything in "The pipeline, in enforced order" and "Target entity model" is
now built and type-checks against the live database. The "What actually has
to change in code" and "Open decision" sections from the proposal are
resolved and kept at the bottom as a record of what was decided and why.

**Trigger:** Checking the 212 live postings against the Content Quality
Standard surfaced that the old "canonical" layer (recruitments/posts) was
not real structure — it was a best-effort inference pass that silently
dumped unrelated postings (IBPS admit card, a district commissioner notice,
EMRS results, an NIC posting, an IIM posting) into one fake bucket called
"PSU General Recruitment 2026." The fix was not to patch that inference. The
fix was to stop treating the scraped row as the thing we publish.

## The one-sentence problem (as found)

We had a scraper that wrote directly into a page-shaped table (`postings`),
then tried to bolt structure onto it afterward with fuzzy keyword matching.
Structure has to exist *before* a scrape is accepted — scraping's only job
is to fill in facts the structure already demands.

## Target entity model (implemented in `src/db/schema.ts`)

1. **Organization** — a real government body. Slug-based identity.
2. **Commission** *(optional parent of Exam)* — the body that *conducts* an
   exam (SSC, UPSC, IBPS...). Not the same thing as the recruiting
   organization — an exam has one commission, but is used across many
   different organizations' separate recruitments. There is no
   `exams.organizationId`; that relationship doesn't exist in reality
   (discovered while fixing page components that assumed it did — see
   "Corrections found during verification" below).
3. **Exam** *(optional)* — a recurring program a commission runs (SSC CGL as
   a series, distinct from "SSC CGL 2026" as one instance of it).
4. **Recruitment** — one specific announced hiring round. **This is the
   canonical unit**, not `postings`. Identity key: `organizationId` +
   `officialNotificationNumber` (preferred — enforced by a unique partial
   index, `recruitments_org_notification_idx`) — falling back to
   `organizationId` + `examId` + `year`, narrowed by title-token-overlap
   similarity (`FALLBACK_SIMILARITY_THRESHOLD = 0.6`) only when no
   notification number was captured. Never "closest existing recruitment by
   substring match" — that's what produced the catch-all bucket.
5. **Post** — one role inside a recruitment ("Research Associate III").
   Identity key: `recruitmentId` + normalized post name (case-insensitive
   exact match, enforced by `posts_recruitment_name_idx`). This is where
   the real job title lives — the thing `JobPosting.title` is legally
   supposed to be. A Post is never created from a scraped headline as a
   stand-in; if extraction didn't produce a real title, the posting's
   `inferredPostId` stays null (the gate already blocks Tier A on a missing
   extracted title for exactly this reason).
6. **Vacancy breakdown** (`vacancies`) — category/location split, child of
   Post.
7. **Eligibility** (`eligibilities`) — structured (qualification level, age
   min/max + category relaxations, domicile, experience), child of Post.
8. **SourceDocument** (`sourceDocuments`) — the raw captured page/PDF,
   provenance tier via its parent `Source.authority`
   (official/employment-news/aggregator), url, content hash, timestamp.
   `rawContent` now actually exists as a column and is populated by the
   writer on every ingest.
9. **`postings`** (unchanged table, reinterpreted) — one row per
   `(source, externalId)`: what one specific source said, before
   resolution — the "Sighting" from the original proposal. It links to its
   resolved canonical entities via `inferredRecruitmentId`/`inferredPostId`
   (both real foreign keys now, not loose integers). Still has its own
   public page (unlike the original proposal's "never has its own public
   page") because the 212-postings content-quality-gate work from this same
   session depends on `postings` being the directly indexable/served row;
   revisiting that split is future work, not blocking.

## The pipeline, in enforced order (implemented)

```
SCRAPE      src/ingest/adapters/*            → RawPosting
                                                (already extracted eligibility,
                                                 vacancies, location, apply/
                                                 official URLs, postNames —
                                                 this was never actually
                                                 missing; see corrections below)
DEDUPLICATE src/ingest/deduplicate.ts         → DedupedPosting
NORMALIZE   src/ingest/normalize.ts           → NormalizedPosting
              (now passes every RawPosting field through untouched instead
               of discarding everything but title/description)
RESOLVE     src/ingest/resolve.ts             → ResolvedRecruitment / ResolvedPost
              (identity-key match or create; never "nearest existing")
GATE        src/lib/content-quality/gate.ts   → {tier, missing, disqualified?}
              (evaluated on the extracted/normalized facts, A/B/C)
WRITE       src/db/operations/write-postings-v2.ts
              → persists the Sighting (postings row) + SourceDocument with
                rawContent, resolves onto Recruitment/Post, stamps indexTier
PUBLISH     src/app/jobs/[slug]/page.tsx       → noindex unless indexTier === "A"
```

## Why this fixes what was found

- **No more catch-all buckets.** Resolution either matches a real
  recruitment by its identity key or creates a new one.
- **`JobPosting.title` is trustworthy by construction.** It's the extracted
  `postNames[0]` / `Post.name` — nothing publishes as Tier A without it.
- **The gate evaluates real facts**, not a raw scraped row missing
  everything downstream code silently dropped.

## Corrections found during verification (this pass)

Running `tsc --noEmit` against the unified schema — rather than trusting
what any individual schema file claimed — surfaced three more places where
declared structure didn't match the live database, the same class of bug
that caused the original corruption:

1. **`locations`** was declared with `stateCode`/`stateName`/`districtName`/
   `cityName`/`latitude`/`longitude`/`hierarchyPath`/`updatedAt`. None of
   those columns exist. The live table is a flat `(name, slug, type,
   state_name_hi, district_name_hi, city_name_hi)` list of states/UTs/
   national — confirmed against `information_schema.columns`, not assumed.
   Fixed in `schema.ts`.
2. **`exams.organizationId` doesn't exist**, and never did — an exam's real
   parent is `commissionId` → `commissions`. Several page components
   (`/exams/[slug]`, `/organizations/[slug]`, both `[locale]` variants, the
   `get-exams.ts`/`get-organizations.ts` operations) had been written
   against an imagined `exams.organizationId` / `organizations.roles` /
   `organizations.website` / `exams.name`/`shortName`/`frequency`/
   `examPattern`/`syllabus` shape that was never real. Fixed to use the
   actual columns (`exams.label`, `organizations.websiteUrl`,
   `organizations.sector`) and the actual relationship (org → recruitments
   → exam, not org → exam directly).
3. **`posts.totalVacancies`** doesn't exist; the real column is
   `vacancyTotal`. Fixed in `/recruitments/[slug]`.

None of this was guessed — each was checked against live
`information_schema.columns` before being changed, the same discipline
applied to the original `postings`/`organizations_new` audit.

## What this is *not*

Not a rewrite that blocks shipping. The P0 fixes from earlier in this
session — the application-open/deadline check, the JobPosting-title guard,
the broken hreflang removal, sitemap scoped to Tier A, HTML stripped from
meta descriptions — are correct under this architecture and are unchanged.

## Decisions made (resolved from the original "Open decision")

- **Truncated and rebuilt Recruitment/Post from scratch** rather than
  untangling the corrupted linkage in place (user confirmed: "Yes to both").
  Sightings (the 212 postings) were left untouched — the user explicitly
  scoped this rewrite to the platform structure, not that data: "you may
  ignore these 212 articles or job postings... that is not the hard part."
- **One schema file.** `schema.ts` and `schema-v2.ts` were two independently
  hand-maintained Drizzle definitions of the same physical database and had
  already drifted from each other and from reality. `schema-v2.ts` is
  deleted; `getDbV2()` is kept only as a deprecated alias for `getDb()` so
  existing call sites don't need a second mechanical pass.
- **Dead code removed, not patched**: the old `write-postings.ts`
  referenced columns that never existed on the live `postings` table and
  could never have run successfully — deleted rather than fixed, per
  "rewrite over repair." Same for `publishing-queries.ts`, which referenced
  a `publishingStatus`/`dataCompletenessStatus`/... shape that also never
  existed and had no callers.

## Known limitation

The rewritten pipeline (`resolve.ts`, `normalize.ts`, `write-postings-v2.ts`)
type-checks cleanly against the live schema but has not been run against a
real scrape in this environment — there's no network path from this sandbox
to the adapters' scrape targets. The first real ingestion run is the actual
end-to-end verification and should be watched closely (dry-run first).
