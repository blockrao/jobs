/**
 * Query Context Manager: Multi-Turn Refinement
 *
 * CRITICAL for voice/AI chatbots:
 * - Maintains query context across turns
 * - Understands refinement operations (restrict, expand, refine_dimension)
 * - Updates existing constraints based on new utterances
 *
 * Example flow:
 * Turn 1: "Government jobs for B.Tech graduates"
 *   → Context: {exams: *, qualification: Bachelor's, sector: Government}
 *
 * Turn 2: "Only Haryana"
 *   → Refinement: restrict by location
 *   → Updated context: {exams: *, qualification: Bachelor's, sector: Government, location: Haryana}
 *
 * Turn 3: "Show jobs currently accepting applications"
 *   → Refinement: add application_status constraint
 *   → Updated context: {..., application_status: Open}
 */

import { Constraint, StructuredQuery } from "./intent-types";

export interface QueryContextSession {
  sessionId: string;
  createdAt: number;
  lastUpdatedAt: number;
  turns: QueryTurn[];
  currentContext: Record<string, Constraint>;
  conversationTopic?: string; // e.g., "SSC recruitment", "Banking jobs"
}

export interface QueryTurn {
  turnId: number;
  input: string;
  intent: string;
  constraints: Record<string, Constraint>;
  refinementType?: RefinementType;
  timestamp: number;
}

export type RefinementType =
  | "restrict" // Narrow down results (add constraints)
  | "expand" // Broaden results (remove constraints)
  | "refine_dimension" // Change existing constraint value
  | "new_search" // Start new search (clear context)
  | "none"; // No refinement (new independent search)

/**
 * Detect refinement type from query
 */
export function detectRefinementType(
  currentInput: string,
  previousQuery?: string,
  previousConstraints?: Record<string, Constraint>
): RefinementType {
  if (!previousQuery || !previousConstraints) {
    return "none"; // No previous context
  }

  const lowerInput = currentInput.toLowerCase();

  // Restrict patterns: "only", "just", "only in", "filter by"
  if (/\bonly\b|\bjust\b|\bfilter by\b|\bnarrow to\b/i.test(currentInput)) {
    return "restrict";
  }

  // Expand patterns: "also show", "or", "any", "more"
  if (/\balso\b|\bor\b|\bany\b|\bmore\b|\bincluding\b/i.test(currentInput)) {
    return "expand";
  }

  // Refine dimension patterns: comparing, changing criteria
  if (/\bchange|instead|rather|rather than|not/i.test(currentInput)) {
    return "refine_dimension";
  }

  // New search patterns: "different", "new", "clear", "reset"
  if (/\bdifferent\b|\bnew\b|\bclear\b|\breset\b|\bstart over\b/i.test(currentInput)) {
    return "new_search";
  }

  // If too different structurally, probably new search
  const previousWords = new Set(previousQuery.toLowerCase().split(/\s+/));
  const currentWords = new Set(currentInput.toLowerCase().split(/\s+/));
  const overlap = new Set(
    [...previousWords].filter((w) => currentWords.has(w))
  );

  if (overlap.size < previousWords.size * 0.3) {
    return "new_search"; // Less than 30% overlap
  }

  return "none"; // Unclear refinement
}

/**
 * Apply refinement to existing query context
 */
export function applyRefinement(
  currentContext: Record<string, Constraint>,
  refinementType: RefinementType,
  newConstraints: Record<string, Constraint>
): Record<string, Constraint> {
  if (refinementType === "new_search") {
    return newConstraints; // Clear previous context
  }

  if (refinementType === "restrict") {
    // Add new constraints, don't remove existing
    return { ...currentContext, ...newConstraints };
  }

  if (refinementType === "expand") {
    // Remove constraints that are being expanded
    // This is more complex - may need user intent interpretation
    return { ...currentContext, ...newConstraints };
  }

  if (refinementType === "refine_dimension") {
    // Replace constraint in same dimension
    const merged = { ...currentContext };
    for (const [key, newConstraint] of Object.entries(newConstraints)) {
      merged[key] = newConstraint;
    }
    return merged;
  }

  // No refinement: replace everything (independent search)
  return newConstraints;
}

/**
 * Create new session
 */
export function createSession(sessionId: string): QueryContextSession {
  return {
    sessionId,
    createdAt: Date.now(),
    lastUpdatedAt: Date.now(),
    turns: [],
    currentContext: {},
  };
}

/**
 * Add turn to session and update context
 */
export function addTurnToSession(
  session: QueryContextSession,
  input: string,
  structuredQuery: StructuredQuery,
  refinementType?: RefinementType
): QueryContextSession {
  const refinement =
    refinementType ||
    detectRefinementType(
      input,
      session.turns.length > 0 ? session.turns[session.turns.length - 1].input : undefined,
      session.currentContext
    );

  // Apply refinement to get new context
  const updatedContext = applyRefinement(
    session.currentContext,
    refinement,
    structuredQuery.constraints
  );

  // Add turn record
  const newTurn: QueryTurn = {
    turnId: session.turns.length + 1,
    input,
    intent: structuredQuery.intent,
    constraints: structuredQuery.constraints,
    refinementType: refinement,
    timestamp: Date.now(),
  };

  // Update session
  const updatedSession: QueryContextSession = {
    ...session,
    turns: [...session.turns, newTurn],
    currentContext: updatedContext,
    lastUpdatedAt: Date.now(),
  };

  // Infer conversation topic from constraints
  if (!updatedSession.conversationTopic && structuredQuery.constraints.exams) {
    const exam = structuredQuery.constraints.exams.value;
    updatedSession.conversationTopic = Array.isArray(exam)
      ? `${exam.join(", ")} recruitment`
      : `${exam} recruitment`;
  }

  return updatedSession;
}

/**
 * Get conversation history (for context-aware LLM calls)
 */
export function getConversationHistory(session: QueryContextSession): string {
  return session.turns
    .map(
      (turn) =>
        `Turn ${turn.turnId}: "${turn.input}"\n  Intent: ${turn.intent}\n  Refinement: ${turn.refinementType}`
    )
    .join("\n");
}

/**
 * Serialize session to storage (e.g., Redis, database)
 */
export function serializeSession(session: QueryContextSession): string {
  return JSON.stringify(session);
}

/**
 * Deserialize session from storage
 */
export function deserializeSession(data: string): QueryContextSession {
  return JSON.parse(data);
}

/**
 * Check if session is stale (e.g., > 30 minutes)
 */
export function isSessionStale(
  session: QueryContextSession,
  maxAgeMs: number = 30 * 60 * 1000
): boolean {
  return Date.now() - session.lastUpdatedAt > maxAgeMs;
}
