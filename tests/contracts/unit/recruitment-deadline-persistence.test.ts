import { describe, expect, it, vi } from "vitest";
import { refreshRecruitmentDates } from "../../../src/ingest/resolve";

const existing = new Date("2026-11-30T18:30:00.000Z");
const laterCandidate = new Date("2026-12-15T18:30:00.000Z");
const dateOnlyEvidence = {
  deadlinePrecision: "DATE_ONLY",
  deadlineSourceText: "30 November 2026",
  deadlineTimezone: "Asia/Kolkata",
  deadlineTimezoneBasis: "INDIA_SOURCE_DEFAULT",
};

function makeDb(existingDeadline: Date | null, evidenceFacts?: Record<string, unknown>) {
  const patches: Record<string, unknown>[] = [];
  const update = vi.fn(() => ({
    set: (patch: Record<string, unknown>) => ({
      where: async () => { patches.push(patch); },
    }),
  }));
  const execute = vi.fn().mockResolvedValue(evidenceFacts ? [{ facts: evidenceFacts }] : []);
  const db: any = {
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
    execute,
  };
  db.transaction = vi.fn(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db));
  return { db, update, patches, execute };
}

describe("recruitment deadline persistence boundary", () => {
  it("keeps a populated deadline and flags it when matching official evidence cannot be found", async () => {
    const { db, update, patches } = makeDb(existing);
    const result = await refreshRecruitmentDates(
      db as never,
      42,
      {
        applicationEndDate: laterCandidate,
        deadlineEvidence: {
          precision: "DATE_ONLY",
          sourceText: "15 December 2026",
          timezone: "Asia/Kolkata",
          timezoneBasis: "INDIA_SOURCE_DEFAULT",
        },
      },
    );

    expect(result).toEqual({
      filledStart: false,
      extendedEnd: false,
      deadlineReviewReason: "DEADLINE_REVIEW_REQUIRED:EXISTING_DEADLINE_EVIDENCE_NOT_FOUND",
    });
    expect(update).not.toHaveBeenCalled();
    expect(patches).toEqual([]);
  });

  it("does not replace a populated deadline when the new observation has no resolved instant", async () => {
    const { db, update, patches, execute } = makeDb(existing);
    const result = await refreshRecruitmentDates(
      db as never,
      42,
      { applicationEndDate: null },
    );

    expect(result).toEqual({ filledStart: false, extendedEnd: false });
    expect(execute).toHaveBeenCalledOnce(); // recruitment row is locked before it is read
    expect(update).not.toHaveBeenCalled();
    expect(patches).toEqual([]);
  });

  it("extends a deadline when linked official evidence matches the current value and precision is not degraded", async () => {
    const evidence = {
      lastDate: existing.toISOString(),
      ...dateOnlyEvidence,
    };
    const { db, update, patches, execute } = makeDb(existing, evidence);
    const result = await refreshRecruitmentDates(
      db as never,
      42,
      {
        applicationEndDate: laterCandidate,
        deadlineEvidence: {
          precision: "DATE_ONLY",
          sourceText: "15 December 2026",
          timezone: "Asia/Kolkata",
          timezoneBasis: "INDIA_SOURCE_DEFAULT",
        },
      },
    );

    expect(execute).toHaveBeenCalledTimes(2); // FOR UPDATE lock, then official-evidence lookup
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(result).toEqual({ filledStart: false, extendedEnd: true });
    expect(update).toHaveBeenCalledOnce();
    expect(patches).toHaveLength(1);
    expect(patches[0].applicationEndDate).toBe(laterCandidate);
  });

  it("does not replace a precise DATE_TIME deadline with a later DATE_ONLY candidate", async () => {
    const evidence = {
      lastDate: existing.toISOString(),
      deadlinePrecision: "DATE_TIME",
      deadlineSourceText: "1 December 2026 at 12:00 AM IST",
      deadlineTimezone: "Asia/Kolkata",
      deadlineTimezoneBasis: "EXPLICIT_SOURCE",
    };
    const { db, update, patches } = makeDb(existing, evidence);
    const result = await refreshRecruitmentDates(
      db as never,
      42,
      {
        applicationEndDate: laterCandidate,
        deadlineEvidence: {
          precision: "DATE_ONLY",
          sourceText: "15 December 2026",
          timezone: "Asia/Kolkata",
          timezoneBasis: "INDIA_SOURCE_DEFAULT",
        },
      },
    );

    expect(result).toEqual({
      filledStart: false,
      extendedEnd: false,
      deadlineReviewReason: "DEADLINE_REVIEW_REQUIRED:LOWER_PRECISION_CANDIDATE_REQUIRES_REVIEW",
    });
    expect(update).not.toHaveBeenCalled();
    expect(patches).toEqual([]);
  });

  it("routes an earlier official deadline to correction review instead of overwriting", async () => {
    const evidence = {
      lastDate: existing.toISOString(),
      ...dateOnlyEvidence,
    };
    const { db, update, patches } = makeDb(existing, evidence);
    const result = await refreshRecruitmentDates(
      db as never,
      42,
      {
        applicationEndDate: new Date("2026-11-20T18:30:00.000Z"),
        deadlineEvidence: {
          precision: "DATE_ONLY",
          sourceText: "20 November 2026",
          timezone: "Asia/Kolkata",
          timezoneBasis: "INDIA_SOURCE_DEFAULT",
        },
      },
    );

    expect(result).toEqual({
      filledStart: false,
      extendedEnd: false,
      deadlineReviewReason: "DEADLINE_REVIEW_REQUIRED:EARLIER_OFFICIAL_DEADLINE_REQUIRES_CORRECTION_REVIEW",
    });
    expect(update).not.toHaveBeenCalled();
    expect(patches).toEqual([]);
  });

  it("fills a genuinely missing deadline from the already-authorised candidate", async () => {
    const { db, update, patches, execute } = makeDb(null);
    const result = await refreshRecruitmentDates(
      db as never,
      42,
      { applicationEndDate: laterCandidate },
    );

    expect(result).toEqual({ filledStart: false, extendedEnd: true });
    expect(execute).toHaveBeenCalledOnce(); // FOR UPDATE lock; no evidence lookup for a missing deadline
    expect(update).toHaveBeenCalledOnce();
    expect(patches).toHaveLength(1);
    expect(patches[0].applicationEndDate).toBe(laterCandidate);
  });
});
