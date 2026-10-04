# SEO-001 — Public representation policy

**Status: policy approved by the owner 2026-10-03** (ledger A-007, A-027,
A-028, A-050). Implemented by `src/lib/seo` (canonical, hreflang, robots,
sitemap alternates) and `src/lib/structured-data.ts` (structured data).
Guarded by the contract suite under `tests/contracts`.

This policy defines how the entities of `ARC001_LOGICAL_ARCHITECTURE.md` are
represented publicly. It defines no entity, identity or lifecycle rule of its
own, and it changes no URL.

## 1. Policy: addresses, language, canonical, hreflang

One entity in one language has exactly one address; every other address for it redirects or declares that one as canonical.

**Addresses**

1. An entity page is addressed by entity type and slug: `/jobs/{slug}`, `/organizations/{slug}`, `/exams/{slug}`, `/articles/{slug}`. The slug is an address, not identity (ARC-001 section 3). A changed slug permanently redirects to the new one.
2. Canonical URLs are absolute, on the production origin, lower-case, without query string, fragment or trailing slash.
3. Existing URLs do not change in SEO-001.

**Language**

1. English is the default and has no prefix. Hindi lives under `/hi`. The `/en` prefix always redirects to the unprefixed address and never appears in a canonical, hreflang or sitemap entry.
2. A URL serves one language. The language is in the HTML as served; no script corrects it afterwards.
3. English and Hindi addresses of an entity differ only by the `/hi` prefix and resolve to the same entity identifier (A-008).
4. A Hindi version "exists" only when the entity has genuine Hindi content for its main fields. Translated interface labels around English content do not count.

**Untranslated Hindi pages.** When `/hi/…` is requested for an entity with no Hindi content, the page still renders (so links do not break) but is `noindex, follow`, its canonical points to the English address, it emits no hreflang, and it is not in the sitemap.

**Canonical**

| Case | Canonical |
| --- | --- |
| Indexable page | Itself, in its own language |
| Translated Hindi page | Itself (`/hi/…`) |
| Untranslated Hindi page | The English address |
| Filter, search or paginated view of a listing | The unfiltered listing |
| Legacy address that redirects | None; the redirect is the signal |

**Hreflang.** Emitted only when both language versions exist. When emitted it is complete and reciprocal: `en`, `hi` and `x-default` (English) on both pages, each pointing to canonical addresses. Pages with one language emit none.

**Cookie-switched listings.** `/`, `/jobs`, `/organizations`, `/exams` and `/articles` are declared English pages: served as English, canonical to themselves, no hreflang. The cookie switch stays as a visitor convenience. Dedicated Hindi listing addresses are a product decision, recorded as deferred (D3 below).

## 2. Policy: indexability, sitemap, structured data

A page is in the sitemap exactly when it is indexable, and both follow from one rule per page type.

| Page type | Indexable when | Primary structured data | Change made by SEO-001 |
| --- | --- | --- | --- |
| Home | Always | WebSite | None |
| Job listing `/jobs` | Unfiltered only | None | Filtered and searched views become noindex; canonical loses its query string |
| Job page | Public/indexable canonical job representation meeting the existing quality/indexability criteria; Hindi additionally requires genuine Hindi content | JobPosting is emitted only when the canonical public job/post representation is indexable and its evidenced lifecycle makes the opportunity currently actionable under the existing structured-data eligibility policy. SEO consumes the ARC-001 lifecycle and public representation and defines no lifecycle rule of its own. Breadcrumb, FAQ and Event as today | None |
| Organization page | English always; Hindi only with Hindi content | Organization, Breadcrumb | Hindi gate added; explicit robots rule; shared builders |
| Exam page | English always; Hindi only with Hindi content | Exam credential markup, Breadcrumb | Same as organization; Hindi hreflang and sitemap alternate only when real |
| Article page | Published; Hindi only with Hindi content | Article, Breadcrumb | None |
| Hubs: `/organizations`, `/exams`, `/articles`, `/categories`, `/categories/{slug}` | Always | Breadcrumb where present | `/exams` gains a canonical; `/organizations` and `/exams` join the sitemap |
| `/news`, `/commissions/{slug}` | Always | None | Gain a canonical; join the sitemap |
| `/recruitments/…`, `/positions/…` | Not before Canonical Read Migration. These pages are not canonical public projections yet. Until Canonical Read Migration establishes validated canonical Recruitment/Position projections, they must not participate in search indexing | None | **Become noindex** (decision D2) |
| `/search`, any filter or query view | Never | None | Becomes noindex, follow |
| Admin, API, technical paths | Never; disallowed in robots | None | None |

**Rules**

1. `noindex` pages are always `follow`, never in the sitemap, and never carry JobPosting or hreflang (A-027).
2. JobPosting markup appears on individual job pages only, never on listings, hubs, organization or exam pages (A-009).
3. All structured data is built by the shared library and emitted through the shared graph wrapper, so each page has one graph and each node one identifier at its canonical address.
4. Sitemap `lastmod` is the entity's last meaningful content change, not the build time.
5. A sitemap entry lists a Hindi alternate only when the Hindi version exists.
6. Sitemap freshness (U-04): approved at 24 hours. Acceptance condition: a newly eligible or newly ineligible canonical URL must be reflected in the sitemap within 24 hours without requiring an unrelated application deployment. The mechanism is an implementation detail and does not alter the logical architecture.

