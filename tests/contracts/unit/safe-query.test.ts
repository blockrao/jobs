import { afterEach, describe, expect, test, vi } from "vitest";
import { safeQuery } from "@/lib/safe-query";

describe("safeQuery diagnostics", () => {
  afterEach(() => vi.restoreAllMocks());

  test("returns the fallback and logs the root database cause without SQL parameters", async () => {
    const lowLevelError = Object.assign(new Error("connect ECONNRESET"), {
      code: "ECONNRESET",
    });
    const aggregate = new AggregateError([lowLevelError]);
    const queryError = Object.assign(
      new Error("Failed query: select * from postings where secret = $1 | params: sensitive-search-term"),
      { cause: aggregate },
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      safeQuery(async () => {
        throw queryError;
      }, "fallback"),
    ).resolves.toBe("fallback");

    expect(log).toHaveBeenCalledTimes(1);
    const details = log.mock.calls[0][1] as Record<string, unknown>;
    expect(details.rootCauseName).toBe("Error");
    expect(details.rootCauseCode).toBe("ECONNRESET");
    expect(details.rootCauseMessage).toBe("connect ECONNRESET");
    expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive-search-term");
    expect(JSON.stringify(log.mock.calls)).not.toContain("select * from postings");
  });

  test("does not emit raw SQL when no nested cause is available", async () => {
    const queryError = new Error("Failed query: select * from posts | params: private-value");
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(safeQuery(async () => { throw queryError; }, null)).resolves.toBeNull();

    const details = log.mock.calls[0][1] as Record<string, unknown>;
    expect(details.rootCauseMessage).toBeUndefined();
    expect(JSON.stringify(log.mock.calls)).not.toContain("private-value");
    expect(JSON.stringify(log.mock.calls)).not.toContain("select * from posts");
  });
});
