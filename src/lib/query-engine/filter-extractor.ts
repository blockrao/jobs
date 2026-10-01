/**
 * Rule-Based Filter Extractor for Simple Queries
 *
 * Extracts: exams, states, qualifications, keywords
 * Confidence scoring based on pattern matching strength
 * Fast: <5ms per query
 */

import {
  searchFilters,
  buildFilterIndex,
  FilterIndex,
  EXAMS,
  STATES,
  QUALIFICATIONS,
} from "./filter-database";
import { normalizeHinglishPhonetics } from "./language-detector";

// Build index once and reuse
const filterIndex = buildFilterIndex();

export interface ExtractedFilters {
  exams: Array<{ name: string; confidence: number }>;
  states: Array<{ name: string; confidence: number }>;
  qualifications: Array<{ name: string; confidence: number }>;
  keywords: string[];
  rawText: string;
  extractionMethod: "pattern" | "entity_search";
  totalConfidence: number;
}

/**
 * Extract filters from normalized query text
 */
export function extractFilters(
  query: string,
  normalizedText: string = query
): ExtractedFilters {
  const lowerText = normalizedText.toLowerCase();
  const exams: Array<{ name: string; confidence: number }> = [];
  const states: Array<{ name: string; confidence: number }> = [];
  const qualifications: Array<{ name: string; confidence: number }> = [];
  const keywords: Set<string> = new Set();

  const seen = new Set<string>();

  // Search for exams
  for (const [searchKey, entity] of filterIndex.examsByName.entries()) {
    if (lowerText.includes(searchKey) && !seen.has(entity.canonical)) {
      const confidence = calculateConfidence(searchKey, lowerText, entity.canonical);
      exams.push({ name: entity.canonical, confidence });
      seen.add(entity.canonical);
    }
  }

  // Search for states
  for (const [searchKey, entity] of filterIndex.statesByName.entries()) {
    if (lowerText.includes(searchKey) && !seen.has(entity.canonical)) {
      const confidence = calculateConfidence(searchKey, lowerText, entity.canonical);
      states.push({ name: entity.canonical, confidence });
      seen.add(entity.canonical);
    }
  }

  // Search for qualifications
  for (const [searchKey, entity] of filterIndex.qualificationsByName.entries()) {
    if (lowerText.includes(searchKey) && !seen.has(entity.canonical)) {
      const confidence = calculateConfidence(searchKey, lowerText, entity.canonical);
      qualifications.push({ name: entity.canonical, confidence });
      seen.add(entity.canonical);
    }
  }

  // Extract keywords (words not matched as entities)
  const words = lowerText.split(/\s+/).filter((w) => w.length > 3);
  for (const word of words) {
    // Skip if already matched as entity
    if (!seen.has(word) && !isStopword(word)) {
      keywords.add(word);
    }
  }

  // Sort by confidence
  exams.sort((a, b) => b.confidence - a.confidence);
  states.sort((a, b) => b.confidence - a.confidence);
  qualifications.sort((a, b) => b.confidence - a.confidence);

  // Calculate total confidence
  const allFilters = [...exams, ...states, ...qualifications];
  const totalConfidence =
    allFilters.length > 0
      ? allFilters.reduce((sum, f) => sum + f.confidence, 0) / allFilters.length
      : 0;

  return {
    exams,
    states,
    qualifications,
    keywords: Array.from(keywords),
    rawText: query,
    extractionMethod: "entity_search",
    totalConfidence: Math.min(0.99, totalConfidence),
  };
}

/**
 * Calculate confidence score for matched filter
 * Based on: match length, position in query, word boundary
 */
function calculateConfidence(
  searchKey: string,
  text: string,
  canonical: string
): number {
  const position = text.indexOf(searchKey);
  const textLen = text.length;
  const keyLen = searchKey.length;

  let confidence = 0.85; // Base confidence

  // Bonus for exact phrase match (multiple words)
  if (searchKey.includes(" ")) {
    confidence += 0.05;
  }

  // Bonus for early appearance (likely important)
  if (position < textLen * 0.3) {
    confidence += 0.05;
  }

  // Bonus for longer match (more specific)
  if (keyLen > 10) {
    confidence += 0.03;
  }

  return Math.min(0.99, confidence);
}

/**
 * Stopwords to exclude from keyword extraction
 * Includes English and common Hindi stopwords
 */
function isStopword(word: string): boolean {
  const stopwords = new Set([
    // English stopwords
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "if",
    "what",
    "which",
    "who",
    "when",
    "where",
    "why",
    "how",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "jobs",
    "job",
    "exam",
    "exams",
    "government",
    "notification",
    "vacancy",
    "recruitment",
    // Hindi stopwords
    "की",
    "का",
    "से",
    "के",
    "हैं",
    "है",
    "और",
    "में",
    "को",
    "पर",
    "भर्ती",
    "परीक्षा",
    "नौकरी",
    "पद",
    "आवेदन",
    "सरकारी",
    "रिक्ति",
    "या",
    "एक",
    "किस",
    "क्या",
    "यह",
    "वह",
  ]);

  return stopwords.has(word);
}

/**
 * Extract filters with deduplication and conflict resolution
 */
export function extractFiltersWithValidation(
  query: string,
  normalizedText: string = query
): ExtractedFilters & { validationWarnings: string[] } {
  const extracted = extractFilters(query, normalizedText);
  const warnings: string[] = [];

  // Warn if too many exams (likely query is complex)
  if (extracted.exams.length > 2) {
    warnings.push(
      `Multiple exams detected (${extracted.exams.length}): might need LLM for intent understanding`
    );
  }

  // Warn if qualification and exam don't match well
  if (
    extracted.qualifications.length > 0 &&
    extracted.exams.length > 0
  ) {
    const qualName = extracted.qualifications[0].name.toLowerCase();
    const examName = extracted.exams[0].name.toLowerCase();

    // Some exams require specific qualifications
    if (
      examName.includes("ias") &&
      !qualName.includes("bachelor")
    ) {
      warnings.push(
        "IAS typically requires Bachelor's degree - check eligibility"
      );
    }
  }

  // Warn if no filters found but keywords exist
  if (
    extracted.exams.length === 0 &&
    extracted.states.length === 0 &&
    extracted.qualifications.length === 0 &&
    extracted.keywords.length > 0
  ) {
    warnings.push("No specific exam/state/qualification filters found");
  }

  return {
    ...extracted,
    validationWarnings: warnings,
  };
}

/**
 * Batch extract filters from multiple queries
 */
export function extractFiltersBatch(queries: string[]): ExtractedFilters[] {
  return queries.map((q) => extractFilters(q));
}

/**
 * Format extracted filters for API response
 */
export function formatExtractedFilters(
  extracted: ExtractedFilters
): Record<string, unknown> {
  return {
    q: extracted.keywords.join(" "),
    exam: extracted.exams.length > 0 ? extracted.exams[0].name : undefined,
    exams: extracted.exams.length > 1 ? extracted.exams.map((e) => e.name) : undefined,
    location: extracted.states.length > 0 ? extracted.states[0].name : undefined,
    locations: extracted.states.length > 1 ? extracted.states.map((s) => s.name) : undefined,
    educational_qualification:
      extracted.qualifications.length > 0
        ? extracted.qualifications[0].name
        : undefined,
    qualifications:
      extracted.qualifications.length > 1
        ? extracted.qualifications.map((q) => q.name)
        : undefined,
    sort: "relevance",
    limit: 50,
  };
}
