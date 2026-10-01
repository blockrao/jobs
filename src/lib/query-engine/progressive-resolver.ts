/**
 * Progressive Resolution Pipeline
 *
 * REPLACES the rigid "simple vs complex" classifier
 *
 * Flow:
 * 1. Normalize input
 * 2. Attempt deterministic entity resolution (no LLM)
 * 3. Detect intent pattern-based
 * 4. Validate against knowledge graph
 * 5. If ambiguous/unresolved → LLM fallback
 * 6. Return intent + constraints
 *
 * This is more robust than classifying the whole query upfront.
 */

import { detectLanguage } from "./language-detector";
import { extractFilters } from "./filter-extractor";
import {
  StructuredQuery,
  Constraint,
  IntentType,
  CONSTRAINT_TYPES,
  createStructuredQuery,
} from "./intent-types";

interface ResolutionStep {
  step: string;
  resolved: boolean;
  confidence: number;
  data?: Record<string, unknown>;
}

interface ProgressiveResolutionResult {
  structuredQuery: StructuredQuery;
  resolutionSteps: ResolutionStep[];
  requiresLLMFallback: boolean;
  validationErrors: string[];
}

/**
 * Step 1: Detect intent pattern (deterministic)
 * Uses regex patterns to identify intent without LLM
 */
function detectIntentPattern(text: string): {
  intent: IntentType;
  confidence: number;
} {
  const lowerText = text.toLowerCase();

  // ELIGIBILITY_DISCOVERY patterns
  if (
    /\b(can\s+i|will\s+i|am\s+i\s+eligible|what\s+jobs|which\s+jobs)\b.*\b(with|have|my|get)\b/i.test(
      text
    )
  ) {
    return { intent: "ELIGIBILITY_DISCOVERY", confidence: 0.85 };
  }

  // EXAM_DISCOVERY patterns
  if (/\b(which\s+exams?|what\s+exams?|exam\s+options)\b.*\b(should|can)\b/i.test(text)) {
    return { intent: "EXAM_DISCOVERY", confidence: 0.85 };
  }

  // NOTIFICATION_ALERT patterns
  if (/\b(when|what\s+time|date)\b.*\b(exam|form|application|notification)\b/i.test(text)) {
    return { intent: "NOTIFICATION_ALERT", confidence: 0.80 };
  }

  // PREPARATION_GUIDANCE patterns
  if (/\b(how\s+to|prepare|preparation|study|syllabus)\b/i.test(text)) {
    return { intent: "PREPARATION_GUIDANCE", confidence: 0.80 };
  }

  // COMPARISON patterns
  if (/\b(vs|versus|compared\s+to|better|easier|difference)\b/i.test(text)) {
    return { intent: "COMPARISON", confidence: 0.75 };
  }

  // CAREER_PATH patterns
  if (/\b(after|next|progression|advancement|promotion)\b/i.test(text)) {
    return { intent: "CAREER_PATH", confidence: 0.70 };
  }

  // Default: JOB_LISTING (most common)
  // This includes straightforward searches like "SSC jobs in Delhi"
  return { intent: "JOB_LISTING", confidence: 0.80 };
}

/**
 * Step 2: Attempt deterministic constraint extraction
 * Uses filter database + pattern matching (no LLM)
 */
function extractConstraintsDeterministic(
  text: string,
  normalizedText: string
): {
  constraints: Record<string, Constraint>;
  ambiguities: string[];
} {
  const extracted = extractFilters(text, normalizedText);
  const constraints: Record<string, Constraint> = {};
  const ambiguities: string[] = [];

  // Map filter results to constraints
  if (extracted.exams.length > 0) {
    constraints[CONSTRAINT_TYPES.EXAMS] = {
      type: CONSTRAINT_TYPES.EXAMS,
      value: extracted.exams.map((e) => e.name),
      confidence: Math.min(...extracted.exams.map((e) => e.confidence)),
      source: "deterministic",
      validated: false,
    };
  }

  if (extracted.states.length > 0) {
    constraints[CONSTRAINT_TYPES.LOCATION] = {
      type: CONSTRAINT_TYPES.LOCATION,
      value: extracted.states.map((s) => s.name),
      confidence: Math.min(...extracted.states.map((s) => s.confidence)),
      source: "deterministic",
      validated: false,
    };
  }

  if (extracted.qualifications.length > 0) {
    constraints[CONSTRAINT_TYPES.QUALIFICATION] = {
      type: CONSTRAINT_TYPES.QUALIFICATION,
      value: extracted.qualifications.map((q) => q.name),
      confidence: Math.min(...extracted.qualifications.map((q) => q.confidence)),
      source: "deterministic",
      validated: false,
    };
  }

  // Detect ambiguities
  if (extracted.exams.length > 2) {
    ambiguities.push("Multiple exams mentioned - user intent unclear");
  }

  if (extracted.keywords.length > 5) {
    ambiguities.push("Too many keywords - query may contain multiple intents");
  }

  // Keywords as additional context
  if (extracted.keywords.length > 0) {
    constraints["keywords"] = {
      type: "keywords",
      value: extracted.keywords,
      confidence: 0.6,
      source: "deterministic",
      validated: false,
    };
  }

  return { constraints, ambiguities };
}

/**
 * Step 3: Validate constraints against knowledge graph
 * Check if extracted entities exist in JobOye's graph
 * This is the key difference: Graph is authority, not LLM confidence
 */
