# ARC-001 — JobOye logical architecture

**Status: CLOSED 2026-10-03. Authoritative logical reference** (ledger A-047).
Approved by the owner on 2026-10-03 with three textual corrections (Post
candidate wording, Source Document version semantics, lifecycle event/state
wording), all applied below.

This document is technology-independent. It names no database, host,
framework or scheduler; where the model needs a capability it states the
capability. It implements nothing: every physical consequence belongs to the
increment named in `ARCHITECTURE_LEDGER.md`. Section numbers 2 to 8 are kept
from the pre-change report so that cross-references stay valid.

Changing anything here requires concrete contradictory evidence and a ledger
entry.

## 2. Domain ontology

The model has eleven entities in three groups: what exists (Organization, Exam, Position), what is announced (Recruitment, Post, Vacancy), and how we know (Source, Source Document, Evidence, Recruitment Event, Lifecycle State).

| Entity | Definition | Lifetime | Belongs to |
| --- | --- | --- | --- |
| Organization | A real body that issues recruitments, employs people, or both | Permanent | Optionally a parent Organization |
| Exam | A named, recurring examination a body conducts (for example a combined graduate-level exam) | Permanent | Conducting Organization |
| Position | An evergreen job title, independent of any body or year (for example "Constable") | Permanent | Nothing |
| Recruitment | One announced hiring exercise, defined by one official notification | Bounded | Issuing Organization (required); Exam (optional) |
| Post | One Position as offered inside one Recruitment, with its own eligibility and pay | Same as its Recruitment | Recruitment (required); Position (required); employing Organization (optional) |
| Vacancy | A count of openings for one Post, broken down by category, location or both | Same as its Post | Post |
| Source | A publisher we read from, with one authority level | Permanent | Optionally the Organization it is the official channel of |
| Source Document | One retrieved item from a Source, stored as retrieved and never edited | Permanent | Source |
| Evidence | A link saying "this document supports this fact, event or entity", with the locating excerpt | Permanent | Source Document, and the thing supported |
| Recruitment Event | Something that happened to a Recruitment on a date (notification issued, applications opened, result declared) | Permanent, append-only | Recruitment; at least one Evidence |
| Lifecycle State | The current stage of a Recruitment, computed from its events | Derived, never stored as truth | Recruitment |

**Rules that hold across the model**

1. A Recruitment always has exactly one issuing Organization. Exam is optional: direct recruitment without an exam is first-class.
2. A Post exists only inside a Recruitment and always references a Position. A Position never references a Recruitment, an Organization or a year.
3. Vacancy numbers attach to Posts, never directly to a Recruitment. A Recruitment's total is the sum of its Posts' vacancies, or an evidenced headline figure when Posts are not yet resolved.
4. Eligibility and Selection Process are attributes of a Post (A-034). A Recruitment-level value is a default that a Post may override. They are value structures owned by their Post, not independent entities, and have no identity of their own.
5. Every fact shown to the public traces to at least one Evidence. A fact without Evidence is a candidate, not canonical.
6. The raw item as first ingested is a Source Document, not a Recruitment. Today's flat posting record is that raw layer (A-010).

## 3. Identity

Every entity has one immutable, meaningless identifier assigned at creation; everything else about it, including its name and slug, can change.

**General rules**

1. Identity is the immutable identifier. It is never derived from a name, a title, a slug or a date, and is never reused.
2. A slug is a public address, not identity. It is unique per entity type, may change, and a changed slug must keep resolving to the same entity. No relationship and no resolution decision may use a slug.
3. The same entity has the same identifier in every language (A-008).
4. Two records are the same entity only when a natural key matches or a reviewer confirms it. Similarity of names is a way to find candidates, never a decision (A-002).
5. Merging two entities keeps one identifier and records the other as an alias that still resolves.

**Natural keys, in order of strength**

| Entity | Level 1 (decides alone) | Level 2 (decides with corroboration) | Never sufficient |
| --- | --- | --- | --- |
| Organization | Registry entry: an official identifier or official domain | Exact official name or registered alias | Name similarity; a name taken from a posting title |
| Recruitment | Issuing Organization + notification identifier exactly as the body writes it, series prefix and year included | Issuing Organization + official notification document (same file) ; or issuing Organization + notification date + Exam or Post set | Title similarity; same Organization and year |
| Post | Recruitment + post code as printed | Recruitment + Position + employing Organization + distinguishing qualifier (discipline, grade) | Position name alone |
| Position | Curated registry entry | Exact normalized name or alias | Similarity |
| Exam | Conducting Organization + official exam name | Registered alias | Abbreviation alone |
| Source Document | Source + the Source's own identifier for the item | Source + content hash | Title |

