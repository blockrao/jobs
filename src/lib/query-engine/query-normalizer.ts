/**
 * Query Normalizer: Main Orchestrator
 *
 * Coordinates all components:
 * 1. Language detection & normalization
 * 2. Query classification (simple vs complex)
 * 3. Filter extraction (rules-based for simple, LLM for complex)
 * 4. Result formatting for search API
 *
 * Entry point for query intelligence system
 */

import { detectLanguage } from "./language-detector";
import { classifyQuery } from "./query-classifier";
import { extractFilters, formatExtractedFilters } from "./filter-extractor";
import {
  extractIntentWithLLM,
  shouldFallbackToRules,
} from "./llm-intent-engine";

export interface NormalizedQuery {
  originalInput: string;
  languageDetected: "english" | "hindi" | "hinglish";
  languageConfidence: number;
  queryType: "simple" | "complex";
  queryTypeConfidence: number;
  extractedFilters: {
    exams?: string[];
    states?: string[];
    qualifications?: string[];
    experience?: string;
    keywords?: string[];
  };
  filterConfidence: number;
  normalizedSearchParams: Record<string, unknown>;
  processingMethod: "rule_based" | "llm" | "hybrid";
  processingMetrics: {
    totalLatencyMs: number;
    languageDetectionMs: number;
    classificationMs: number;
    filterExtractionMs: number;
    llmLatencyMs?: number;
  };
  fallbackApplied: boolean;
  validationWarnings: string[];
}

/**
 * Main entry point: Normalize a query end-to-end
 */
export async function normalizeQuery(
  input: string,
  llmApiKey?: string
): Promise<NormalizedQuery> {
  const startTime = Date.now();
  const metrics = {
    totalLatencyMs: 0,
    languageDetectionMs: 0,
    classificationMs: 0,
    filterExtractionMs: 0,
  };

  // Step 1: Language Detection
  let langStart = Date.now();
  const languageResult = detectLanguage(input);
  metrics.languageDetectionMs = Date.now() - langStart;

  // Step 2: Query Classification
  let classStart = Date.now();
  const classificationResult = classifyQuery(input);
  metrics.classificationMs = Date.now() - classStart;

  // Step 3: Filter Extraction (Initial)
  let filterStart = Date.now();
  const rulesExtraction = extractFilters(input, languageResult.normalizedText);
  metrics.filterExtractionMs = Date.now() - filterStart;

  // Step 4: Complex Query Handling
  let processingMethod: "rule_based" | "llm" | "hybrid" = "rule_based";
  let llmLatencyMs = 0;
  let fallbackApplied = false;
  let finalExtractedFilters = rulesExtraction;
  let filterConfidence = rulesExtraction.totalConfidence;

  if (classificationResult.type === "complex") {
    processingMethod = "llm";
    const llmStart = Date.now();

    try {
      const llmResult = await extractIntentWithLLM(input, llmApiKey);
      llmLatencyMs = Date.now() - llmStart;

      // Check if LLM confidence is sufficient
      if (!shouldFallbackToRules(llmResult)) {
        // Use LLM results
        finalExtractedFilters = {
          exams: llmResult.exams?.map((e) => ({ name: e, confidence: 0.9 })) || [],
          states:
            llmResult.states?.map((s) => ({ name: s, confidence: 0.9 })) || [],
          qualifications:
            llmResult.qualifications?.map((q) => ({
              name: q,
              confidence: 0.9,
            })) || [],
          keywords: llmResult.keywords || [],
          rawText: input,
          extractionMethod: "pattern",
          totalConfidence: llmResult.confidence,
        };
        filterConfidence = llmResult.confidence;
        processingMethod = "llm";
      } else {
        // LLM confidence too low, fallback to rules
        processingMethod = "hybrid";
        fallbackApplied = true;
      }
    } catch (error) {
      // Error in LLM call, fallback to rules
      console.error("LLM extraction failed, falling back to rules:", error);
      processingMethod = "hybrid";
      fallbackApplied = true;
    }
  }

  // Step 5: Format for search API
  const normalizedSearchParams = {
    q: finalExtractedFilters.keywords.join(" ") || null,
    exam:
      finalExtractedFilters.exams.length > 0
        ? finalExtractedFilters.exams[0].name
        : null,
    location:
      finalExtractedFilters.states.length > 0
        ? finalExtractedFilters.states[0].name
        : null,
    educational_qualification:
      finalExtractedFilters.qualifications.length > 0
        ? finalExtractedFilters.qualifications[0].name
        : null,
    sort: "relevance",
    limit: 50,
  };

  // Remove null values
  const params = normalizedSearchParams as Record<string, unknown>;
  Object.keys(params).forEach((key) => {
    if (params[key] === null) {
      delete params[key];
    }
  });

  metrics.totalLatencyMs = Date.now() - startTime;

  // Collect warnings
  const warnings: string[] = [];

  if (classificationResult.type === "complex" && fallbackApplied) {
    warnings.push("Complex query but LLM confidence insufficient - using rules");
  }

  if (languageResult.confidence < 0.8) {
    warnings.push("Language detection confidence below 80%");
  }

  if (filterConfidence < 0.7) {
    warnings.push("Filter extraction confidence below 70% - results may be unreliable");
  }

  if (Object.keys(normalizedSearchParams).length === 0) {
    warnings.push("No searchable filters extracted from query");
  }

  return {
    originalInput: input,
    languageDetected: languageResult.detected,
    languageConfidence: languageResult.confidence,
    queryType: classificationResult.type,
    queryTypeConfidence: classificationResult.confidence,
    extractedFilters: {
      exams: finalExtractedFilters.exams.map((e) => e.name),
      states: finalExtractedFilters.states.map((s) => s.name),
      qualifications: finalExtractedFilters.qualifications.map((q) => q.name),
      keywords: finalExtractedFilters.keywords,
    },
    filterConfidence,
    normalizedSearchParams,
    processingMethod,
    processingMetrics: {
      ...metrics,
      llmLatencyMs: llmLatencyMs > 0 ? llmLatencyMs : undefined,
    },
    fallbackApplied,
    validationWarnings: warnings,
  };
}

