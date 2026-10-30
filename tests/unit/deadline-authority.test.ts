import { describe, expect, it } from "vitest";
import { canonicalApplicationDeadline } from "../../src/ingest/deadline-authority";

describe("canonical application deadline authority", () => {
  const candidate = new Date("2026-11-30T18:29:59.999Z");

  it("allows an explicitly official registry source to set a canonical deadline", () => {
    expect(canonicalApplicationDeadline("OFFICIAL", true, candidate)).toBe(candidate);
  });

  it("rejects OFFICIAL when is_official is not explicitly true", () => {
    expect(canonicalApplicationDeadline("OFFICIAL", false, candidate)).toBeNull();
    expect(canonicalApplicationDeadline("OFFICIAL", null, candidate)).toBeNull();
  });

  it("does not let trusted-secondary or aggregated sources set canonical deadlines", () => {
    expect(canonicalApplicationDeadline("TRUSTED_SECONDARY", true, candidate)).toBeNull();
    expect(canonicalApplicationDeadline("AGGREGATED", true, candidate)).toBeNull();
  });

  it("fails closed for missing or unknown source-registry authority", () => {
    expect(canonicalApplicationDeadline(undefined, true, candidate)).toBeNull();
    expect(canonicalApplicationDeadline(null, null, candidate)).toBeNull();
    expect(canonicalApplicationDeadline("UNKNOWN", true, candidate)).toBeNull();
  });

  it("does not invent a deadline when an official source has no parseable candidate", () => {
    expect(canonicalApplicationDeadline("OFFICIAL", true, undefined)).toBeNull();
  });
});