**Notification identity.** The identifier is stored exactly as printed ("CEN 01/2024" and "CEN RPF 01/2024" are different). Year is not a separate key component (A-020). Normalization is limited to case and whitespace. The same identifier under two different issuing Organizations is two Recruitments; the same identifier under one issuing Organization is one Recruitment however many departments it serves.

**External identity.** An identifier assigned by an outside publisher identifies that publisher's Source Document only. It never identifies a Recruitment, because several publishers describe the same Recruitment.

**Resolution outcome.** Every resolution attempt ends in one of three recorded states: AUTO_RESOLVED (a Level 1 key matched, or Level 2 with corroboration), REVIEW_REQUIRED (candidates exist, none decisive), UNRESOLVED (no candidate). Only AUTO_RESOLVED and reviewer-confirmed results may write to canonical entities.

## 4. Organization semantics

An Organization has no fixed role; a role is the relationship in which it appears, and there are exactly three.

| Role | Held on | Meaning | Required |
| --- | --- | --- | --- |
| Issuing | Recruitment | The body whose name and notification number are on the official notification | Always, exactly one |
| Employing | Post | The body the selected person will work for | Optional; when absent it equals the issuing Organization |
| Conducting | Exam | The body that runs the examination | Always for an Exam, exactly one |

**Rules**

1. One notification is one Recruitment under its issuing Organization, however many employers it serves. A commission's single advertisement covering posts in four departments is one Recruitment with Posts whose employing Organizations differ. Today's data stores exactly that case as four Recruitments (Gate 2 §22, §24); that is the defect this rule removes.
2. The employing Organization is recorded on a Post only when the official document names it. It is never inferred from a title.
3. An Organization is created only from the registry (section 3). A name found in a posting title is a candidate to match against the registry, never a new Organization.
4. "Commission", "board", "department" and similar are descriptive types of Organization. They do not change the three roles and are not separate entities.

**Hierarchy.** An Organization may have one parent (ministry → department → attached office; state → state body). Hierarchy is descriptive: it supports browsing and aggregation. It is never used to decide identity, and a Recruitment is not attributed to a parent because its child issued it.

**Public attribution.** A Recruitment is listed under its issuing Organization. A Post is additionally listed under its employing Organization when one is recorded. How those listings are addressed and indexed is SEO-001's subject, not this model's.

## 5. Source and provenance

Every canonical fact, event and entity is reachable backwards through one chain: Source → Source Document → Evidence → fact, event or entity.

1. **Source.** A publisher with one authority level from a single ordered vocabulary (A-029). The highest level is the issuing Organization's own channel. Authority belongs to the Source and is never copied onto documents or recruitments.
2. **Source Document.** One item retrieved from one Source, kept exactly as retrieved with its retrieval time and content hash. A retrieved Source Document version is immutable. If the same external document is retrieved again with different content, the new retrieval is preserved as a new immutable version and linked to the same external-document identity where that identity can be established. No previously retrieved content is edited or overwritten. The model preserves, for every version: its Source, retrieval time, content and hash, external identity where available, and its version relationship where applicable. Versions are a property of Source Document, not a separate entity.
3. **Evidence.** A link from one Source Document to one thing it supports, carrying the excerpt or location that supports it and the method that produced it (automatic extraction, or a named reviewer).
4. **Supported thing.** A field value of an entity, a Recruitment Event, or the existence of an entity.

**Rules**

1. A Source Document is not a fact and not an event (A-016). It becomes relevant only through Evidence.
2. When two Evidence items disagree, the one from the higher-authority Source wins. At equal authority the later-published document wins. The losing Evidence is kept, marked superseded, never deleted.
3. An official document outranks any number of agreeing unofficial documents.
4. A canonical value records which Evidence currently supports it, so that a correction is a new Evidence item and never a silent overwrite.
5. Links to the official notification and the official application page are Evidence-backed facts of the Recruitment, not free-standing fields. Whether a Recruitment is "verified" is derived: it is verified when its identity and its application dates are supported by official-authority Evidence.
6. Editorial governance (review, approval, publication, quality tier) describes our handling of a record and is not provenance. It attaches to the raw layer and to the public projection (section 7), not to canonical entities (A-033).

