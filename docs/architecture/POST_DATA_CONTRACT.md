# Post data contract — Phase 1 freeze

Status: **FROZEN 2026-10-07**. This document defines the minimum contract
for a Phase 1 Post. No decomposition or backfill should produce a Post that
violates these rules.

Phase 1 objective: discoverability. A Post must be independently indexable,
richly factual, and not carry fabricated or inferred data.

---

## Minimum required fields (a Post must have all of these)

| Field | Source | Constraint |
| --- | --- | --- |
| `posts.id` | PK | auto |
| `posts.slug` | write path | non-empty; unique within recruitment |
| `posts.name` | write path | non-empty; human-readable role title |
| `posts.recruitment_id` | FK | must reference a real recruitment row |
| `posts.position_id` | FK | must reference a real position row |

**URL contract:** A valid Post URL is `/jobs/{recruitment.slug}/{post.slug}`.
Both slugs are required and non-empty. This is enforced by the existing schema
(NOT NULL on both FK columns) and confirmed live as of 2026-10-07: all 1,030
posts in production satisfy it.

---

## Enrichment fields (populate where known; never fabricate)

These make each Post page factually rich. Carry them from the official source
or leave them NULL. Never infer or compute.

| Field | Notes |
| --- | --- |
| `posts.vacancy_total` | Total vacancy count for this post. 1,029 of 1,030 have this. |
| `posts.vacancy_details` | JSON breakdown by category (GEN/OBC/SC/ST etc.). |
| `posts.salary_min`, `posts.salary_max` | Monthly salary in INR. Currently 52 of 1,030 have this. |
| `posts.pay_level` | JSON pay-matrix reference (7th CPC level). |
| `posts.description` | Free-text description. Currently 8 of 1,030 have this. |
| `eligibilities.qualification_text` | Verbatim qualification requirement from official notification. Display only; no computation. |
| `eligibilities.experience_text` | Verbatim experience requirement. Display only. |
| `eligibilities.age_min`, `eligibilities.age_max` | Age bounds from official notification. Display only. |
| `eligibilities.age_as_on_date` | Date on which age is to be calculated. |
| `eligibilities.source_type`, `eligibilities.source_ref` | Provenance: where the eligibility text came from. |

**Phase 1 rule:** `qualification_expr`, `education_level`, `disciplines`,
`min_marks_pct`, `min_cgpa` and all other ELIG-001 computed columns exist in
the schema but must not be populated in Phase 1. They are dormant Phase 2
preparation. See A-082.

---

## Recruitment-level fields that feed the Post page

These live on the parent `recruitments` row and are shown on every Post page.

| Field | Importance | Current coverage |
| --- | --- | --- |
| `recruitments.official_notification_url` | P0 — required for source link | 930 / 1,030 posts (90%) |
| `recruitments.official_application_url` | High — apply button | present on many |
| `recruitments.application_start_date` | Medium — date display | partial |
| `recruitments.application_end_date` | High — deadline + JobPosting validThrough | partial |
| `recruitments.exam_date` | Medium — date display | partial |
| `recruitments.status` | Required — lifecycle | all 1,030 |

---

## Lifecycle rule

A Post is **live** when its parent recruitment has `status IN ('ACTIVE', 'UPCOMING')`
and `application_end_date` has not passed (or is NULL).

A Post is **expired** when `application_end_date` has passed or the recruitment
is in `RESULTS` status. Expired Post pages must not show misleading active
state or emit `JobPosting` structured data.

This is already implemented in `page.tsx` via the `recruitmentIsOpen` check.
Confirm it covers the `RESULTS` status cases.

---

## JobPosting structured data rule

One `JobPosting` per resolved Post, when the Post is live. None for:
- expired Posts (past `application_end_date`)
- recruitment in `RESULTS` status
- Posts with no `recruitment.slug` or `post.slug` (cannot form canonical URL)

Implemented in `src/app/(default)/jobs/[slug]/[post-slug]/page.tsx` and
tested in SD-09a..j. Frozen 2026-10-04; verified live 2026-10-07.

---

## State of the corpus (2026-10-07)

### posts table

