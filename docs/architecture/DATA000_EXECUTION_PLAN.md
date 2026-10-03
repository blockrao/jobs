# DATA-000 — bounded data foundation audit: execution plan

Status: ON HOLD 2026-10-03. The owner challenged the scope as an
endless-cycle risk; do not start. A smaller replacement is proposed in
`HANDOFF.md`. No audit work has started. Governs: ledger A-061, A-064, A-065, A-066. ARC-001 remains the
authority and is not reopened. This plan authorizes no production data
change.

## 1. Purpose and boundary

Answer eight questions with graded evidence, then stop:

1. What data JobOye has today.
2. Where it comes from.
3. How reliable the important classes of data are.
4. What information exists in the wider recruitment ecosystem.
5. What information JobOye needs to represent.
6. Where the frozen architecture has genuine gaps.
7. What acquisition, storage and provenance constraints affect implementation.
8. What the next increments need to prove.

It is not a census of the ecosystem, not a new architecture audit, and does
not re-run closed audits. Frozen baselines (`PHASE0_BASELINE.md`,
`GATE2_EVIDENCE.md`) are reused; only new questions are measured.

## 2. Hard limits

- Read-only. Database access is SELECT through the Supabase connector. No
  migration, no write, no scraper code, no new tables.
- External pages are read with web fetch and search only. No crawling, no
  sign-in, no forms. A site that declines is logged as "declined" and is not
  worked around.
- Aggregator content is not copied. Notes record field names, structure and
  short descriptors, never article or notification text.
- No secrets or credentials in any output.
- Every finding carries a grade: **observed** (seen directly), **sampled**
  (seen in the sample set, not generalized), **inferred** (reasoned, not
  seen), **unknown**. A sample count is never an estimate of the ecosystem.
- Internal figures carry the query timestamp, because ingestion continues
  while the audit runs.

## 3. Phases and stopping criteria

| Phase | Work | Stops when | Budget |
| --- | --- | --- | --- |
| P1 Internal baseline | Read-only measurements below | Every item in P1 has a number or is marked unknown | 1 session |
| P2 External sample | Sample set (section 4) read against the rubric | The sample set is complete, or the budget is spent; unread items are marked unknown | 2 sessions |
| P3 Synthesis | Gap matrix, constraints, risks, input to DATA-001 | Deliverable (section 6) complete | 1 session |

A session is one working sitting of this kind, not a calendar estimate.
Overrun rule: at the budget, stop and report what is graded and what is
unknown. New questions go to the ledger or a "future sampling" list, never
into the current phase.

### P1 internal baseline (read-only)

1. **Sources and ingestion:** the sources actually present, their stated
   authority, posting volume per source, and evidence of ingestion cadence
   (including the A-032 state). These sources define the aggregator part of
   the external sample.
2. **Field coverage** for each entity area in the alignment document
   (organization, recruitment, post, position, vacancy, exam, location,
   eligibility, selection, events, source, source document, evidence): rows,
   populated fields, and where the structure exists but is empty.
3. **Provenance reality:** which links exist from posting to source to
   document, and what is missing (0 of 208 documents are official is the
   frozen baseline).
4. **Storage and volume:** table and index sizes, row widths and document
   sizes. This is the input to the volume model in A-065; no sizing decision
   is made here.
5. **Public projection inputs:** which stored fields feed the existing
   JobPosting, organization and exam markup, and what cannot be filled
   without an official document (A-060).
6. **Geography as stored:** what location data exists and at which of the
   five levels (organization, jurisdiction, vacancy, work location,
   candidate eligibility).

### P2 external sample

The sample is for shape and quality, not coverage. Proposed (owner may
change it):

| Family | Sources | Notes |
| --- | --- | --- |
| Central commissions | SSC, UPSC | Both already present in JobOye data |
| Railway | One regional RRB site | |
| Banking | IBPS, one public-sector bank careers page | |
| Police and defence | One state police recruitment board, one defence recruitment portal | |
| State commissions | One state PSC near the owner's markets, one other | |
| Institutions | One university or institute, one medical institution | Title-derived organization examples in the data point at candidates |
| Aggregators | The 3–4 sources that supply most JobOye postings (from P1), plus at most one well-known other | Discovery sources only (A-064) |

Up to three recent items per source, chosen to include a PDF notification and
a lifecycle notice where available. Roughly 40 items at most.

Per-item rubric (presence, form and quality, graded):

- Identity: organization name as written, notification identifier as written.
- Dates: publication, application start and end, exam.
- Posts and vacancies: names, counts, breakdown by category or state.
- Eligibility and selection process.
- Geography at the five levels above.
- Language(s) and script.
- Document form: HTML, text PDF, scanned image; corrigenda and versions.
- Stable URL or identifier; update behaviour.
- Access: terms and usage restrictions as stated, fetch success or decline.
- Role: discovery only, or authority for which facts.

## 4. Owner, reviewer, validation

- **Executes:** Claude.
- **Reviews and approves:** the owner.
- **Validation:** every headline internal number is re-derived by a separate
  agent given only the question, not my result. External claims cite the page
  checked and the date.

## 5. What I need from the owner

1. Approval of this plan, or the changes wanted.
2. Approval of the sample set, or a replacement list.
3. Confirmation that read-only queries on the production database through
   the connector are acceptable for the audit.
4. Answers on the proposed ORG-001A points in A-062 (not blocking DATA-000).

## 6. Deliverable

`docs/architecture/DATA-000-DATA-FOUNDATION-AUDIT.md`:

- Opens with the scorecard.
- One section per question above. The twenty topics in the alignment document
  appear as subsections only where they answer a question; a mapping table
  shows where each landed or that it was not needed.
- Every finding graded observed / sampled / inferred / unknown.
- Gap matrix **CURRENT → TARGET → GAP → REQUIRED CHANGE → PRIORITY** against
  ARC-001. An item is a gap only if the frozen architecture is insufficient
  or contradicted by evidence; otherwise it is recorded as an implementation
  requirement.
- Constraints: acquisition limits, storage and volume inputs, aggregator
  terms, the five geography levels.
- Risks, and recommended inputs to DATA-001 (recommendations, not decisions).
- Appendix: rubric results per sample item, without copied content.

## 7. Risks

- **Sample bias:** the sample is small and chosen by hand. Mitigated by
  grading and by never generalizing counts.
- **Declined or unreadable sources:** the external picture is partial.
  Mitigated by logging declines and marking unknown.
- **Scope creep into design:** the audit will surface schema ideas. They go
  to the ledger as findings for DATA-001, not into this deliverable as
  decisions.
- **Moving data:** ingestion continues. Mitigated by timestamps.
- **Aggregator terms:** may restrict what can be done later. Recorded as a
  constraint, not resolved here.