/**
 * Batch normalize multiple queries
 */
export async function normalizeQueryBatch(
  inputs: string[],
  llmApiKey?: string
): Promise<NormalizedQuery[]> {
  return Promise.all(inputs.map((input) => normalizeQuery(input, llmApiKey)));
}

/**
 * Quick normalize without LLM (testing/demo mode)
 */
export function normalizeQueryQuick(input: string): NormalizedQuery {
  const startTime = Date.now();

  const languageResult = detectLanguage(input);
  const classificationResult = classifyQuery(input);
  const rulesExtraction = extractFilters(input, languageResult.normalizedText);

  const normalizedSearchParams = {
    q: rulesExtraction.keywords.join(" ") || undefined,
    exam:
      rulesExtraction.exams.length > 0 ? rulesExtraction.exams[0].name : undefined,
    location:
      rulesExtraction.states.length > 0
        ? rulesExtraction.states[0].name
        : undefined,
    educational_qualification:
      rulesExtraction.qualifications.length > 0
        ? rulesExtraction.qualifications[0].name
        : undefined,
    sort: "relevance",
    limit: 50,
  };

  // Remove undefined values
  const params = normalizedSearchParams as Record<string, unknown>;
  Object.keys(params).forEach((key) => {
    if (params[key] === undefined) {
      delete params[key];
    }
  });

  return {
    originalInput: input,
    languageDetected: languageResult.detected,
    languageConfidence: languageResult.confidence,
    queryType: classificationResult.type,
    queryTypeConfidence: classificationResult.confidence,
    extractedFilters: {
      exams: rulesExtraction.exams.map((e) => e.name),
      states: rulesExtraction.states.map((s) => s.name),
      qualifications: rulesExtraction.qualifications.map((q) => q.name),
      keywords: rulesExtraction.keywords,
    },
    filterConfidence: rulesExtraction.totalConfidence,
    normalizedSearchParams,
    processingMethod:
      classificationResult.type === "simple" ? "rule_based" : "hybrid",
    processingMetrics: {
      totalLatencyMs: Date.now() - startTime,
      languageDetectionMs: 2,
      classificationMs: 1,
      filterExtractionMs: 3,
    },
    fallbackApplied: false,
    validationWarnings: [],
  };
}
