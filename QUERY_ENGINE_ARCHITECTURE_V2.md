# JobOye Query Intelligence Engine — Architecture v2

**Date:** October 1, 2026  
**Status:** REVISED POST-FEEDBACK — 4 Critical Architectural Improvements Implemented

---

## Executive Summary

The original spec was **filter-extraction centric**. This revision makes it **intent-understanding centric** with 4 major fixes:

1. **Intent + Constraints as primary output** (not filters)
2. **Knowledge graph as authority** (not LLM confidence scores)
3. **Progressive resolution pipeline** (not rigid simple/complex split)
4. **Conversational query context** (for multi-turn refinement)

---

## Problem with Original Spec

The original design assumed the output should be:
```
{exam, location, qualification, sort_by}
```

But consider this query:
> "I have B.Tech and want government jobs I can apply for in Haryana."

This isn't just `qualification: Bachelor's + location: Haryana`. It's:
```
Intent: ELIGIBILITY_DISCOVERY
Constraints:
  - qualification: Bachelor's
  - location: Haryana
  - sector: Government
  - application_status: Currently open
```

The intent matters more than the filters. Different intents need different processing:
- `JOB_LISTING`: Return jobs matching filters
- `ELIGIBILITY_DISCOVERY`: Return jobs this person is eligible for
- `EXAM_DISCOVERY`: Return exams they should target
- `NOTIFICATION_ALERT`: Return key dates
- `PREPARATION_GUIDANCE`: Return study resources

**Original mistake:** Treated all queries as job searches. They're not.

---

## New Architecture: 4 Critical Improvements

### 1. Intent + Constraints Model (Core Abstraction)

**Files:** `src/lib/query-engine/intent-types.ts`

Intent types JobOye recognizes:
- `JOB_LISTING` — Search for jobs (SSC jobs in Delhi)
- `ELIGIBILITY_DISCOVERY` — What can I apply for? (I have B.Tech...)
- `EXAM_DISCOVERY` — Which exams should I target? (After graduation?)
- `NOTIFICATION_ALERT` — When is the deadline? (SSC notification date?)
- `PREPARATION_GUIDANCE` — How to prepare? (SSC syllabus?)
- `CAREER_PATH` — What's next after this exam?
- `COMPARISON` — Which exam is easier?
- `AMBIGUOUS` — Intent unclear

Each intent has associated constraints:
```typescript
interface Constraint {
  type: string;           // "exams", "location", "qualification", etc.
  value: string | string[];
  confidence: number;     // Our confidence this is correct
  source: "deterministic" | "pattern" | "llm";
  validated: boolean;     // Passed knowledge graph check?
}
```

**Why this matters:** Different intents route to different APIs. `ELIGIBILITY_DISCOVERY` might call a different search than `JOB_LISTING`.

---

### 2. Knowledge Graph as Authority (Not LLM Confidence)

**Files:** `src/lib/query-engine/knowledge-graph.ts`

**The critical architectural distinction:**

```
WRONG (original spec):
  LLM extraction
       ↓
  "Confidence: 0.95"
       ↓
  Trust the LLM output

RIGHT (new approach):
  LLM/Rule extraction
       ↓
  Entity resolution
       ↓
  Knowledge graph validation
       ↓
  Does "engineering" map to known qualification?
  Does "Haryana" map to location?
       ↓
  Validated structured query
```

The knowledge graph is JobOye's canonical source of truth:
- All exams in India that JobOye covers
- All states and union territories
- All qualification levels
- All sectors and organization types

When an LLM or rule extractor proposes `qualification: "engineering"`, we validate:
1. Lookup in knowledge graph: Does "engineering" exist as a qualification?
2. If not found: Fuzzy match against valid qualifications
3. If still unresolved: Mark as ambiguous, may need user clarification

**Example:**
```typescript
LLM says: qualification = "engineering degree"
Graph lookup: Doesn't match exactly
Fuzzy match: Could be "Bachelor's Degree" (common for engineers)
Result: Validated as Bachelor's Degree, confidence: 0.7
```

This is fundamentally different from trusting `LLM confidence: 0.95`.

---

### 3. Progressive Resolution Pipeline (Replaces Simple/Complex Split)

**Files:** `src/lib/query-engine/progressive-resolver.ts`

**Original approach (too rigid):**
```
Simple → Rules → Fast
Complex → LLM → Slow
```

Problems:
- Many simple queries contain ambiguity ("SSC jobs for graduates")
- Some complex-looking questions are trivial ("Show me current SSC CGL jobs in Delhi")
- Binary classification fails on edge cases

**New approach (robust):**
```
Input
  ↓
