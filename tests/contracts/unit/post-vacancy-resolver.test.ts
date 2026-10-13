import { describe, expect, test } from "vitest";
import { resolvePostVacancy } from "@/lib/resolvers/fact-resolvers";
import type { JobPostingData, PostEnrichment } from "@/types/job-posting";

function postWithVacancies({
  vacancyTotal,
  vacanciesTotal,
  status = "VERIFIED",
  confidence = 85,
  recruitmentVacancyTotal,
}: {
  vacancyTotal?: number | null;
  vacanciesTotal?: number;
  status?: "VERIFIED" | "PENDING" | "UNVERIFIABLE";
  confidence?: number;
  recruitmentVacancyTotal?: number | null;
}) {
  const enrichment = vacanciesTotal == null ? undefined : ({
    vacanciesTotal,
    vacanciesByCategory: {},
    feesByCategory: {},
    ageRulesByCategory: {},
    selectionProcess: [],
    sourceVerificationStatus: status,
    extractionConfidence: confidence,
    dataGaps: [],
  } satisfies PostEnrichment);

  return {
    id: "2",
    title: "Assistant Legislative Counsel",
    slug: "assistant-legislative-counsel-jobs",
    organizationId: "1",
    organizationName: "Legislative Department",
    recruitmentId: "203",
    recruitmentName: "Legislative Department Recruitment",
    recruitmentSlug: "legislative-department-recruitment",
    examType: "Recruitment",
    examTypeSlug: "recruitment",
    isLive: true,
    postedAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    vacancyTotal,
    recruitmentVacancyTotal,
    enrichment,
  } as JobPostingData & {
    vacancyTotal?: number | null;
    recruitmentVacancyTotal?: number | null;
  };
}

describe("resolvePostVacancy conflict guard", () => {
  test("returns unknown when verified enrichment conflicts with the Post count", () => {
    expect(resolvePostVacancy(postWithVacancies({
      vacancyTotal: 8,
      vacanciesTotal: 33,
      recruitmentVacancyTotal: 8,
    }))).toBeNull();
  });

  test("returns unknown for conflicting counts even when enrichment is pending", () => {
    expect(resolvePostVacancy(postWithVacancies({
      vacancyTotal: 2,
      vacanciesTotal: 1,
      status: "PENDING",
      confidence: 67,
    }))).toBeNull();
  });

  test("keeps enrichment eligible when the Post-level counts agree and evidence passes", () => {
    expect(resolvePostVacancy(postWithVacancies({
      vacancyTotal: 8,
      vacanciesTotal: 8,
      recruitmentVacancyTotal: 12,
    }))).toBe(8);
  });

  test("uses a valid Post count when enrichment count is absent", () => {
    expect(resolvePostVacancy(postWithVacancies({
      vacancyTotal: 8,
      recruitmentVacancyTotal: 12,
    }))).toBe(8);
  });

  test("does not infer a Post count from a Recruitment-only total", () => {
    expect(resolvePostVacancy(postWithVacancies({
      recruitmentVacancyTotal: 33,
    }))).toBeNull();
  });
});
