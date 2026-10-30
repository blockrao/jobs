import { describe, expect, it, vi } from "vitest";
import { refreshRecruitmentDates } from "../../../src/ingest/resolve";

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

  it("does not replace a populated deadline with a later candidate", async () => {
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
