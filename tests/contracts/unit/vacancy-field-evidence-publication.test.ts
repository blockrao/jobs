import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("vacancy field-evidence publication gates", () => {
  it("requires accepted issuer evidence in both canonical vacancy resolvers", () => {
    const source = read("src/lib/resolvers/fact-resolvers.ts");
    expect(source).toContain("post.officialVacancyEvidenceAccepted === true");
    expect(source).toContain("recruitment.officialVacancyEvidenceAccepted === true");
    expect(source).toContain('sourceVerificationStatus === "VERIFIED"');
  });

  it("gates Recruitment Hub totals, Post totals and category breakdowns", () => {
    const source = read("src/components/recruitment/recruitment-hub.tsx");
    expect(source).toContain("recruitment.officialVacancyEvidenceAccepted === true");
    expect(source).toContain("post.officialVacancyEvidenceAccepted === true");
  });

  it("gates Leaf category breakdowns and never treats extracted counts as verified", () => {
    const route = read("src/app/(default)/jobs/[recruitment-slug]/[post-slug]/page.tsx");
    const section = read("src/components/job-posting/sections/vacancy-details.tsx");
    expect(route).toContain("post.officialVacancyEvidenceAccepted === true && Array.isArray(enrichment?.vacancies)");
    expect(section).toContain("const hasOfficialVacancyEvidence = post.officialVacancyEvidenceAccepted === true");
    expect(section).toContain("const isReported = !hasOfficialVacancyEvidence");
  });
});
