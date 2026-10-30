import { describe, expect, it, vi } from "vitest";
import { canonicalApplicationDeadline, canonicalDeadlineWriteValues, deadlineObservationFacts, canFillMissingCanonicalDeadline } from "../../src/ingest/deadline-authority";
import { refreshRecruitmentDates } from "../../src/ingest/resolve";

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


describe("canonical deadline update safety", () => {
  const existing = new Date("2026-11-30T10:00:00.000Z");
  const laterCandidate = new Date("2026-12-15T18:30:00.000Z");

  it("allows an authorised candidate to fill a missing canonical deadline", () => {
    expect(canFillMissingCanonicalDeadline(null, laterCandidate)).toBe(true);
  });

  it("never auto-replaces an existing deadline with a later candidate", () => {
    // The existing row has no queryable precision metadata. Do not assume
    // the later candidate is equally or more precise.
    expect(canFillMissingCanonicalDeadline(existing, laterCandidate)).toBe(false);
  });

  it("does not fill from a missing or invalid candidate", () => {
    expect(canFillMissingCanonicalDeadline(null, null)).toBe(false);
    expect(canFillMissingCanonicalDeadline(null, new Date("invalid"))).toBe(false);
  });
});


describe("recruitment deadline persistence boundary", () => {
  const existing = new Date("2026-11-30T10:00:00.000Z");
  const laterCandidate = new Date("2026-12-15T18:30:00.000Z");

  function makeDb(existingDeadline: Date | null) {
    const patches: Record<string, unknown>[] = [];
    const update = vi.fn(() => ({
      set: (patch: Record<string, unknown>) => ({
        where: async () => { patches.push(patch); },
      }),
    }));
    const db = {
      query: {
        recruitments: {
          findFirst: vi.fn().mockResolvedValue({
            id: 42,
            applicationStartDate: null,
            applicationEndDate: existingDeadline,
          }),
        },
      },
      update,
    };
    return { db, update, patches };
  }

  it("does not replace a populated deadline with a later DATE_ONLY candidate", async () => {
    const { db, update, patches } = makeDb(existing);
    const result = await refreshRecruitmentDates(
      db as never,
      42,
      { applicationEndDate: laterCandidate },
    );

    expect(result).toEqual({ filledStart: false, extendedEnd: false });
    expect(update).not.toHaveBeenCalled();
    expect(patches).toEqual([]);
  });

  it("does not replace a populated deadline when the new observation has no resolved instant", async () => {
    const { db, update, patches } = makeDb(existing);
    const result = await refreshRecruitmentDates(
      db as never,
      42,
      { applicationEndDate: null },
    );

    expect(result).toEqual({ filledStart: false, extendedEnd: false });
    expect(update).not.toHaveBeenCalled();
    expect(patches).toEqual([]);
  });

  it("fills a genuinely missing deadline from the already-authorised candidate", async () => {
    const { db, update, patches } = makeDb(null);
    const result = await refreshRecruitmentDates(
      db as never,
      42,
      { applicationEndDate: laterCandidate },
    );

    expect(result).toEqual({ filledStart: false, extendedEnd: true });
    expect(update).toHaveBeenCalledOnce();
    expect(patches).toHaveLength(1);
    expect(patches[0].applicationEndDate).toBe(laterCandidate);
  });
});
