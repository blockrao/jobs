# Future-date and freshness reconciliation — read-only audit

**Audit date:** 31 October 2026 (IST)  
**Production project:** `cusxodjgkrttwmdmhvso`  
**Reproduction:** `scripts/audits/future-date-freshness-reconciliation-read-only.sql`  
**Method:** SELECT-only; no production writes

## Current production snapshot

| Date cohort | Count |
|---|---:|
| Future notification dates | **2** |
| Future application start dates | **17** |
| Future application deadlines | **589** |
| Future exam dates | **8** |
| Start date later than application deadline | **3** |

The 589 future deadlines are not inherently anomalous: many may be legitimate open recruitment windows. Their evidence coverage is the concern:

| Future-deadline evidence indicator | Count |
|---|---:|
| Lifecycle ACTIVE | 587 |
| Lifecycle UPCOMING | 2 |
| Global verification status VERIFIED / MANUALLY_VERIFIED | 26 |
| `official_link_source = MANUAL_VERIFIED` | **0** |
| Has syntactically HTTPS notification URL | 485 |
| Source metadata says `verified=true` | **0** |
| Has one of the three extraction-origin labels | 394 |

An HTTPS URL is only syntax, not proof of issuer ownership or record identity. A global VERIFIED flag is also not enough when the source metadata says unverified or the issuer evidence is absent.

## High-priority notification-date exceptions

The two future notification dates are:

| Recruitment ID | Organisation | Notification date | Existing evidence |
|---:|---|---|---|
| 6552 | CSIR-Central Mechanical Engineering Research Institute | 31 Mar 2027 | No official notification URL; `institutional_aggregation`; source metadata `verified=false`; global status VERIFIED |
| 6643 | Council of Scientific and Industrial Research (CSIR) | 1 Nov 2026 | No official notification URL; `institutional_aggregation`; source metadata `verified=false`; global status VERIFIED |

Neither should be presented as an issuer-confirmed publication date until the exact recruiting-body notice is inspected. Recruitment 6552's existing official CSIR-CMERI vacancy page describes a walk-in on 28–29 Oct 2026, which is inconsistent with the stored future notification date and requires record-level reconciliation. Recruitment 6643 has a likely CGCRI Project Staff page match, but the exact advertisement/PDF and dates still require inspection.

## Application start-date exceptions

The 17 future start dates require a distinction between:
- a legitimate scheduled opening date, supported by an official notice;
- a date copied from an aggregator or unrelated notice;
- a start date stored on the wrong Recruitment/organisation;
- a date-order contradiction.

Three records have `application_start_date > application_end_date` and must be reviewed before their dates or lifecycle are trusted:

- Recruitment 1004 — Indian Statistical Institute; start 31 Mar 2027, deadline 20 Oct 2026.
- Recruitment 784 — District Child Protection Unit Tiruchirappalli; start 31 Dec 2026, deadline 7 Oct 2026.
- Recruitment 732 — Combat Aircraft System Development and Integration Centre (DRDO); start 1 Dec 2026, deadline 11 Oct 2026.

The other future starts are not automatically wrong, but many have no official notification URL or field-level evidence. The full record-level query returns all affected IDs, source metadata, URLs, timestamps and a suggested review disposition.

## Relationship to earlier work

- PR #211 removed `posts.created_at` / ingestion time as the fallback for Post Leaf `datePosted`.
- PR #186/#188 aligned deadline precision, timezone, official-source authority and review-required reconciliation for new writes.
- The earlier #212 audit recorded the same broad future-date issue. This refresh shows that the cohort has changed: 589 future deadlines, not the earlier 604.
- The source-origin audit (#206/#208/#214) shows why a populated global verification flag cannot independently validate dates.

## Safe disposition

1. Keep future notification dates with no issuer evidence out of any “newly published” or `datePosted` claim.
2. Review the three start-after-deadline contradictions first.
3. Verify scheduled future starts/exams against exact official notice text and any corrigenda.
4. Do not infer publication date from `created_at`, `updated_at`, first-seen or ingestion time.
5. Do not rewrite dates or statuses until a row-level official-evidence dry run is reviewed and approved.

No production rows, deadlines, lifecycle states, verification labels, canonical IDs or URLs were changed. This audit completes the current measurement/reporting step for #202; official evidence review and any approved corrections remain separate work.