**Future public projection.** When canonical entities replace the flat records (Canonical Read Migration), eligibility switches to the ARC-001 projection: validated entities with editorial approval. Organization pages will then be indexable only for registry-confirmed organizations. Until the registry exists (Organization Registry) the current rule stays, because de-indexing organization pages on today's data would be a guess.

## Decisions



| ID | Question | Decision (owner, 2026-10-03) |
| --- | --- | --- |
| D1 (U-04) | Sitemap freshness | APPROVED: 24 hours, with the acceptance condition in section 2 rule 6 |
| D2 | `/recruitments/*` and `/positions/*` | APPROVED: `noindex, follow` until Canonical Read Migration, because they are not canonical public projections yet |
| D3 | Dedicated Hindi listing pages (`/hi/jobs` and so on) | DEFERRED. Cookie-switched listing pages remain English canonical pages |
| D4 | Unattached lifecycle notices | Not exposed as canonical Recruitments. Existing public job-page treatment remains until the canonical read projection work |

## Freeze addendum (2026-10-04, architect final review) — G1/G3 APPROVED and implemented locally; freeze after deploy verification

Incorporates the architect's seven points. No new SEO track. Defines one
rule: **JobPosting eligible = Tier A (public, indexable, complete) AND open
AND not expired AND an established hiring organization AND a real extracted
title.** A page may exist, even be indexable, without being JobPosting eligible.

Rules added: (1) eligibility gate above; (2) `hiringOrganization` is the
employing organization of the Post where established, otherwise the issuing
organization of the Recruitment, never a candidate; (3) `description` must be
a complete representation (responsibilities/qualifications/education visible on
the page), never a facts-only template; (4) expired or closed: no JobPosting,
page follows the lifecycle policy; (5) `validThrough` only from a real date,
never invented; (6) Google Indexing API for new, materially updated and
expired job URLs is part of the frozen architecture, implemented after
reliable canonical data, sitemap stays the discovery mechanism; (7) the unit
of one JobPosting for multi-post, multi-category, multi-location notices is an
implementation rule set from the real pilot, not assumed.

Verified implementation state (observed in code, `main` + local):
- G1 eligibility is decided in `buildJobPostingSchema` only by open stage,
  deadline not passed, and an extracted title (`postNames[0]`). It does NOT
  consult the content-quality tier, `review_status` or `is_expired`. Gap.
- G2 `hiringOrganization` = the posting's organization row (issuing body from
  ingestion). No employing-organization field exists (ARC-001 R3 gap).
- G3 description is `postings.description` as stored; no completeness check.
  The loader's facts-only template would pass the current builder. Gap.
- G4 expiry: stage and `validThrough` checks stop markup after the date; the
  lifecycle function covers postings, not recruitments. `validThrough` is
  omitted when unknown (correct).
- G5 visible page content: description, eligibility, responsibilities and
  requirements sections render when present; sufficiency is not enforced.
- G6 sitemap is generated from `index_tier = 'A'` with `updatedAt`; the
  per-URL change signal needed for the Indexing API can be taken from
  `updated_at`, `is_expired` and `index_tier` transitions. No gap in design;
  not implemented.
- G7 one posting row = one notice today.


### Pre-change decision (architect, 2026-10-04)

G1 and G3 approved. A Tier B, pending, rejected or expired page emits no
JobPosting. G3 belongs in the JobPosting eligibility gate, not in a blanket
page requirement: an incomplete page may exist, it is just not JobPosting
eligible. **Unit rule:** single-post recruitment = one resolved Post = one
JobPosting. Multi-post with distinct Posts resolvable = one JobPosting per
Post. Multi-post whose Posts cannot yet be represented = recruitment page, no
JobPosting; never a generic JobPosting for several different jobs. The
issuing organization is never copied into an employing-organization field;
Post-level employing organization stays the target.

### Implementation (local, unpushed)

- `evaluateJobPostingEligibility` in `src/lib/content-quality/gate.ts`: approved, not
  expired, open, Tier A, real hiring organization (pure rules in `src/lib/org-name.ts`),
  at most one post name, description not the facts-only template. `buildJobPostingSchema`
  calls it, so the builder and measurement use one rule.
- Contract tests SD-09a..j (pending, rejected, expired, Tier B x2, facts-only
  description, multi-post, bucket/title organization, positive case, `validThrough`
  never invented). The SD-02 fixture was made a complete Tier A posting.
- Not yet done: per-Post JobPosting (needs Post rows with vacancies and employing
  organization; the posts and vacancies increment). Until then no multi-post notice
  is JobPosting eligible.
- Measured on the real corpus (scratch, simulated aliases, after promotion):
  466 public pages, 0 JobPosting eligible. Reasons: not Tier A 464, facts-only
  description 466, multi-post unresolved 153, no longer open 17. The loader
  description and missing location are what hold eligibility back; enrichment,
  not the gate, is the next lever.