async function validateConstraintsAgainstGraph(
  constraints: Record<string, Constraint>,
  knowledgeGraph: Record<string, string[]>
): Promise<{
  validated: Record<string, Constraint>;
  invalidConstraints: string[];
  ambiguities: string[];
}> {
  const validated: Record<string, Constraint> = {};
  const invalidConstraints: string[] = [];
  const ambiguities: string[] = [];

  for (const [key, constraint] of Object.entries(constraints)) {
    const knownValues = knowledgeGraph[constraint.type] || [];

    if (knownValues.length === 0) {
      // No knowledge graph entries for this constraint type
      validated[key] = { ...constraint, validated: false };
      continue;
    }

    // Check if value(s) exist in knowledge graph
    const values = Array.isArray(constraint.value)
      ? constraint.value
      : [constraint.value];

    const validValues = values.filter((v) => {
      const vStr = String(v).toLowerCase();
      return knownValues.some((kv) => kv.toLowerCase() === vStr);
    });

    if (validValues.length === values.length) {
      // All values are valid
      validated[key] = { ...constraint, validated: true };
    } else if (validValues.length > 0) {
      // Partial match - ambiguity
      ambiguities.push(
        `Partial match for ${constraint.type}: found ${validValues.length}/${values.length}`
      );
      validated[key] = {
        ...constraint,
        value: validValues.map(String),
        confidence: constraint.confidence * 0.7, // Lower confidence for partial matches
        validated: false,
      };
    } else {
      // No matches - constraint is invalid
      invalidConstraints.push(`${constraint.type}: ${values.join(", ")} not found`);
    }
  }

  return { validated, invalidConstraints, ambiguities };
}

/**
 * Determine if LLM fallback is needed
 */
function shouldUseLLM(
  intent: IntentType,
  constraints: Record<string, Constraint>,
  ambiguities: string[],
  invalidCount: number
): boolean {
  // LLM needed if:
  // 1. Intent is ambiguous or low confidence
  // 2. Multiple ambiguities detected
  // 3. Constraints failed validation
  // 4. Complex intents like ELIGIBILITY_DISCOVERY with missing pieces

  if (ambiguities.length > 1) return true;
  if (invalidCount > 0) return true;

  if (intent === "ELIGIBILITY_DISCOVERY" && Object.keys(constraints).length < 2) {
    return true; // Need more context
  }

  if (intent === "AMBIGUOUS") return true;

  return false;
}

/**
 * Main progressive resolution pipeline
 */
export async function resolveQueryProgressively(
  input: string,
  knowledgeGraph: Record<string, string[]>,
  llmFallbackFn?: (text: string) => Promise<Record<string, Constraint>>
): Promise<ProgressiveResolutionResult> {
  const steps: ResolutionStep[] = [];
  const validationErrors: string[] = [];

  // Step 1: Language normalization
  const langResult = detectLanguage(input);
  steps.push({
    step: "language_detection",
    resolved: langResult.confidence > 0.7,
    confidence: langResult.confidence,
  });

  // Step 2: Intent pattern detection
  const intentResult = detectIntentPattern(input);
  steps.push({
    step: "intent_detection",
    resolved: true,
    confidence: intentResult.confidence,
    data: { intent: intentResult.intent },
  });

  // Step 3: Deterministic constraint extraction
  const { constraints: rawConstraints, ambiguities: extractionAmbiguities } =
    extractConstraintsDeterministic(input, langResult.normalizedText);
  steps.push({
    step: "constraint_extraction",
    resolved: Object.keys(rawConstraints).length > 0,
    confidence: Object.keys(rawConstraints).length > 0 ? 0.8 : 0,
    data: { constraintCount: Object.keys(rawConstraints).length },
  });

  // Step 4: Knowledge graph validation
  const {
    validated: validatedConstraints,
    invalidConstraints,
    ambiguities: validationAmbiguities,
  } = await validateConstraintsAgainstGraph(rawConstraints, knowledgeGraph);

  steps.push({
    step: "graph_validation",
    resolved: invalidConstraints.length === 0,
    confidence: 1.0 - invalidConstraints.length * 0.1,
    data: { validConstraints: Object.keys(validatedConstraints).length },
  });

  // Step 5: Determine if LLM fallback needed
  const allAmbiguities = [...extractionAmbiguities, ...validationAmbiguities];
  const needsLLM = shouldUseLLM(
    intentResult.intent,
    validatedConstraints,
    allAmbiguities,
    invalidConstraints.length
  );

  let finalConstraints = validatedConstraints;
  let fallbackApplied = false;

  if (needsLLM && llmFallbackFn) {
    try {
      const llmConstraints = await llmFallbackFn(input);
      finalConstraints = { ...validatedConstraints, ...llmConstraints };
      fallbackApplied = true;
      steps.push({
        step: "llm_fallback",
        resolved: true,
        confidence: 0.85,
        data: { llmConstraints },
      });
    } catch (error) {
      // LLM fallback failed, continue with validated constraints
      steps.push({
        step: "llm_fallback",
        resolved: false,
        confidence: 0,
        data: { error: String(error) },
      });
    }
  } else if (needsLLM) {
    steps.push({
      step: "llm_fallback_skipped",
      resolved: false,
      confidence: 0,
      data: { reason: "LLM not available" },
    });
  }

  // Create structured query
  const structuredQuery = createStructuredQuery(
    intentResult.intent,
    finalConstraints,
    { fallbackApplied }
  );

  return {
    structuredQuery,
    resolutionSteps: steps,
    requiresLLMFallback: needsLLM,
    validationErrors: [...invalidConstraints, ...allAmbiguities],
  };
}
