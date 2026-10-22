# Official-Source Enrichment Policy

**Status:** Proposed operational policy  
**Scope:** JobOye Recruitment Hubs and canonical Post Leaf records  
**Default:** Read-only discovery and staging until a change set is explicitly approved.

## 1. Purpose and non-negotiable rules

Enrichment makes each Recruitment Hub and Post Leaf accurate, complete, and traceable to official evidence. It must not manufacture completeness by guessing or copying notification-wide values onto individual Posts.

1. The official recruiting organisation's notification is the primary source. Official corrigenda/addenda and the official application portal must also be checked where relevant.
2. Aggregators (including FreeJobAlert) are discovery aids and comparison sources, not proof of official facts.
3. One notification may cover many Posts. Read/download the notification once, but verify and reconcile each Post independently.
4. Recruitment owns recruitment-wide facts. Post owns role-specific facts. Position/Vacancy records are used only according to the existing canonical model and schema contract.
5. Unknown stays unknown. Never infer a date from another date, a salary range from unrelated figures, age relaxation without its rule, or Post vacancies from a Recruitment-wide total.
6. Preserve canonical IDs, slugs, and URLs. No probabilistic mapping is promoted to canonical.
7. No production canonical writes, live-flag changes, broad crawl, or deployment as part of discovery/extraction. Changes require a reviewed dry run and explicit approval.
8. Do not read, modify, remediate, or use `public.raw_notifications` for this process.

## 2. Entity ownership contract

### Recruitment Hub fields
- Recruiting organisation and recruitment/notification identity
- Official advertisement/notification number and publication date, where stated
- Application opening/closing dates and corrigenda
- Official notification destination and official application portal
- Recruitment-wide fees and category exemptions, if the notice states them
- Shared eligibility/instructions and selection stages
- Recruitment-wide vacancy total only when explicitly stated as such by the official source
- Links to the verified Post leaves within the recruitment

### Post Leaf fields
- Exact post/role title and post code, if present
- Post-specific vacancies and category/reservation breakdown
- Pay scale/level, grade pay, consolidated pay, pay period, allowances and conditions
- Educational qualification, discipline, experience, equivalence and cut-off date
- Minimum/maximum age, age reference date, category relaxations and their conditions
- Post-specific selection stages, practical tests, interview, tenure, location, duties and instructions
- Documents and application requirements that apply specifically to that Post

Do not sum Post vacancies to overwrite Recruitment-owned totals. Do not duplicate role-specific facts onto the Hub merely to make it look fuller. Shared facts may be displayed on a leaf only through the approved authoritative Recruitment resolver.

## 3. Source hierarchy and conflict handling

1. Latest applicable official corrigendum/addendum.
2. Original official notification, including annexures, tables, footnotes and amendments incorporated by reference.
3. Official recruitment/application portal for operational instructions and portal-specific dates.
4. Official organisation recruitment page when it links to or identifies the notification.
5. Aggregator/listing pages for discovery and discrepancy detection only.

Record all applicable official documents. A later document does not automatically supersede every field in the original; scope the amendment to the facts it changes. Conflicting official sources, unclear scope, inaccessible source documents, and OCR uncertainty are exceptions requiring review—not an automated choice.

## 4. Field-level evidence contract

For every material extracted or changed field, retain (in the approved evidence/staging model):
- Entity type and stable source identifier; canonical ID only when mapping is deterministic and verified
- Field name and proposed value, preserving original text where useful
- Official source URL and source document title/version/date
- PDF page number, printed page number if different, and section/table/annexure/footnote
- Short supporting quotation or precise evidence locator
- Extraction method (text extraction/OCR/manual) and reviewer
- Verification state, confidence, timestamp, and any unresolved conflict/data gap
- Existing value, proposed value, reason for change, and approval/audit reference

A confidence score cannot replace source evidence or human review.

## 5. Workflow and state machine

1. **DISCOVERED** — existing JobOye URL and source listing identified.
2. **SOURCE_FOUND** — official document/application portal located.
3. **SOURCE_VERIFIED** — organisation/source authenticity and applicable corrigenda checked.
4. **EXTRACTED** — recruitment facts and each Post's candidate facts captured separately.
5. **RECONCILED** — each field compared with current canonical data and the rendered Hub/Leaf.
6. **QA_PASSED** — validation rules pass and evidence is sufficient.
7. **READY_TO_UPDATE** — proposed field-level change set is ready for approval.
8. **UPDATED** — approved change set applied with an audit record.
9. **LIVE_VERIFIED** — database, rendered pages, canonical metadata, links and structured data verified.

