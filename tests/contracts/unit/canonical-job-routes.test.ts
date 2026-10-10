import { describe, expect, test } from "vitest";
import {
  canonicalPostLeafPath,
  recruitmentHubCanonicalPath,
} from "@/lib/canonical-job-routes";

describe("canonical legacy job route resolution", () => {
  test("consolidates a flat posting URL to the English Post Leaf", () => {
    expect(canonicalPostLeafPath({
      canonicalRecruitment: { slug: "land-and-building-2026-01" },
      canonicalPost: { slug: "law-officer-jobs" },
    })).toBe("/jobs/land-and-building-2026-01/law-officer-jobs");
  });

  test("preserves the Hindi prefix during legacy URL consolidation", () => {
    expect(canonicalPostLeafPath({
      canonicalRecruitment: { slug: "land-and-building-2026-01" },
      canonicalPost: { slug: "law-officer-jobs" },
    }, "hi")).toBe("/hi/jobs/land-and-building-2026-01/law-officer-jobs");
  });

  test("does not guess a leaf when either canonical entity is missing", () => {
    expect(canonicalPostLeafPath({ canonicalRecruitment: { slug: "r" } })).toBeNull();
    expect(canonicalPostLeafPath({ canonicalPost: { slug: "p" } })).toBeNull();
    expect(canonicalPostLeafPath(null)).toBeNull();
  });
});

describe("canonical recruitment hub resolution", () => {
  test("canonicalizes a single-role Recruitment to its Position hub", () => {
    expect(recruitmentHubCanonicalPath(
      { slug: "recruitment-2026-01" },
      [{ position: { slug: "law-officer" } }, { position: { slug: "law-officer" } }],
    )).toBe("/posts/law-officer");
  });

  test("does not choose an arbitrary role for a mixed-role Recruitment", () => {
    expect(recruitmentHubCanonicalPath(
      { slug: "multi-role-2026-01" },
      [{ position: { slug: "law-officer" } }, { position: { slug: "assistant" } }],
    )).toBe("/jobs/multi-role-2026-01");
  });

  test("uses a safe self path when Position links are missing", () => {
    expect(recruitmentHubCanonicalPath({ slug: "recruitment-2026-01" }, [])).toBe("/jobs/recruitment-2026-01");
    expect(recruitmentHubCanonicalPath(null, [])).toBeNull();
  });
});
