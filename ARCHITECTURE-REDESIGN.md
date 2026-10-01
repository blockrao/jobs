# Content Architecture Redesign: Structure First, Scraping Second

**Date:** 2026-10-01
**Trigger:** Checking the 212 live postings against the Content Quality
Standard surfaced that the v2 "canonical" layer (recruitments/posts) is not
real structure — it's a best-effort inference pass that silently dumps
unrelated postings (IBPS admit card, a district commissioner notice, EMRS
results, an NIC posting, an IIM posting) into one fake bucket called
"PSU General Recruitment 2026." The fix is not to patch that inference. The
fix is to stop treating the scraped row as the thing we publish.

## The one-sentence problem

We built a scraper that writes directly into a page-shaped table
(`postings`), then tried to bolt structure onto it afterward with fuzzy
keyword matching. Structure has to exist *before* a scrape is accepted —
scraping's only job is to fill in facts the structure already demands.

## Target entity model

These are the facts that must exist, independent of any scraper, because
they are what a recruitment *is*:

1. **Organization** — a real government body. Already reliable (slug-based).
2. **Exam** *(optional)* — a recurring program an org runs (SSC CGL as a
   series, distinct from "SSC CGL 2026" as one instance of it).
3. **Recruitment** — one specific announced hiring round. **This is the
   canonical unit**, not `postings`. Identity key: `organizationId` +
   `officialNotificationNumber` (preferred, it's what the government itself
   uses to distinguish recruitments) — falling back to `organizationId` +
   `examId` + `year` with a real similarity threshold only when no
   notification number was captured. Never "closest existing recruitment by
   substring match," which is what produced the catch-all bucket.
4. **Post** — one role inside a recruitment ("Research Associate III"). Identity
   key: `recruitmentId` + normalized post name. This is where the real job
   title lives — the thing `JobPosting.title` is legally supposed to be.
5. **Vacancy breakdown** — category/location split, child of Post.
6. **Eligibility** — structured (qualification level, age min/max +
   category relaxations, domicile, experience), child of Post. Not a prose
   paragraph.
7. **SourceDocument** — the raw captured page/PDF, provenance tier
   (official/employment-news/aggregator), url, hash, timestamp. Kept
   forever, unmodified. *(Declared in schema-v2.ts already — but the raw
   content column doesn't exist on the live table. Nothing downstream can
   be trusted until this is actually stored.)*
8. **Sighting** *(what `postings` should become)* — one row per
   `(source, external_id)`: what one specific source said, before
   resolution. Pre-publication. Never has its own public page.

## The pipeline, in enforced order

```
SCRAPE
  → raw SourceDocument saved verbatim                    [currently skipped]
EXTRACT
  → structured facts pulled from that document into a
    Sighting: post name(s), vacancies, eligibility,
    location, apply/official URLs, dates               [currently doesn't exist —
                                                           NormalizedPosting only
                                                           carries title+description]
RESOLVE
  → match the Sighting onto a canonical Recruitment,
    using the identity key above — or CREATE a new one.
    Never fall back to "nearest existing recruitment."  [currently: keyword/substring
                                                           match → wrong bucket]
  → match/create the canonical Post the same way
MERGE
  → write facts onto the canonical Recruitment/Post.
    Conflicting sources: official beats aggregator;
    disagreements are recorded, not silently resolved.
GATE
  → src/lib/content-quality/gate.ts decides A/B/C —
    on the canonical Post/Recruitment, not the raw row.
PUBLISH
  → the public page is generated FROM the canonical
    entity. The Sighting's raw title never reaches a
    <title> tag or JobPosting.title directly.
```

## Why this fixes what we actually found

- **No more catch-all buckets.** Resolution either matches a real
  recruitment by its identity key or creates a new one. It can't silently
  land in an unrelated existing one the way substring matching does.
- **`JobPosting.title` becomes trustworthy by construction.** It's
  `Post.name` — which only exists once extraction has actually produced it.
  Nothing can publish without it, instead of us discovering after the fact
  (as we just did) that the "extracted" title is a verbatim copy of the
  scraped headline.
- **Five aggregators describing the same recruitment resolve to one
  Recruitment/Post**, not five near-duplicate pages — dedup happens at
  resolution, which is where the standard says it belongs (rule 7).
- **The gate gets simpler**, not more complex: it only ever evaluates
  "does this Recruitment/Post have what it needs," never "does this random
  scraped row happen to."

## What actually has to change in code, in order

1. **Persist raw source content.** `SourceDocument.rawContent` is declared
   in `schema-v2.ts` but doesn't exist on the live table. Everything below
   depends on this existing first.
2. **Replace `NormalizedPosting`** (today: `slug`, `title`, `description`,
   `examSlug`, `timeline` — nothing else) with a real extraction output that
   includes eligibility, vacancies, location, apply/official URLs, and
   post name(s). Right now nothing in the pipeline extracts any of these —
   that's the actual reason 205/212 postings are missing them, not a data-
   entry backlog.
3. **Replace `inferPositionId`/`inferRecruitmentId`** (keyword lists +
   substring matching) with identity-key resolution, including a genuine
   "create a new Recruitment" path instead of a silent best-guess fallback.
4. **Collapse `schema.ts` and `schema-v2.ts` into one file.** They are two
   independently hand-maintained Drizzle definitions of the *same* physical
   `postings` table. I just had to duplicate the new gate columns into both
   by hand to keep them from drifting — that's the mechanism, live, right
   now, by which this kind of corruption happens. This should be fixed
   regardless of the larger redesign; it's a standing risk on its own.
5. **Decide the canonical public URL shape** — see the open decision below.
6. **Migrate the 212 existing rows through the new resolution step** once
   extraction exists, rather than hand-patching them where they sit.

## What this is *not*

Not a rewrite that blocks shipping. The fixes already made in this session —
the application-open/deadline check, the JobPosting-title guard (refuses to
emit a mislabeled title rather than fake one), the broken hreflang removal,
sitemap scoped to Tier A, HTML stripped from meta descriptions — are correct
under either architecture and stay as-is. What changes is where *new* data
comes from: new ingestion work should go through extract → resolve → merge
→ gate → publish, instead of writing straight into a page-shaped table and
inferring structure afterward. The gate itself (`gate.ts`) doesn't change —
it just gets fed from canonical entities instead of raw Sightings once step
2–3 above exist.

## Open decision

Recruitments and Posts (31 and 224 rows) are small and cheap to regenerate.
Given how corrupted the current linkage is (one bucket covering five
unrelated organizations), I'd lean toward **truncating and rebuilding
Recruitment/Post from scratch** once resolution logic is fixed, rather than
trying to untangle the existing rows in place. Sightings (the 212 postings)
and everything else stay untouched — only the canonical layer gets rebuilt.
That's a call worth confirming before I touch it, since it's destructive to
that layer even though it's cheap to regenerate.
