# Future-date and publication-provenance audit

**Snapshot:** 31 October 2026, 13:50:15 Asia/Kolkata  
**Database clock:** 31 October 2026, 08:20:15 UTC  
**Project:** JobOye production Supabase  
**Method:** Read-only SQL only. No rows, schemas, policies, or application code were modified by the database audit.

## Executive finding

The shared lifecycle and deadline-write foundations are present on `main` (PRs #186 and #192), and the Recent Notifications feed now requires a source notification date plus field-level issuer/fact evidence.

The production inventory still contains historical date values that have not been reconciled against that evidence contract. The most important result is **604 Recruitments with future application deadlines and zero field-level source-provenance records**. These deadlines may be legitimate, but they cannot currently be treated as issuer-verified facts.

The audit also found two future notification dates, three application-start/deadline contradictions, eight future exam dates, and one future result date.

No historical correction or suppression should be applied from this report alone.

## 1. Date-field inventory

The canonical Recruitment table contained **6,365 records** at the audit snapshot.

| Field | Null | Future | Future within 30 days | Future over 30 days | Pre-1900 / sentinel |
|---|---:|---:|---:|---:|---:|
| `notification_date` | 4,992 | 2 | 1 | 1 | 0 |
| `application_start_date` | 6,092 | 17 | 14 | 3 | 0 |
| `application_end_date` | 3,923 | 604 | 577 | 27 | 0 |
| `exam_date` | 6,340 | 8 | 5 | 3 | 0 |
| `result_date` | 6,363 | 1 | 1 | 0 | 0 |
| `admit_card_date` | 6,365 | 0 | 0 | 0 | 0 |
| `interview_date` | 6,365 | 0 | 0 | 0 | 0 |

Future is evaluated against the database transaction timestamp, not a hard-coded date. A future application deadline, exam or result is not automatically invalid: these are naturally scheduled events. A future `notification_date`, by contrast, cannot be presented as an already-published notification without an explicit issuer explanation.

## 2. Future application deadlines: 604 records

| Evidence check | Records |
|---|---:|
| Future application deadlines | 604 |
| Lifecycle status ACTIVE | 602 |
| Lifecycle status UPCOMING | 2 |
| Global verification status VERIFIED / MANUALLY_VERIFIED | 27 |
| Exact `official_link_source = MANUAL_VERIFIED` | 0 |
| HTTPS notification URL present | 499 |
| Complete issuer-authority review | 0 |
| Complete `hub:application_end_date` fact review | 0 |
| Both issuer and deadline-fact reviews complete | 0 |
| Aggregator extraction-origin signal | 409 |
| No `metadata.source_provenance` record | 604 |
| Linked source observations | 187 |
| Linked observations from an OFFICIAL source registry entry | 0 |

The 187 linked observations were from aggregated sources (`fja` and `ext-1`), not issuer-authority observations. An HTTPS URL is only a URL-format property; it does not establish that the host is the recruiting authority or that the deadline was checked against its notice.

**Interpretation:** all 604 future deadlines remain unverified under the current field-level provenance contract. This does not prove that all 604 values are wrong. It means the platform does not currently have the evidence required to assert them as verified official deadlines.

The 27 globally verified records are not sufficient evidence: none has the exact manually verified link-source state, a complete issuer review, or a field-specific deadline review.

## 3. Future notification dates: two records

| Recruitment ID | Recruitment | Notification date | Status | Source signals | Finding |
|---:|---|---|---|---|---|
| 6643 | CSIR CGCRI Project Assistant II Recruitment 2026 | 1 Nov 2026 | UPCOMING | `institutional_aggregation`; metadata verified=false; no official notification URL; no linked source observation | Future notification date requires issuer review |
| 6552 | CSIR CMERI Recruitment 2026 | 31 Mar 2027 | UPCOMING | `institutional_aggregation`; metadata verified=false; no official notification URL; no linked source observation | Future notification date requires issuer review |

Both records carry global `verification_status = VERIFIED`, while their enrichment metadata says `verified = false`. Neither has an official notification URL or a field-level source review. This is a verification conflict, not a basis for accepting the future notification date.

The current Recent Notifications implementation correctly excludes these records because it requires a non-future notification date and a complete issuer/date evidence chain.

## 4. Future application starts: 17 records

Three records have an application start later than their already-past application deadline. All three are marked CLOSED and carry aggregator extraction signals.

| Recruitment ID | Recruitment | Start date | Stored deadline | Status | Classification |
|---:|---|---|---|---|---|
| 732 | DRDO CASDIC Paid Intern Recruitment 2026 | 1 Dec 2026 | 11 Oct 2026 | CLOSED | Start-after-deadline contradiction |
| 784 | DCPU Tiruchirappalli Recruitment 2026 | 31 Dec 2026 | 7 Oct 2026 | CLOSED | Start-after-deadline contradiction |
| 1004 | ISI Project Linked Research Associate I Recruitment 2026 | 31 Mar 2027 | 20 Oct 2026 | CLOSED | Start-after-deadline contradiction |

These three should be prioritised for official-notice comparison. Their stored dates must not be silently corrected from the aggregator observation.

The remaining 14 future application starts have no linked official-source observation. Some are marked UPCOMING or ACTIVE and may be legitimate scheduled openings; they still require issuer evidence before being represented as verified.

## 5. Future exam and result dates

There are eight future exam dates:

| Recruitment ID | Recruitment | Exam date | Lifecycle status |
|---:|---|---|---|
| 6643 | CSIR CGCRI Project Assistant II | 1 Nov 2026 | UPCOMING |
| 6544 | APPSC 106 Various Posts | 6 Nov 2026 | UPCOMING |
| 6413 | AIIMS Gorakhpur Faculty Recruitment | 14 Nov 2026 | ACTIVE |
| 6574 | Tripura Employees State Insurance Society Recruitment | 16 Nov 2026 | UPCOMING |
| 2374 | National Insurance Company AO Recruitment | 17 Nov 2026 | CLOSED |
| 6422 | Oil India Executive Recruitment | 28 Dec 2026 | UPCOMING |
| 2376 | TNPSC Recruitment 2026 | 10 Jan 2027 | ACTIVE |
| 2717 | Chhattisgarh Staff Selection Commission Recruitment | 10 Jan 2027 | ACTIVE |

The National Insurance Company exam date occurs after the application window has closed; that sequence is not inherently contradictory. It still needs an official exam-schedule source.

One future result date was found: GMCH Chandigarh Recruitment (ID 6541), 10 November 2026, lifecycle CLOSED. A scheduled result after application closure is plausible, but the record has no official notification URL or field-level source evidence.

## 6. Date semantics and discovery rules

The following semantics must remain separate:

- `notification_date`: when the issuing authority published the notification.
- `source_observations.observed_at` / source inventory `first_seen_at`: when JobOye or a source collector first observed the record.
- `created_at`: when the canonical database row was created.
- `updated_at`: when the canonical record was last changed.
- `application_start_date`, `application_end_date`, `exam_date`, and `result_date`: separate recruitment lifecycle events.

Neither `created_at` nor `updated_at` may substitute for `notification_date` or JobPosting `datePosted`.

The mainline Recent Notifications filter now uses only `notification_date`, rejects future values, and requires issuer and field-level notification-date evidence. The Post Leaf publication-date fallback is being corrected separately in PR #211.

The deadline contract treats cutoffs as exclusive instants; date-only India deadlines are represented by midnight immediately after the stated IST calendar day. The UI formatter currently does not declare an explicit timezone, so the rendered date for exclusive date-only boundaries must be verified as a separate follow-up before we claim timezone display correctness.

## 7. Decisions and next actions

1. **Do not mass-edit or suppress the 604 future deadlines.** They require a record-level review using issuer evidence.
2. Prioritise the three start-after-deadline contradictions (Recruitment IDs 732, 784 and 1004).
3. Review the two future notification dates (IDs 6643 and 6552) against the issuing authorities.
4. Verify the 14 remaining future application starts, eight future exam dates and one future result date against official schedules.
5. Preserve the current Recent Notifications source-evidence gate. Do not restore a `created_at` fallback.
6. Complete the official-source provenance gate before treating aggregator-derived dates or facts as verified.
7. Add regression coverage for source-date nulls, future notification dates, date-only IST cutoff display and timestamp/first-seen separation.

## 8. Reproduction

Run `scripts/audits/future-date-provenance-read-only.sql` using a read-only database role. It returns the date-field summary, future-deadline evidence summary and a record-level future-date manifest. It contains SELECT statements only and is wrapped in a read-only transaction.

**Audit disposition:** read-only investigation complete; historical remediation not authorised by this audit.
