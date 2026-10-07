/**
 * API Endpoint: Query Normalization v2
 *
 * POST /api/query/normalize-v2
 *
 * Progressive resolution pipeline:
 * 1. Detect intent pattern
 * 2. Extract constraints (deterministic)
 * 3. Validate against knowledge graph
 * 4. LLM fallback only if needed
 * 5. Support conversational refinement
 *
 * Key differences from v1:
 * - Intent + Constraints model (not filter-centric)
 * - Knowledge graph as authority (not LLM confidence)
 * - Progressive resolution (not rigid simple/complex)
 * - Conversational context support
 */

import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { resolveQueryProgressively } from "@/lib/query-engine/progressive-resolver";
import {
  buildKnowledgeGraph,
  getValidValues,
} from "@/lib/query-engine/knowledge-graph";
import {
  createSession,
  addTurnToSession,
  deserializeSession,
  isSessionStale,
} from "@/lib/query-engine/query-context-manager";
import { detectLanguage } from "@/lib/query-engine/language-detector";

interface NormalizeV2RequestBody {
  input: string;
  sessionId?: string; // For multi-turn conversation
  useLLM?: boolean;
}

// Build knowledge graph once (in production, cache this)
const knowledgeGraph = buildKnowledgeGraph();

// Simple in-memory session store (in production, use Redis)
// Capped to prevent unbounded growth under unauthenticated load (A-039).
const MAX_SESSIONS = 500;
const sessionStore = new Map<string, string>();

/**
 * The LLM path requires the same server-side secret as v1 (A-039).
 * The rules-based path is intentionally public.
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
    // Rate limiting: 20 requests per minute per IP (A-039).
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimit(clientIp, 20, 60000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: "Too many requests", message: "Rate limit exceeded. Please wait before retrying." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)) },
        }
      );
    }

    const body: NormalizeV2RequestBody = await request.json();

    // Validate input
    if (!body.input || typeof body.input !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          message: "Input query is required",
        },
        { status: 400 }
      );
    }

    const input = body.input.trim();

    if (input.length === 0 || input.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          message: "Query must be 1-500 characters",
        },
        { status: 400 }
      );
    }

    // Load or create session
    let session;
    if (body.sessionId && sessionStore.has(body.sessionId)) {
      const sessionData = sessionStore.get(body.sessionId)!;
      session = deserializeSession(sessionData);

      if (isSessionStale(session)) {
        // Clear stale session
        session = createSession(body.sessionId);
      }
    } else {
      const sessionId = body.sessionId || `session_${Date.now()}_${Math.random()}`;
      session = createSession(sessionId);
    }

    // Prepare LLM fallback function — gated behind server-side secret (A-039)
    const llmFallback =
      body.useLLM && paidPathAuthorized(request)
        ? async (_text: string) => {
            // In production, call Claude API with prompt caching
            return {};
          }
        : undefined;

    // Detect language
    const languageDetection = detectLanguage(input);

    // Progressive resolution pipeline
    const result = await resolveQueryProgressively(
      input,
      // Convert KnowledgeGraph to format expected by resolver
      {
        exams: Object.keys(knowledgeGraph.exams),
        locations: Object.keys(knowledgeGraph.locations),
        qualifications: Object.keys(knowledgeGraph.qualifications),
        sectors: Object.keys(knowledgeGraph.sectors),
        job_type: Object.keys(knowledgeGraph.jobTypes),
      },
      llmFallback
    );

    // Add turn to session (with conversational refinement)
    session = addTurnToSession(session, input, result.structuredQuery);

    // Save session — evict oldest entry if cap is reached
    if (sessionStore.size >= MAX_SESSIONS) {
      const oldest = sessionStore.keys().next().value;
      if (oldest) sessionStore.delete(oldest);
    }
    sessionStore.set(session.sessionId, JSON.stringify(session));

    // Build response
    const response = {
      success: true,
      sessionId: session.sessionId,
      data: {
        original_input: input,
        language: languageDetection.detected,
        language_confidence: Number(languageDetection.confidence.toFixed(2)),
        intent: result.structuredQuery.intent,
        constraints: Object.entries(result.structuredQuery.constraints).map(
          ([key, constraint]) => ({
            type: constraint.type,
            value: constraint.value,
            confidence: Number(constraint.confidence.toFixed(2)),
            source: constraint.source,
            validated: constraint.validated,
          })
        ),
        structured_query: {
          // Format for downstream search API
          ...(result.structuredQuery.constraints.exams && {
            exam: Array.isArray(
              result.structuredQuery.constraints.exams.value
            )
              ? result.structuredQuery.constraints.exams.value[0]
              : result.structuredQuery.constraints.exams.value,
          }),
          ...(result.structuredQuery.constraints.location && {
            location: Array.isArray(
              result.structuredQuery.constraints.location.value
            )
              ? result.structuredQuery.constraints.location.value[0]
              : result.structuredQuery.constraints.location.value,
          }),
          ...(result.structuredQuery.constraints.qualification && {
            educational_qualification: Array.isArray(
              result.structuredQuery.constraints.qualification.value
            )
              ? result.structuredQuery.constraints.qualification.value[0]
              : result.structuredQuery.constraints.qualification.value,
          }),
          sort: "relevance",
          limit: 50,
        },
        resolution: {
          steps: result.resolutionSteps.map((step) => ({
            step: step.step,
            resolved: step.resolved,
            confidence: Number(step.confidence.toFixed(2)),
          })),
          requires_llm_fallback: result.requiresLLMFallback,
          validation_errors: result.validationErrors,
        },
        conversation: {
          turn_number: session.turns.length,
          topic: session.conversationTopic || null,
          total_turns: session.turns.length,
        },
      },
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    console.error("Query normalization v2 error:", error);

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

/**
 * GET endpoint for quick testing
 */
export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing parameter",
          message: "Query parameter 'q' is required",
        },
        { status: 400 }
      );
    }

    // Detect language
    const languageDetection = detectLanguage(query);

    // Quick resolution without LLM
    const result = await resolveQueryProgressively(query, {
      exams: Object.keys(knowledgeGraph.exams),
      locations: Object.keys(knowledgeGraph.locations),
      qualifications: Object.keys(knowledgeGraph.qualifications),
      sectors: Object.keys(knowledgeGraph.sectors),
      job_type: Object.keys(knowledgeGraph.jobTypes),
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          original_input: query,
          language: languageDetection.detected,
          language_confidence: Number(languageDetection.confidence.toFixed(2)),
          intent: result.structuredQuery.intent,
          constraints: Object.entries(result.structuredQuery.constraints).map(
            ([key, constraint]) => ({
              type: constraint.type,
              value: constraint.value,
              confidence: Number(constraint.confidence.toFixed(2)),
              validated: constraint.validated,
            })
          ),
          resolution_steps: result.resolutionSteps.length,
          validation_errors: result.validationErrors,
        },
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300",
        },
      }
    );
  } catch (error) {
    console.error("Query normalization GET error:", error);

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
