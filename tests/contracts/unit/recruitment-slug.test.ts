/**
 * Recruitment slug contract: application code must produce exactly the slug
 * format the live database enforces (CHECK recruitment_slug_format_check,
 * ^org\d+-\d{4}-\d{4}$) and the sequence rule of trigger recruitment_slug_auto_gen.
 */
import { describe, expect, it } from "vitest";
import {
  buildRecruitmentSlug,
  generateSequentialSlug,
  isSequentialSlug,
  parseSequentialSlug,
} from "../../../src/ingest/slug-generator";

const DB_CHECK = /^org\d+-\d{4}-\d{4}$/;

function fakeDb(slugs: string[]) {
  const chain = { from: () => chain, where: async () => slugs.map((slug) => ({ slug })) };
  return { select: () => chain } as unknown as Parameters<typeof generateSequentialSlug>[0];
}

describe("recruitment slug format", () => {
  it("builds slugs that satisfy the database CHECK", () => {
    for (const [org, year, seq] of [[1, 2026, 1], [1121, 2026, 4], [33, 2025, 1220]] as const) {
      const slug = buildRecruitmentSlug(org, year, seq);
      expect(slug).toMatch(DB_CHECK);
      expect(isSequentialSlug(slug)).toBe(true);
    }
    expect(buildRecruitmentSlug(1121, 2026, 4)).toBe("org1121-2026-0004");
  });

  it("rejects legacy and malformed slugs", () => {
    for (const slug of ["upsc-2026-01", "org1121-2026", "org1121", "isro-iprc-recruitment-2026-d061d5", "org1121-2026-04", ""]) {
      expect(isSequentialSlug(slug)).toBe(false);
      expect(parseSequentialSlug(slug)).toBeNull();
    }
  });

  it("parses the live format", () => {
    expect(parseSequentialSlug("org87-2026-0015")).toEqual({ organizationId: 87, year: 2026, sequence: 15 });
  });

  it("uses max existing sequence + 1, like the DB trigger (not a row count)", async () => {
    await expect(generateSequentialSlug(fakeDb([]), 87, 2026)).resolves.toBe("org87-2026-0001");
    // gaps (deleted rows) must not cause a collision
    await expect(generateSequentialSlug(fakeDb(["org87-2026-0001", "org87-2026-0007"]), 87, 2026)).resolves.toBe("org87-2026-0008");
  });
});

import { isUnresolvedOrganization } from "../../../src/lib/organizations/unresolved";

describe("unresolved (placeholder) organisation", () => {
  it("is recognised by slug or name and nothing else", () => {
    expect(isUnresolvedOrganization("unclassified-government-jobs")).toBe(true);
    expect(isUnresolvedOrganization("Unclassified Government Jobs")).toBe(true);
    expect(isUnresolvedOrganization("union-public-service-commission")).toBe(false);
    expect(isUnresolvedOrganization(null)).toBe(false);
  });
});
