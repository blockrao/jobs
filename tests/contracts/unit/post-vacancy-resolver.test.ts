import { describe, expect, it } from "vitest";
import { resolvePostVacancy, resolveRecruitmentVacancy } from "@/lib/resolvers/fact-resolvers";

type VacancyInput = Parameters<typeof resolvePostVacancy>[0];

function input(overrides: Record<string, unknown> = {}): VacancyInput {
  return {
    vacancyTotal: 250,
    recruitmentVacancyTotal: 1000,
    officialVacancyEvidenceAccepted: true,
    enrichment: {
      vacanciesTotal: 250,
      sourceVerificationStatus: "VERIFIED",
      extractionConfidence: 90,
    },
    ...overrides,
  } as VacancyInput;
}

describe("resolvePostVacancy trust gate", () => {
  it("accepts a positive post-level total with verified source and strong extraction confidence", () => {
    expect(resolvePostVacancy(input())).toBe(250);
  });

  it("rejects a pending total even when extraction confidence is strong", () => {
    expect(resolvePostVacancy(input({
      enrichment: {
        vacanciesTotal: 250,
        sourceVerificationStatus: "PENDING",
        extractionConfidence: 90,
      },
    }))).toBeNull();
  });

  it("rejects an unverified enrichment total even when the number is plausible", () => {
    expect(resolvePostVacancy(input({
      enrichment: {
        vacanciesTotal: 250,
        sourceVerificationStatus: "UNVERIFIED",
        extractionConfidence: 99,
      },
    }))).toBeNull();
  });

  it("rejects a verified-looking total when extraction confidence is below threshold", () => {
    expect(resolvePostVacancy(input({
      enrichment: {
        vacanciesTotal: 250,
        sourceVerificationStatus: "VERIFIED",
        extractionConfidence: 69,
      },
    }))).toBeNull();
  });

  it("rejects a total that duplicates the recruitment-level total", () => {
    expect(resolvePostVacancy(input({
      recruitmentVacancyTotal: 250,
      enrichment: {
        vacanciesTotal: 250,
        sourceVerificationStatus: "VERIFIED",
        extractionConfidence: 99,
      },
    }))).toBeNull();
  });

  it("rejects a globally verified count when field-level official evidence is absent", () => {
    expect(resolvePostVacancy(input({ officialVacancyEvidenceAccepted: false }))).toBeNull();
    expect(resolvePostVacancy(input({ officialVacancyEvidenceAccepted: undefined }))).toBeNull();
  });

  it("does not promote the legacy posts.vacancy_total column by itself", () => {
    expect(resolvePostVacancy(input({
      vacancyTotal: 250,
      enrichment: undefined,
    }))).toBeNull();
  });
});


describe("resolveRecruitmentVacancy trust gate", () => {
  it("requires explicit field-level issuer evidence", () => {
        expect(resolveRecruitmentVacancy({ totalVacancies: 100, officialVacancyEvidenceAccepted: true })).toBe(100);
    expect(resolveRecruitmentVacancy({ totalVacancies: 100, officialVacancyEvidenceAccepted: false })).toBeNull();
    expect(resolveRecruitmentVacancy({ totalVacancies: 100 })).toBeNull();
  });
});
