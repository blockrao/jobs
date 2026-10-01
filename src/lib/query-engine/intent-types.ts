/**
 * Intent Model: Primary Output Structure
 *
 * CRITICAL SHIFT: Intent + Constraints replaces filter-centric output
 *
 * Examples:
 * "I have B.Tech and want government jobs in Haryana"
 *   → Intent: ELIGIBILITY_DISCOVERY
 *   → Constraints: {qualification: B.Tech, location: Haryana, sector: government}
 *
 * "Which exams can I take after graduation?"
 *   → Intent: EXAM_DISCOVERY
 *   → Constraints: {education_stage: post_graduation}
 *
 * "SSC jobs in Delhi"
 *   → Intent: JOB_LISTING
 *   → Constraints: {exams: [SSC], location: Delhi}
 */

export type IntentType =
  | "JOB_LISTING" // Search for specific jobs (exam/location based)
  | "ELIGIBILITY_DISCOVERY" // What jobs can I get with my qualifications?
  | "EXAM_DISCOVERY" // Which exams should I target?
  | "NOTIFICATION_ALERT" // When is exam happening? When is form closing?
  | "PREPARATION_GUIDANCE" // How to prepare? What's the eligibility?
  | "CAREER_PATH" // What's the progression after this exam?
  | "COMPARISON" // Which exam is easier/better?
  | "AMBIGUOUS"; // Unable to determine intent

export interface Constraint {
  type: string;
  value: string | string[] | number;
  confidence: number; // 0-1: how sure we are this constraint is correct
  source: "deterministic" | "pattern" | "llm"; // Where did this come from?
  validated: boolean; // Has it been validated against knowledge graph?
}

export interface QueryContext {
  sessionId?: string;
  previousQuery?: string;
  previousIntent?: IntentType;
  previousConstraints?: Record<string, Constraint>;
  refinement?: string; // Type of refinement ("restrict", "expand", "refine_dimension")
}

export interface StructuredQuery {
  intent: IntentType;
  constraints: Record<string, Constraint>;
  confidence: number; // Overall confidence in this interpretation
  fallbackApplied: boolean; // Did we need LLM?
  requiresLLM: boolean; // Should future queries of this type use LLM?
  queryContext?: QueryContext; // For multi-turn refinement
}

/**
 * Standard constraint types JobOye understands
 */
export const CONSTRAINT_TYPES = {
  // Job/Exam filters
  EXAMS: "exams", // SSC, UPSC, IBPS, etc.
  LOCATION: "location", // Delhi, UP, Maharashtra, etc.
  QUALIFICATION: "qualification", // 10th, 12th, Bachelor's, Master's
  SECTOR: "sector", // Government, PSU, etc.
  JOB_TYPE: "job_type", // Field Officer, Clerk, etc.

  // Eligibility/Discovery
  EDUCATION_STAGE: "education_stage", // Current student, graduated, post_graduation
  YEARS_EXPERIENCE: "years_experience", // 0-2, 2-5, 5+
  SALARY_EXPECTATION: "salary_expectation", // 20-30k, 50k+, etc.

  // Temporal
  APPLICATION_STATUS: "application_status", // Open, Closing soon, Closed
  TIME_FRAME: "time_frame", // This year, upcoming, recently closed

  // Other
  DIFFICULTY: "difficulty", // Easy, Medium, Hard
  MATCH_QUALITY: "match_quality", // Exact match, Similar, Any

  // Query refinement
  PAGINATION: "pagination", // Offset, limit
  SORT: "sort", // Relevance, newest, closing_soonest
};

/**
 * Create a structured query from intent + constraints
 */
export function createStructuredQuery(
  intent: IntentType,
  constraints: Record<string, Constraint>,
  options?: {
    sessionId?: string;
    fallbackApplied?: boolean;
    queryContext?: QueryContext;
  }
): StructuredQuery {
  const confidence = Object.values(constraints).length > 0
    ? Object.values(constraints).reduce((sum, c) => sum + c.confidence, 0) /
      Object.values(constraints).length
    : 0;

  return {
    intent,
    constraints,
    confidence: Math.min(0.99, confidence),
    fallbackApplied: options?.fallbackApplied || false,
    requiresLLM: false,
    queryContext: options?.queryContext,
  };
}

/**
 * Validate constraint against known values
 * Returns true if constraint is in JobOye's knowledge graph
 */
export function validateConstraint(
  constraint: Constraint,
  knownValues: string[]
): boolean {
  if (typeof constraint.value === "string") {
    return knownValues.includes(constraint.value);
  }
  if (Array.isArray(constraint.value)) {
    return constraint.value.every((v) => knownValues.includes(v));
  }
  return false;
}
