/**
 * A-039: the paid (LLM) path of /api/query/normalize is reachable only with the
 * server-side secret. Behaviour test against the real route handler; the
 * normalizer is mocked so no network call can happen.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const quick = {
  originalInput: "ssc cgl",
  languageDetected: "english",
  languageConfidence: 1,
  extractedFilters: { exams: [], states: [], qualifications: [], experience: [], keywords: [] },
  filterConfidence: 0.5,
  normalizedSearchParams: {},
  processingMethod: "rules",
  queryType: "exam",
  queryTypeConfidence: 1,
  processingMetrics: { totalLatencyMs: 1, languageDetectionMs: 1, classificationMs: 1, filterExtractionMs: 1 },
  fallbackApplied: false,
};
const normalizeQuery = vi.fn(async () => ({ ...quick, processingMethod: "llm" }));
const normalizeQueryQuick = vi.fn(() => quick);
vi.mock("@/lib/query-engine/query-normalizer", () => ({ normalizeQuery, normalizeQueryQuick }));

async function call(headers: Record<string, string> = {}, body: Record<string, unknown> = {}) {
  const { POST } = await import("@/app/api/query/normalize/route");
  const { NextRequest } = await import("next/server");
  const req = new NextRequest("http://localhost/api/query/normalize", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ input: "ssc cgl", ...body }),
  });
  return POST(req);
}

describe("A-039 normalize endpoint paid path", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key-not-real");
    normalizeQuery.mockClear();
    normalizeQueryQuick.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  test("NA-1 no secret configured: nobody reaches the paid path, even with a header", async () => {
    vi.stubEnv("QUERY_NORMALIZE_SECRET", "");
    const r = await call({ authorization: "Bearer " }, { useLLM: true });
    expect(r.status).toBe(200);
    expect(normalizeQuery).not.toHaveBeenCalled();
    expect(normalizeQueryQuick).toHaveBeenCalledTimes(1);
  });

  test("NA-2 secret configured, no or wrong header: rules path only", async () => {
    vi.stubEnv("QUERY_NORMALIZE_SECRET", "s3cret-value");
    for (const h of <Record<string, string>[]>[{}, { authorization: "Bearer wrong" }, { authorization: "s3cret-value" }, { authorization: "bearer s3cret-value" }, { authorization: "Bearer s3cret-valu" }]) {
      await call(h, { useLLM: true });
    }
    expect(normalizeQuery).not.toHaveBeenCalled();
    expect(normalizeQueryQuick).toHaveBeenCalledTimes(5);
  });

  test("NA-3 a client cannot opt in to the paid path by body flag alone", async () => {
    vi.stubEnv("QUERY_NORMALIZE_SECRET", "s3cret-value");
    await call({}, { useLLM: true });
    await call({}, {}); // useLLM defaults on; still no spend without the header
    expect(normalizeQuery).not.toHaveBeenCalled();
  });

  test("NA-4 the correct secret reaches the paid path", async () => {
    vi.stubEnv("QUERY_NORMALIZE_SECRET", "s3cret-value");
    const r = await call({ authorization: "Bearer s3cret-value" });
    expect(r.status).toBe(200);
    expect(normalizeQuery).toHaveBeenCalledTimes(1);
    expect((await r.json()).data.processing.method).toBe("llm");
  });

  test("NA-5 the correct secret with useLLM explicitly false stays on the rules path", async () => {
    vi.stubEnv("QUERY_NORMALIZE_SECRET", "s3cret-value");
    await call({ authorization: "Bearer s3cret-value" }, { useLLM: false });
    expect(normalizeQuery).not.toHaveBeenCalled();
  });
});
