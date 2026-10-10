import { describe, expect, test, vi } from "vitest";
import { normalizeAdvertisementNumber, resolveRecruitment } from "@/ingest/resolve";

type RecruitmentDb = Parameters<typeof resolveRecruitment>[0];

function fakeDb(options?: {
  notificationMatches?: Array<{ id: number } | null>;
  recruitmentCandidates?: Array<Array<{ id: number; name: string }>>;
}) {
  const organizationFindFirst = vi.fn().mockResolvedValue({ id: 1, slug: "example-org" });
  const notificationMatches = [...(options?.notificationMatches ?? [])];
  const recruitmentFindFirst = vi.fn().mockImplementation(async () => notificationMatches.shift() ?? null);
  const candidateBatches = [...(options?.recruitmentCandidates ?? [])];
  const recruitmentFindMany = vi.fn().mockImplementation(async () => candidateBatches.shift() ?? []);
  const returning = vi.fn().mockResolvedValue([]);
  const onConflictDoNothing = vi.fn(() => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const insert = vi.fn(() => ({ values }));
  const db = {
    query: {
      organizations: { findFirst: organizationFindFirst },
      recruitments: { findFirst: recruitmentFindFirst, findMany: recruitmentFindMany },
    },
    insert,
  } as unknown as RecruitmentDb;

  return { db, recruitmentFindFirst, recruitmentFindMany, insert, values, onConflictDoNothing, returning };
}

const identity = {
  organizationId: 1,
  examId: null,
  year: 2026,
  officialNotificationNumber: null,
  title: "Assistant Engineer Recruitment 2026",
};

describe("official notification identity normalization", () => {
  test.each([
    ["Advt. No. 17/2026", "17/2026"],
    [" Notification No:  22/2026-RC ", "22/2026-RC"],
    ["REF # AB-123 ", "AB-123"],
  ])("normalizes %s to a stable key", (raw, expected) => {
    expect(normalizeAdvertisementNumber(raw)).toBe(expected);
  });

  test.each([null, "", "General Recruitment", "No. 1", "x".repeat(201)])(
    "rejects non-identifying or invalid notification numbers",
    (raw) => {
      expect(normalizeAdvertisementNumber(raw)).toBeNull();
    },
  );
});

describe("recruitment identity conflict handling", () => {
  test("does not treat a generated-slug collision as entity identity", async () => {
    const fake = fakeDb();

    await expect(resolveRecruitment(fake.db, identity)).rejects.toThrow(
      /insert conflicted.*no identity match/i,
    );

    // The only findMany call is the sequential-slug count. No slug-only lookup
    // is attempted after the insert conflict.
    expect(fake.recruitmentFindMany).toHaveBeenCalledTimes(1);
    expect(fake.recruitmentFindFirst).not.toHaveBeenCalled();
  });

  test("resolves a concurrent insert by organization + official notification number", async () => {
    const fake = fakeDb({ notificationMatches: [null, { id: 123 }] });

    await expect(resolveRecruitment(fake.db, {
      ...identity,
      officialNotificationNumber: "Advt. No. 17/2026",
    })).resolves.toEqual({ id: 123, created: false });

    expect(fake.recruitmentFindFirst).toHaveBeenCalledTimes(2);
  });

  test("resolves a concurrent insert by organization + exam + year + title similarity", async () => {
    const fake = fakeDb({
      recruitmentCandidates: [
        [], // initial identity lookup
        [], // slug sequence count
        [{ id: 456, name: "Assistant Engineer Recruitment 2026" }], // post-conflict identity recheck
      ],
    });

    await expect(resolveRecruitment(fake.db, {
      ...identity,
      examId: 9,
    })).resolves.toEqual({ id: 456, created: false });

    expect(fake.recruitmentFindMany).toHaveBeenCalledTimes(3);
  });
});
