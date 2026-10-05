/**
 * A-044: the lifecycle endpoint must answer the scheduler's GET as well as POST,
 * and both must stay fail-closed (no secret configured, or wrong bearer: 401).
 * The database layer is mocked; nothing is executed.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const execute = vi.fn(async () => [{ expired_postings: 0, archived_recruitments: 0, last_refreshed: new Date() }]);
vi.mock("@/db", () => ({ getDbV2: () => ({ execute }) }));

async function call(method: "GET" | "POST", headers: Record<string, string> = {}) {
  const mod = await import("@/app/api/cron/update-recruitment-lifecycle/route");
  const { NextRequest } = await import("next/server");
  const req = new NextRequest("http://localhost/api/cron/update-recruitment-lifecycle", { method, headers });
  return mod[method](req);
}

describe("A-044 lifecycle cron methods", () => {
  beforeEach(() => execute.mockClear());
  afterEach(() => vi.unstubAllEnvs());

  test.each(["GET", "POST"] as const)("%s with no configured secret is refused and runs nothing", async (m) => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await call(m, { authorization: "Bearer anything" });
    expect(res.status).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });

  test.each(["GET", "POST"] as const)("%s with a wrong bearer is refused and runs nothing", async (m) => {
    vi.stubEnv("CRON_SECRET", "test-secret-not-real");
    const res = await call(m, { authorization: "Bearer wrong" });
    expect(res.status).toBe(401);
    expect(execute).not.toHaveBeenCalled();
  });

  test.each(["GET", "POST"] as const)("%s with the right bearer runs the lifecycle refresh once", async (m) => {
    vi.stubEnv("CRON_SECRET", "test-secret-not-real");
    const res = await call(m, { authorization: "Bearer test-secret-not-real" });
    expect(res.status).toBe(200);
    // Lifecycle refresh first, then the best-effort search text refresh (SEARCH-001).
    expect(execute).toHaveBeenCalledTimes(2);
  });

  test("SEARCH-001: a failing search text refresh does not fail the lifecycle update", async () => {
    vi.stubEnv("CRON_SECRET", "test-secret-not-real");
    execute.mockImplementationOnce(async () => [{ expired_postings: 3, archived_recruitments: 1, last_refreshed: new Date() }]);
    execute.mockImplementationOnce(async () => {
      throw new Error("function missing");
    });
    const res = await call("GET", { authorization: "Bearer test-secret-not-real" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.expired_postings).toBe(3);
    expect(body.search_text_refreshed).toBeNull();
  });
});
