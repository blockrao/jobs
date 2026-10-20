import { describe, expect, test } from "vitest";
import { deriveLifecycle, lifecycleLabel } from "../../../src/lib/lifecycle";

const NOW = new Date("2026-10-20T12:00:00Z");
const d = (iso: string) => new Date(iso);

describe("recruitment lifecycle — single source of truth for live/open/closed", () => {
  test("ACTIVE with a future deadline is open and live", () => {
    const l = deriveLifecycle("ACTIVE", d("2026-11-01T00:00:00Z"), NOW);
    expect(l.state).toBe("open");
    expect(l.isOpen).toBe(true);
    expect(l.isLive).toBe(true);
    expect(l.daysLeft).toBe(12);
  });

  test("ACTIVE with a past deadline is closed, whatever the status column says (audit: 59 rows)", () => {
    const l = deriveLifecycle("ACTIVE", d("2026-10-01T00:00:00Z"), NOW);
    expect(l.state).toBe("closed");
    expect(l.isOpen).toBe(false);
    expect(l.isLive).toBe(false);
  });

  test("ACTIVE without a deadline is open (window end unknown, not assumed closed)", () => {
    const l = deriveLifecycle("ACTIVE", null, NOW);
    expect(l.state).toBe("open");
    expect(l.deadline).toBeNull();
    expect(l.daysLeft).toBeNull();
  });

  test("UPCOMING is live but not open", () => {
    const l = deriveLifecycle("UPCOMING", null, NOW);
    expect(l.state).toBe("upcoming");
    expect(l.isLive).toBe(true);
    expect(l.isOpen).toBe(false);
  });

  test("CLOSED, RESULTS and ARCHIVED are never live or open", () => {
    for (const s of ["CLOSED", "RESULTS", "ARCHIVED"]) {
      const l = deriveLifecycle(s, d("2027-01-01T00:00:00Z"), NOW);
      expect(l.isLive).toBe(false);
      expect(l.isOpen).toBe(false);
    }
    expect(deriveLifecycle("RESULTS", null, NOW).state).toBe("results");
    expect(deriveLifecycle("ARCHIVED", null, NOW).state).toBe("archived");
  });

  test("placeholder deadlines (2099-12-31) are not treated as an open window", () => {
    const l = deriveLifecycle("ACTIVE", d("2099-12-31T00:00:00Z"), NOW);
    expect(l.deadline).toBeNull();
    expect(l.daysLeft).toBeNull();
    expect(l.state).toBe("open"); // status still says ACTIVE; the date is simply unknown
  });

  test("string dates are accepted", () => {
    expect(deriveLifecycle("ACTIVE", "2026-10-25", NOW).daysLeft).toBe(5);
  });

  test("labels exist for every state in both languages", () => {
    for (const s of ["open", "upcoming", "closed", "results", "archived"] as const) {
      expect(lifecycleLabel(s)).toBeTruthy();
      expect(lifecycleLabel(s, true)).toBeTruthy();
    }
  });
});