Exception states: **OFFICIAL_SOURCE_UNAVAILABLE**, **OCR_REVIEW_REQUIRED**, **CONFLICTING_OFFICIAL_SOURCES**, **MAPPING_AMBIGUOUS**, **QA_FAILED**. Exceptions must not be marked complete.

## 6. Required QA checks

- Notification identity, organisation, advertisement number and applicable amendment sequence match.
- Each canonical Post maps to the correct Recruitment and has a reachable leaf; ambiguous mappings stop.
- Every changed fact has a supporting official source locator.
- Recruitment-level totals are not misrepresented as per-Post vacancies; Post totals are not summed to invent a Recruitment total.
- Salary values preserve units, pay period, grade/pay level, allowances, consolidated-vs-scale distinctions and original wording. A numeric min/max is stored only when the source actually defines a comparable range.
- Age limits include the relevant reference date and applicable relaxations; category rules are not flattened into a single unsupported maximum.
- Application opening/closing dates are not inferred from notification/publication dates; amendments are applied field by field.
- Eligibility captures discipline, qualification, experience, equivalence and cut-off conditions without broadening the source.
- Hub/Leaf ownership and display rules are respected; unknown, absent, not applicable and conflicting are not conflated.
- Official notification and apply links point to the actual destination and are labelled truthfully (PDF vs listing page vs portal).
- Canonical URL, slug, ID, indexability, sitemap behavior, metadata and JobPosting structured data remain consistent.
- Rendered production/preview pages are checked after updates; a successful database write alone is not success.

## 7. Automation and human review

Automation may discover official URLs, download documents, extract text, OCR scans, propose structured values, compare existing data, detect anomalies, and generate a dry-run change set.

Human review is mandatory for:
- Scanned/low-quality pages containing material facts
- Conflicting or amended notices
- Salary/allowance parsing ambiguity
- Age relaxations, qualification equivalence, reservation, tenure or other conditional rules
- Uncertain Post decomposition or canonical mapping
- Any production change that materially affects eligibility, vacancies, pay, dates, fees or application instructions

No model-generated value is publishable merely because extraction confidence is high.

## 8. Pilot and rollout gates

Start with a 20-notification pilot, deliberately including single-Post and multi-Post notices, text PDFs, scanned PDFs, corrigenda, and incomplete/conflicting sources. No canonical writes during the pilot.

Pilot acceptance requires:
- 100% of proposed material facts linked to inspectable evidence
- 100% deterministic mapping for any Post proposed for update
- Zero unsupported facts, notification-to-Post leakage, or fabricated numeric ranges
- All critical fields independently reviewed against the official document
- Explicit counts of verified, missing, conflicting and OCR-review fields
- Rendered Hub/Leaf checks on the pilot examples
- A documented error/exception log and measured time per notification and per Post

After pilot acceptance, process 50–100 notifications per batch with a reviewed exception queue. Increase volume only when quality remains within the same gates. Track source coverage, Post-level field coverage, unresolved exceptions, review effort, update failures, and live verification.

## 9. Change management and rollback

Every approved batch must have a versioned manifest containing source-document hashes, affected entity IDs, before/after values, evidence references, reviewer/approver and timestamp. Apply idempotently, with bounded batches and a recoverable before-state. If a live check fails, stop the batch, revert the affected changes using the recorded before-state, and investigate before continuing.

No bulk publication or live-flag change is implied by passing enrichment QA. Publication remains governed by the separate release policy.

## 10. Immediate execution order

1. Investigate and stop any writer that is creating incomplete or legacy-shaped canonical records before enrichment scale-up.
2. Audit the recent `post_enrichments` cohort read-only; verify each `post_id`, values, provenance and whether these are genuine source-backed enrichments.
3. Implement the evidence/staging workflow and safe import access controls before importing the existing 962-row candidate batch.
4. Select and execute the 20-notification pilot in staging/review artifacts.
5. Produce a reviewed dry-run change set and rendered-page QA report; request approval before any canonical write.
