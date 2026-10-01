/**
 * Query Classifier: Simple vs Complex
 *
 * Simple queries (90% coverage): Named entity extraction only
 * - "SSC jobs in Delhi"
 * - "UPSC notification 2026"
 * - "Railway NTPC vacancy"
 * - "Government jobs 12th pass"
 *
 * Complex queries (10%): Require LLM for intent understanding
 * - "Can I get a banking job with my diploma and 3 years experience?"
 * - "What jobs match my degree and salary expectation of 50k?"
 * - "Which exams should I target after graduation?"
 */

interface ClassificationResult {
  type: "simple" | "complex";
  confidence: number; // 0.5-1.0
  reason: string;
  indicators: string[];
}

// Patterns for SIMPLE queries (named entity extraction only)
const SIMPLE_PATTERNS = [
  // Job title + location
  /^([\w\s]+?)\s+(jobs|vacancies|notifications?|recruitment)\s+in\s+(\w+)$/i,

  // Exam name + context
  /^(ssc|upsc|ibps|railway|state psc|psu|ias|ips)(\s+\w+)*$/i,

  // Exam + qualification level
  /^([\w\s]+?)\s+(jobs|exam)\s+(for|with)\s+(10th|12th|diploma|bachelor|master)/i,

  // State + job type
  /^(jobs|notifications?|recruitment)\s+(in\s+)?(\w+)\s+(state|government)/i,

  // Recent/latest postings
  /^(latest|recent|new|today|this week)\s+(government\s+)?jobs/i,

  // Direct exam names with modifiers
  /^(ssc|upsc|ibps|rrb)\s+(notification|vacancy|recruitment|exam|form|date|notification)/i,

  // Question with single entity
  /^(when|what time|when is|what is)\s+(ssc|upsc|ibps|railway)\s+(\w+)?(\s+date)?$/i,

  // Single keyword (exam or location)
  /^(ssc|upsc|ibps|railway|banking|delhi|mumbai|bangalore)$/i,
];

// Patterns for COMPLEX queries (question-based intent understanding)
const COMPLEX_PATTERNS = [
  // "Can I" / "Will I" questions with qualifications
  /\b(can\s+i|will\s+i|should\s+i|am\s+i\s+eligible)\b/i,

  // Question with multiple conditions (AND, OR logic)
  /\b(and|with|both|also|along\s+with)\b.*\b(and|with|both|also|along\s+with)\b/i,

  // Experience + salary expectations
  /\b(experience|years?|salary|salary expectations|ctc)\b/i,

  // Education + career advice
  /\b(after|before|with my|given my|i have|i completed)\b/i,

  // Personalized recommendations
  /\b(which|what\s+jobs|which\s+(jobs|exams|positions)|recommendations?|suitable|right\s+for)\b/i,

  // Comparison queries
  /\b(difference|vs|versus|better|compared to|between)\b/i,

  // Eligibility with multiple criteria
  /\b(eligible|eligibility)\b.*\b(and|with|also)\b/i,

  // Age + qualification combinations
  /\b(age|years old)\b.*\b(qualification|degree|exam)\b/i,
];

/**
 * Classify query as simple or complex
 */
export function classifyQuery(query: string): ClassificationResult {
  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();
  const wordCount = trimmedQuery.split(/\s+/).length;
  const questionMarks = (trimmedQuery.match(/\?/g) || []).length;
  const commas = (trimmedQuery.match(/,/g) || []).length;

  const indicators: string[] = [];

  // Quick check: very short queries are usually simple
  if (wordCount <= 3) {
    indicators.push("short_query");
    return {
      type: "simple",
      confidence: 0.95,
      reason: "Very short query - likely named entity search",
      indicators,
    };
  }

  // Check for simple patterns
  for (let i = 0; i < SIMPLE_PATTERNS.length; i++) {
    if (SIMPLE_PATTERNS[i].test(trimmedQuery)) {
      indicators.push(`simple_pattern_${i}`);

      // High confidence for direct exam/state patterns
      if (i < 3) {
        return {
          type: "simple",
          confidence: 0.98,
          reason: "Matches simple entity extraction pattern",
          indicators,
        };
      }

      return {
        type: "simple",
        confidence: 0.90,
        reason: "Matches simple pattern",
        indicators,
      };
    }
  }

  // Check for complex patterns
  let complexScore = 0;
  for (let i = 0; i < COMPLEX_PATTERNS.length; i++) {
    if (COMPLEX_PATTERNS[i].test(trimmedQuery)) {
      indicators.push(`complex_pattern_${i}`);
      complexScore += 1;
    }
  }

  // Structural indicators for complexity
  if (questionMarks > 0) {
    indicators.push("question_mark");
    complexScore += 1.5; // Questions often need LLM understanding
  }

  if (wordCount > 15) {
    indicators.push("long_query");
    complexScore += 0.5;
  }

  if (commas > 0) {
    indicators.push("comma_separation");
    complexScore += 0.5; // Multiple conditions
  }

  // Heuristic keywords that indicate complexity
  const complexKeywords = [
    "experience",
    "salary",
    "can i",
    "will i",
    "should i",
    "which jobs",
    "what jobs",
    "suitable",
    "recommendations",
    "eligibility",
    "after",
    "before",
  ];

  for (const keyword of complexKeywords) {
    if (lowerQuery.includes(keyword)) {
      indicators.push(`keyword_${keyword}`);
      complexScore += 1;
    }
  }

  // Decision boundary
  if (complexScore >= 2) {
    return {
      type: "complex",
      confidence: Math.min(0.99, 0.7 + complexScore * 0.1),
      reason: `Multiple complex indicators: ${indicators.slice(0, 3).join(", ")}`,
      indicators,
    };
  }

  // Default to simple if no clear complexity signals
  return {
    type: "simple",
    confidence: 0.75,
    reason: "No strong complexity signals detected",
    indicators,
  };
}

/**
 * Batch classify multiple queries
 */
export function classifyQueryBatch(queries: string[]): ClassificationResult[] {
  return queries.map(classifyQuery);
}

/**
 * Get classification statistics
 */
export function getClassificationStats(queries: string[]): {
  totalQueries: number;
  simpleCount: number;
  complexCount: number;
  simplePercentage: number;
  avgConfidence: number;
} {
  const results = classifyQueryBatch(queries);
  const simpleCount = results.filter((r) => r.type === "simple").length;
  const complexCount = results.filter((r) => r.type === "complex").length;
  const avgConfidence =
    results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

  return {
    totalQueries: queries.length,
    simpleCount,
    complexCount,
    simplePercentage: (simpleCount / queries.length) * 100,
    avgConfidence,
  };
}
