import { describe, expect, it } from "vitest";
import { canonicalApplicationDeadline, canonicalDeadlineWriteValues, deadlineObservationFacts } from "../../src/ingest/deadline-authority";

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

describe("canonical deadline writer field mapping", () => {
  const candidate = new Date("2026-11-30T18:30:00.000Z");

  it("blocks both recruitment and posting deadline writes for aggregated sources", () => {
    expect(canonicalDeadlineWriteValues("AGGREGATED", false, candidate)).toEqual({
      recruitmentApplicationEndDate: null,
      postingValidThrough: null,
    });
  });

  it("allows both canonical deadline fields only for an explicitly official source", () => {
    expect(canonicalDeadlineWriteValues("OFFICIAL", true, candidate)).toEqual({
      recruitmentApplicationEndDate: candidate,
      postingValidThrough: candidate,
    });
  });
});

describe("deadline source observation provenance", () => {
  it("preserves original text, precision and timezone basis without promoting an aggregator URL as evidence", () => {
    expect(deadlineObservationFacts({
      validThrough: null,
      validThroughPrecision: "UNKNOWN",
      validThroughSourceText: "07 September 2026 10:00",
      validThroughTimezone: null,
      validThroughTimezoneBasis: "UNKNOWN",
      validThroughSourceLabel: "Last date to apply",
      officialNotificationUrl: "https://recruiting-body.gov.in/notice.pdf",
    })).toEqual({
      lastDate: null,
      deadlinePrecision: "UNKNOWN",
      deadlineSourceText: "07 September 2026 10:00",
      deadlineTimezone: null,
      deadlineTimezoneBasis: "UNKNOWN",
      deadlineSourceLabel: "Last date to apply",
      deadlineSourceUrl: "https://recruiting-body.gov.in/notice.pdf",
    });
  });

  it("does not invent an official notification locator when none is captured", () => {
    expect(deadlineObservationFacts({
      validThroughSourceText: "30 November 2026",
      validThroughPrecision: "DATE_ONLY",
      validThroughTimezone: "Asia/Kolkata",
      validThroughTimezoneBasis: "INDIA_SOURCE_DEFAULT",
    }).deadlineSourceUrl).toBeNull();
  });
});