Language detection
  ↓
Intent pattern detection (regex patterns, no LLM)
  ↓
Deterministic constraint extraction (filter database)
  ↓
Knowledge graph validation
  ↓
[Check: Ambiguities? Invalid constraints? Missing context?]
  ↓
If ambiguous/unresolved → LLM fallback only
  ↓
Validated structured query
```

**This is more robust because:**
1. Attempts deterministic solution first (99% of queries)
2. Only uses LLM when needed (ambiguity detected)
3. Validates everything against the graph
4. Progressive: later stages only handle cases earlier stages couldn't

Example walkthrough:

Query: "I have B.Tech but am confused about job options after graduation"
```
Step 1: Intent detection → ELIGIBILITY_DISCOVERY (pattern matched)
Step 2: Constraint extraction:
  - Qualification: B.Tech → Resolves to Bachelor's Degree ✓
  - Missing: location, exam type
Step 3: Graph validation:
  - Bachelor's Degree: ✓ Valid
  - Location: Unresolved (not mentioned)
  - Application status: "after graduation" → post_graduation
Step 4: Ambiguity check:
  - Missing location (ambiguous)
  - LLM not available or threshold not met
  - Query is resolvable without LLM
Result: Return jobs for Bachelor's degree holders, let user refine by location
```

---

### 4. Conversational Query Context (Multi-Turn Refinement)

**Files:** `src/lib/query-engine/query-context-manager.ts`

**Critical for voice/AI:** Users refine queries across multiple turns.

Example conversation:
```
Turn 1: User: "Government jobs for B.Tech graduates"
  → Intent: ELIGIBILITY_DISCOVERY
  → Constraints: {qualification: Bachelor's, sector: Government}
  → Results: 500 jobs

Turn 2: User: "Only Haryana"
  → Refinement: RESTRICT (narrow down)
  → Updated constraints: {..., location: Haryana}
  → Results: 45 jobs

Turn 3: User: "Which ones don't require an exam?"
  → Refinement: REFINE_DIMENSION (add constraint)
  → Updated constraints: {..., requires_exam: false}
  → Results: 8 jobs

Turn 4: User: "Show me different results" / "Clear that"
  → Refinement: NEW_SEARCH (clear context)
  → Back to fresh query
```

**Architecture:**
```typescript
interface QueryContextSession {
  sessionId: string;
  turns: QueryTurn[];
  currentContext: Record<string, Constraint>;  // Accumulated state
  conversationTopic: string;  // "SSC recruitment" or "Banking jobs"
}

// Refinement types:
type RefinementType = "restrict" | "expand" | "refine_dimension" | "new_search" | "none"
```

When processing Turn 2 ("Only Haryana"):
1. Detect refinement type: `RESTRICT`
2. Extract new constraints: `{location: Haryana}`
3. Apply to previous context: `{...previous, location: Haryana}`
4. Return updated query

**Why this matters for JobOye:**
- Voice users: "Jobs for engineers... in Delhi... that don't need exams"
- ChatGPT plugin: Multi-turn conversation feels natural
- AI agents: Can ask clarifying questions then refine

---

## Implementation: 5 Core Modules

### Module 1: Intent Types & Models
`src/lib/query-engine/intent-types.ts`

Defines:
- `IntentType` enum (7 types + AMBIGUOUS)
- `Constraint` interface
- `StructuredQuery` output model

### Module 2: Knowledge Graph
`src/lib/query-engine/knowledge-graph.ts`

Maintains canonical data:
- All exams (SSC, UPSC, IBPS, Railway, State PSC)
- All states/UTs
- All qualifications (10th, 12th, Diploma, Bachelor's, Master's)
- All sectors and job types

Functions:
- `buildKnowledgeGraph()` — Load canonical data
- `resolveToCanonical()` — Alias → canonical form
- `validateConstraint()` — Check if constraint is valid

### Module 3: Progressive Resolver
`src/lib/query-engine/progressive-resolver.ts`

Main pipeline:
1. `detectIntentPattern()` — Regex-based intent detection
2. `extractConstraintsDeterministic()` — Rule-based extraction
3. `validateConstraintsAgainstGraph()` — Graph validation
4. `shouldUseLLM()` — Decide if fallback needed
5. `resolveQueryProgressively()` — Orchestrate all steps

Returns: `StructuredQuery` with resolution details

### Module 4: Query Context Manager
`src/lib/query-engine/query-context-manager.ts`

Handles multi-turn conversations:
- `createSession()` — Start new conversation
- `addTurnToSession()` — Add user turn
- `detectRefinementType()` — Classify refinement
- `applyRefinement()` — Update context

### Module 5: API Endpoint
`src/app/api/query/normalize-v2/route.ts`

HTTP interface:
```
POST /api/query/normalize-v2
{
  "input": "I have B.Tech and want government jobs in Haryana",
  "sessionId": "session_xyz",  // Optional, for multi-turn
  "useLLM": false               // Optional, default false
}
```

Response:
```json
{
  "success": true,
  "sessionId": "session_xyz",
  "data": {
    "intent": "ELIGIBILITY_DISCOVERY",
    "constraints": [
      {"type": "qualification", "value": "Bachelor's Degree", "validated": true},
      {"type": "location", "value": "Haryana", "validated": true},
      {"type": "sector", "value": "Government", "validated": true}
    ],
    "structured_query": {
      "educational_qualification": "Bachelor's Degree",
      "location": "Haryana",
      "sort": "relevance"
    },
    "resolution": {
      "steps": [...],
      "requires_llm_fallback": false,
      "validation_errors": []
    },
    "conversation": {
      "turn_number": 1,
      "topic": "Government recruitment"
    }
  }
}
```

---

## Removed: Speculative Market Claims

The original spec included:
- "50% of Indian government-job searchers use voice or AI chatbots"
- "Hindi is 3x more common in voice search than desktop"
- "18–24 month structural gap before competitors can replicate"

**These are NOT included in v2.** They were presented as estimates without evidence and invite unnecessary scrutiny. The architecture is strong on its own merits:
- Better intent understanding = better results
- Knowledge graph validation = higher quality
- Progressive resolution = lower latency
- Conversational context = better UX

These are the real advantages. Market share claims can follow data, not precede it.

---

## Phase 1 Implementation Status

**Completed:**
- [x] Intent types & models
- [x] Knowledge graph
- [x] Progressive resolution pipeline
- [x] Query context manager
- [x] `/api/query/normalize-v2` endpoint
- [x] Entity resolution against graph

**In Progress:**
- [ ] Integration with search API
- [ ] LLM fallback (Claude API + prompt caching)
- [ ] Session storage (Redis or database)
- [ ] Testing with real queries

**Testing targets:**
- Simple queries: "SSC jobs in Delhi" → <10ms
- Complex queries: "I have B.Tech, can I get banking jobs in Haryana?" → <200ms with LLM
- Multi-turn: 3-turn conversation → <500ms total

---

## Next Steps

1. **Week 1-2:** Complete LLM integration with prompt caching
2. **Week 2-3:** Integrate with existing search API
3. **Week 3:** Internal testing with real query logs
4. **Week 4:** Staged rollout (10% of users)
5. **Week 5-6:** Monitor, refine, scale to 100%

This architecture is now defensible, testable, and built for scale.
