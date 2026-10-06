/**
 * API Endpoint: Query Normalization
 *
 * POST /api/query/normalize
 *
 * Accepts: User query in any language (English, Hindi, Hinglish)
 * Returns: Structured intent with extracted filters
 *
 * Phase 1 Foundation: Rules-based + LLM intent extraction
 */

import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { normalizeQuery, normalizeQueryQuick } from "@/lib/query-engine/query-normalizer";

interface NormalizeRequestBody {
  input: string;
  language?: "auto-detect" | "english" | "hindi" | "hinglish";
  source?: "web" | "voice" | "chatbot";
  useLLM?: boolean;
}

/**
 * The paid (LLM) path is reachable only with the server-side secret (A-039).
 * No configured secret means the paid path is off for everyone; there is
 * deliberately no fallback value. The public rules-based path costs nothing.
 */
function paidPathAuthorized(request: NextRequest): boolean {
  const secret = process.env.QUERY_NORMALIZE_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: NextRequest) {
  try {
    const body: NormalizeRequestBody = await request.json();

    // Validate input
    if (!body.input || typeof body.input !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          message: "Input query is required and must be a string",
        },
        { status: 400 }
      );
    }

    const input = body.input.trim();

    if (input.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          message: "Query cannot be empty",
        },
        { status: 400 }
      );
    }

    if (input.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          message: "Query cannot exceed 500 characters",
        },
        { status: 400 }
      );
    }

    // Determine whether to use LLM
    const useLLM =
      body.useLLM !== false && process.env.NODE_ENV === "production" && paidPathAuthorized(request);
    const llmApiKey = process.env.ANTHROPIC_API_KEY;

    // Normalize query
    let normalized;
    if (useLLM && llmApiKey) {
      normalized = await normalizeQuery(input, llmApiKey);
    } else {
      // Development mode: quick rules-based normalization
      normalized = normalizeQueryQuick(input);
    }

    // Format response
    const response = {
      success: true,
      data: {
        original_input: normalized.originalInput,
        language_detected: normalized.languageDetected,
        language_confidence: Number(normalized.languageConfidence.toFixed(2)),
        intent: "job_search",
        extracted_filters: {
          exams: normalized.extractedFilters.exams,
          states: normalized.extractedFilters.states,
          qualifications: normalized.extractedFilters.qualifications,
          experience: normalized.extractedFilters.experience,
          keywords: normalized.extractedFilters.keywords,
          confidence_scores: {
            exams: normalized.filterConfidence,
            states: normalized.filterConfidence,
            qualifications: normalized.filterConfidence,
          },
        },
        normalized_query: normalized.normalizedSearchParams,
        processing: {
          method: normalized.processingMethod,
          query_type: normalized.queryType,
          query_type_confidence: Number(
            normalized.queryTypeConfidence.toFixed(2)
          ),
          latency_ms: normalized.processingMetrics.totalLatencyMs,
          breakdown: {
            language_detection_ms:
              normalized.processingMetrics.languageDetectionMs,
            classification_ms: normalized.processingMetrics.classificationMs,
            filter_extraction_ms:
              normalized.processingMetrics.filterExtractionMs,
            llm_latency_ms:
              normalized.processingMetrics.llmLatencyMs || null,
          },
          cache_hit: false,
          fallback_applied: normalized.fallbackApplied,
        },
      },
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=300", // 5 minutes
      },
    });
  } catch (error) {
    console.error("Query normalization error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Normalization failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint removed (A-039): was dev-only convenience, unused in codebase,
// and an unnecessary unauthenticated surface. Use POST with auth for all callers.