Rule 5 settles the five columns MIG-001 classified UNKNOWN: three provenance links and two verification fields are derived from the evidence chain and will not be modelled as independent stored facts.

## 6. Recruitment lifecycle

A Recruitment's state is a pure function of its evidenced events and the current date: Evidence → Recruitment Event → state machine → Lifecycle State.

**Recruitment Event.** An event has a type, the Recruitment it belongs to, an effective date, a flag saying whether that date is announced-for-the-future or has occurred, and at least one Evidence. Events are append-only. A correction is a new event that supersedes an earlier one; nothing is edited or deleted.

| Event type | Effect on state |
| --- | --- |
| Notification issued | → ANNOUNCED |
| Applications open (date) | → APPLICATIONS_OPEN once the date is reached |
| Applications close (date) | → APPLICATIONS_CLOSED once the date has passed |
| Deadline extended | Supersedes the earlier close date |
| Corrigendum issued | None by itself; may carry other events |
| Admit card released, exam scheduled, exam conducted, answer key released, objection window, interview scheduled, intermediate result or merit list | → SELECTION_IN_PROGRESS |
| Final result declared | → RESULT_DECLARED |
| Postponed | No state change; marks the affected dates as not reliable |
| Cancelled or withdrawn | → CANCELLED |

**Lifecycle State: seven values**

| State | Meaning | Entered when |
| --- | --- | --- |
| UNKNOWN | The Recruitment exists but its evidence does not establish a stage | No evidenced event determines a state |
| ANNOUNCED | Notified; applications not yet open | Notification evidenced, open date in the future or not yet given |
| APPLICATIONS_OPEN | Applications are being accepted today | Open date reached and close date not passed |
| APPLICATIONS_CLOSED | Applications ended; no selection step evidenced yet | Close date passed |
| SELECTION_IN_PROGRESS | Any selection step is evidenced | First selection event |
| RESULT_DECLARED | Final result published | Final result event |
| CANCELLED | Withdrawn by the issuing body | Cancellation event |

**Rules**

1. State is computed, not asserted. A stored copy is a cache for reading and may be rebuilt from events at any time; it is never edited directly and never seeded from legacy stage values (A-018).
2. Time-dependent transitions need no rule outside the state machine. Re-evaluating the same events on a later date yields the later state. Whatever triggers re-evaluation holds no lifecycle logic and is replaceable (A-019).
3. A Recruitment is APPLICATIONS_OPEN only with an evidenced close date that has not passed, or an evidenced statement that applications are rolling. An open stage with no deadline is UNKNOWN.
4. Events are append-only. Current lifecycle state is derived from the complete ordered event set. A later event may supersede the effect of an earlier event (extension, postponement, cancellation, corrigendum, corrected date, later authoritative evidence); lifecycle state is never manually edited or mutated outside event processing.
5. Archival is not a lifecycle state. Whether an old Recruitment stays publicly listed is a projection rule based on state and age.
6. Detailed milestones (admit card, answer key and so on) are events shown on a timeline, not states. The legacy 15-value stage list mixes the two; its values map onto event types above.
7. Each Post follows its Recruitment's state. Per-Post divergence (one Post's result before another's) is recorded as events scoped to a Post and does not create a second state machine in this version.

## 7. Ingestion and resolution

Raw input reaches the public in eight stages, each with one responsibility and one kind of output; no stage skips another.

| # | Stage | Input | Output | May write canonical entities |
| --- | --- | --- | --- | --- |
| 1 | Raw source | A Source | A retrieved item | No |
| 2 | Source Document | Retrieved item | Immutable Source Document with hash | No |
| 3 | Normalization | Source Document | Cleaned text and extracted field candidates, each with Evidence | No |
| 4 | Classification | Normalized document | One class: recruitment notification, lifecycle notice, non-recruitment, unclear (A-015) | No |
| 5 | Entity resolution | Classified document and candidates | Resolution result per entity: AUTO_RESOLVED, REVIEW_REQUIRED or UNRESOLVED | No |
| 6 | Canonical domain | Resolved results | Created or updated Organization links, Recruitment, Posts, Vacancies, Events | Yes, the only stage that does |
| 7 | Validation | Canonical entities | Pass or fail against the model's invariants | No |
| 8 | Public projection | Validated entities plus editorial approval | The read model the public sees | No |