| Metric | Count |
| --- | --- |
| Total posts | 1,030 |
| Has slug | 1,030 (100%) |
| Has name | 1,030 (100%) |
| Has recruitment_id | 1,030 (100%) |
| Has position_id | 1,030 (100%) |
| Has vacancy_total | 1,029 (99.9%) |
| Has salary data | 52 (5%) |
| Has official source on parent recruitment | 930 (90%) |
| Orphaned from recruitments table | 0 |

### recruitments with posts

| Status | Recruitments | Posts |
| --- | --- | --- |
| ACTIVE | 821 | 863 |
| UPCOMING | 232 | 167 |
| RESULTS | 27 | 0 |

**Gap:** 348 ACTIVE + 138 UPCOMING recruitments have no Posts at all. These
are the primary decomposition target (Phase 1 P0 item #1).

---

## The 14 unlinked postings (P0 item #5 — updated figure)

The HANDOFF noted "22 unlinked Posts". The current live figure is **14
postings** in the `postings` (legacy) table that have neither
`inferred_recruitment_id` nor `inferred_post_id`. They are APPROVED but
orphaned from the canonical graph.

These are not Posts in the `posts` table — they are legacy `postings` rows
that have not been linked to a canonical recruitment or post. Resolving them
means either:
(a) creating a matching recruitment + post row and setting the FK, or
(b) rejecting the posting if it's stale or a duplicate.

| Posting ID | Title | Source | Total Vacancies | Status |
| --- | --- | --- | --- | --- |
| 58 | UPSSSC FSL Main Examination 2026 Answer Key | ext-2 | 0 | Expired (valid_through past) |
| 76 | Delhi University Women's Association Recruitment 2026 | ext-3 | 0 | Expired |
| 77 | Directorate of Medical Education AP Recruitment 2026 | ext-3 | 0 | Expired |
| 128 | IIT Delhi Jr & Sr Project Assistant Recruitment 2026 | ext-5 | 2 | Active (no end date) |
| 129 | ITBP Constable GD Sports Quota Recruitment 2026 | ext-5 | 126 | Active (no end date) |
| 130 | NIT Calicut Research Assistant Recruitment 2026 | ext-5 | 1 | Active (no end date) |
| 131 | NIT Agartala Non-Teaching Recruitment 2026 | ext-5 | 51 | Active (no end date) |
| 138 | DTU Delhi AI Engineer Recruitment 2026 | ext-5 | 2 | Active (no end date) |
| 139 | Goa Rehabilitation Board Recruitment 2026 | ext-5 | 13 | Active (no end date) |
| 146 | ITBP Constable (GD) Sports Quota Online Form 2026 | ext-1 | 126 | Duplicate of #129? |
| 165 | EIL Associate Engineer Online Form 2026 | ext-1 | 20 | Closing 2026-10-12 |
| 166 | UPSC Advt No. 12/2026 | ext-1 | 13 | Closing 2026-10-16 (HIGH VALUE) |
| 215 | HLL Various Posts Online Form 2026 | ext-1 | 16 | Expired |
| 219 | PSSSB Jail Warder Result 2026 | ext-1 | 532 | Result stage |

**Priority for resolution:**
- Posting 166 (UPSC Advt 12/2026) is explicitly mentioned in the architecture docs
  (PILOT_OFFICIAL_SOURCE_REPORT.md) as a high-value target with official data.
  It closes 2026-10-16. Link or decompose first.
- Postings 165 (EIL, closes 2026-10-12) — near deadline.
- Postings 58, 76, 77, 215: expired, 0 vacancies. Reject.
- Postings 129/146: likely duplicates of each other (same ITBP 126-post notice). Reject one.
- Posting 219: Result stage — reject or link to RESULTS recruitment.

---

## What comes next

1. **Decompose legacy recruitments** — 486 ACTIVE/UPCOMING recruitments have
   no Posts. The write path creates one Post per notice. Decompose into one
   Post per role using POSTVAC rules.
2. **Resolve 14 unlinked postings** (priority: 166, 165, then expire/reject the rest).
3. **Sitemap** — add all 1,030 Post URLs to the sitemap (currently only
   recruitment-level pages are in it).
4. **Internal linking** — role pages (`/posts/{role-slug}`) must link to
   each Post leaf page for that position.
