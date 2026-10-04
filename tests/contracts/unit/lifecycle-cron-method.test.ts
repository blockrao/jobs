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

  test.each(["GET", "POST"] as const)("%s with the right bearer runs the refresh once", async (m) => {
    vi.stubEnv("CRON_SECRET", "test-secret-not-real");
    const res = await call(m, { authorization: "Bearer test-secret-not-real" });
    expect(res.status).toBe(200);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
