import { describe, expect, it } from "vitest";
import { canSetCanonicalApplicationDeadline } from "../../src/ingest/deadline-authority";

describe("canonical application deadline authority", () => {
  it("accepts only a registry source explicitly marked OFFICIAL and is_official", () => {
    expect(canSetCanonicalApplicationDeadline("OFFICIAL", true)).toBe(true);
  });

  it("rejects official authority when the source is not explicitly official", () => {
    expect(canSetCanonicalApplicationDeadline("OFFICIAL", false)).toBe(false);
    expect(canSetCanonicalApplicationDeadline("OFFICIAL", null)).toBe(false);
  });

  it("rejects trusted-secondary and aggregated sources even if flagged official", () => {
    expect(canSetCanonicalApplicationDeadline("TRUSTED_SECONDARY", true)).toBe(false);
    expect(canSetCanonicalApplicationDeadline("AGGREGATED", true)).toBe(false);
  });

  it("fails closed for missing or unknown registry authority", () => {
    expect(canSetCanonicalApplicationDeadline(undefined, true)).toBe(false);
    expect(canSetCanonicalApplicationDeadline(null, null)).toBe(false);
    expect(canSetCanonicalApplicationDeadline("UNKNOWN", true)).toBe(false);
  });
});
