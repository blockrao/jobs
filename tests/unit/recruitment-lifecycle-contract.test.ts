import { describe, expect, it } from "vitest";
import { deriveLifecycle } from "../../src/lib/lifecycle";

describe("canonical recruitment lifecycle contract", () => {
  const now = new Date("2026-10-30T12:00:00.000Z");

  it("keeps ACTIVE open when deadline is missing or a placeholder", () => {
    expect(deriveLifecycle("ACTIVE", null, now).state).toBe("open");
    expect(deriveLifecycle("ACTIVE", "2099-12-31T18:30:00.000Z", now).state).toBe("open");
    expect(deriveLifecycle("ACTIVE", "1899-12-31T18:30:00.000Z", now).deadline).toBeNull();
  });

  it("closes at the exact exclusive deadline cutoff", () => {
    const cutoff = new Date("2026-10-30T12:00:00.000Z");
    expect(deriveLifecycle("ACTIVE", cutoff, cutoff).state).toBe("closed");
    expect(deriveLifecycle("ACTIVE", cutoff, new Date(cutoff.getTime() - 1)).state).toBe("open");
  });

  it("gives CLOSED, RESULTS and ARCHIVED status precedence over a future deadline", () => {
    const future = new Date("2026-11-30T18:30:00.000Z");
    expect(deriveLifecycle("CLOSED", future, now).state).toBe("closed");
    expect(deriveLifecycle("RESULTS", future, now).state).toBe("results");
    expect(deriveLifecycle("ARCHIVED", future, now).state).toBe("archived");
  });

  it("marks UPCOMING with an expired deadline as closed", () => {
    expect(deriveLifecycle("UPCOMING", "2026-10-29T12:00:00.000Z", now).state).toBe("closed");
  });

  it("uses a plausible deadline only as fallback for an unknown status", () => {
    expect(deriveLifecycle("UNRECOGNIZED", "2026-11-30T18:30:00.000Z", now).state).toBe("open");
    expect(deriveLifecycle("UNRECOGNIZED", null, now).state).toBe("closed");
  });
});
