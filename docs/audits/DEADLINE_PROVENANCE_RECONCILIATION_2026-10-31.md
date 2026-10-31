# Historical deadline provenance reconciliation — read-only audit

**Audit date:** 31 October 2026 (IST)  
**Production project:** `cusxodjgkrttwmdmhvso`  
**Method:** SELECT-only queries; no production writes  
**Reproduction:** `scripts/audits/deadline-provenance-reconciliation-read-only.sql`

## Executive result

The current parser/writer implementation now preserves deadline precision and timezone evidence for new observations, and the canonical writer fails closed for non-official or incomplete evidence. That does **not** repair historical observations.

A fresh read-only query over all canonical Recruitment rows with `application_end_date` found:

| Measure | Count |
|---|---:|
| Canonical Recruitments with a deadline | **2,442** |
| With any linked legacy source observation | **921** |
| With a non-empty observed `facts.lastDate` | **920** |
| With `facts.deadlinePrecision` | **0** |
| With `facts.deadlineTimezoneBasis` | **0** |
| With `facts.deadlineSourceText` | **0** |
| With an exact instant match to a linked observed `lastDate` | **916** |

The observation-to-Recruitment link in this audit is a read-only bridge through `source_observations.posting_id → postings.id → postings.inferred_recruitment_id`. This does not make legacy `postings` canonical; it only exposes the observation lineage that exists today.

The 916 exact timestamp matches are not evidence that the stored timestamp semantics are correct. The observations do not preserve whether the source value was date-only or date-time, the original source text, or the timezone basis. In addition, the linked observations are not necessarily official issuer evidence.

## Canonical timestamp distribution

| Stored deadline time in Asia/Kolkata | Recruitments |
|---|---:|
| 05:30 | **2,008** |
| 23:59 or later | **358** |
| Other local times | **76** |

No row fell at 00:00 IST in this snapshot. The 05:30 IST cluster is consistent with UTC-midnight storage; it is a diagnostic pattern, not sufficient evidence to shift any date. The 23:59+ cluster may represent deliberate end-of-day semantics or other normalization. The 76 remaining times require record-level evidence.

## Implementation status

- PR #186/#188 established the date-only vs date-time parser contract, India-local handling where explicitly supported, deadline provenance fields, official-source authority gate, and review-required reconciliation for ambiguous corrections/extensions.
- PR #211 removed ingestion timestamps as the Post Leaf publication-date fallback.
- PR #221 tightened official URL / JobPosting evidence acceptance.
- The historical rows remain unresolved because their observations do not contain the new precision fields.

## Required next step

Build a deterministic row-level remediation proposal by joining each canonical deadline to available source observations and source documents, then classify each row:

1. `RECOVERABLE_OFFICIAL_EVIDENCE` — exact issuer notice/source document can establish source text, precision, timezone and deadline.
2. `SECONDARY_ONLY` — only aggregator/trusted-secondary evidence exists; do not backfill canonical deadlines from it.
3. `AMBIGUOUS_LEGACY_TIMESTAMP` — no source text/precision evidence; retain current value pending manual review.
4. `CONFLICTING_OFFICIAL_EVIDENCE` — issuer evidence differs from canonical value; route to correction review, never auto-shift.

The next report must include the Recruitment ID/slug, current timestamp, source observation/document IDs, source authority, raw source text, proposed effective instant, confidence and disposition. It must not update production.

## Safety and disposition

- No deadline was shifted, rewritten, backfilled or deleted.
- No lifecycle/status field was changed.
- No source observation or source-document row was modified.
- The existing official-only write gate remains in force.
- This audit closes the current production coverage measurement step for #181, not the historical remediation acceptance criteria.