**Rules**

1. Only a document classified as a recruitment notification may create a Recruitment. A lifecycle notice may only add Events to an existing Recruitment. A non-recruitment document creates nothing canonical.
2. Resolution order is fixed: Organization, then Recruitment, then Post. A later step never runs on an unresolved earlier one.
3. A title or other weak source may generate a Post candidate with explicit evidence and confidence, but it can never create a canonical Post by itself. Canonical Post creation requires sufficient corroborating evidence. No placeholder Post is created merely to complete a relationship (A-021).
4. Every stage is repeatable: running it again on the same input gives the same output and creates no duplicates.
5. A document that stops at any stage stays there with its reason recorded. It is not dropped and not forced through.
6. Reviewers act on REVIEW_REQUIRED results and on editorial approval. A reviewer's decision is recorded as Evidence with the reviewer as the method.
7. The public reads only the projection. The projection never contains an entity that failed validation, and removing something from public view never deletes canonical data.
8. Untrusted callers have no write path at any stage (A-022).

**Dependencies.** The flow needs a durable store that enforces uniqueness and referential integrity, a way to run a stage on demand and periodically, and a privileged caller identity. It names no product for any of them.

## 8. Decisions

Four of the five decisions are closed; U-07 is closed at the logical level and its empirical check is deferred by design, because no official document is available to check against.

| ID | Question | Decision | Rationale | Status |
| --- | --- | --- | --- | --- |
| U-01 | Notification identifier printed as a bare number with no year | A bare identifier is a Level 2 key only. It decides identity together with the issuing Organization and the notification date. It is stored as printed; no year is appended to it | Bodies restart bare numbering, so issuer + "03" alone would merge different years. Appending a year would invent an identifier the body never wrote | CLOSED |
| U-02 | Lifecycle notice whose parent Recruitment was never ingested | The notice is kept as a Source Document with resolution state UNRESOLVED and its candidate parent key. It creates no Recruitment and no Event. It is retried whenever a Recruitment is created for the same issuing Organization | Creating a parent from a result or admit-card notice would produce a Recruitment with no notification, no dates and no Posts, which is the defect seen in 57 of 183 rows | CLOSED. Whether an unattached notice is publicly visible is for SEO-001 |
| U-03 | Final lifecycle vocabulary; explicit unknown state | Seven states as in section 6, including UNKNOWN. Milestones are events, not states | 74 rows show an open stage with no deadline. Without UNKNOWN the model must assert something it has no evidence for | CLOSED |
| U-07 | Validate issuing versus employing Organization against official notifications | The three-role model in section 4 is accepted. Its check against a sample of official notifications is done in the official-document increment, and no physical change for employing Organization is made before that check passes | The one case in current data supports the model, but 0 of 208 stored documents are official, so a real check is not possible today | Model CLOSED; validation DEFERRED BY DESIGN to increment 8, gating increment 10 |
| U-08 | Admissions, scholarships, qualifying tests | None of the three is a Recruitment and none may create one. Admissions and scholarships are outside the canonical model. A qualifying test is an Exam; its yearly cycle is not modelled in this version | A Recruitment ends in employment. Forcing these into it is what produced misclassified rows and all 47 stage contradictions | CLOSED. A possible "exam cycle" entity is recorded as a new ledger item, DEFERRED BY DESIGN until after legacy retirement |

**Other items settled by sections 2 to 7**

| Ledger | Settled as |
| --- | --- |
| A-014 Organization roles | Accepted: issuing, employing, conducting (section 4) |
| A-020 Notification identity | Accepted, with U-01 (section 3) |
| A-034 Eligibility and selection process | Value structures owned by a Post, with Recruitment-level defaults (section 2, rule 4) |
| A-035 Lifecycle vocabulary | Accepted (section 6) |
| A-036 Orphan lifecycle notice | Accepted, with U-02 |
| A-042 Unused organization-role enum | Not adopted: roles sit on relationships, not on the Organization. Removal belongs to legacy retirement |
| A-026 five UNKNOWN columns | Derived from the evidence chain (section 5, rule 5); reclassified REMOVE LATER |
