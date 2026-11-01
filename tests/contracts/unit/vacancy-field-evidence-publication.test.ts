import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("vacancy field-evidence publication gates", () => {
  it("requires accepted issuer evidence in both canonical vacancy resolvers", () => {
    const source = read("src/lib/resolvers/fact-resolvers.ts");
    expect(source).toContain("post.officialVacancyEvidenceAccepted === true");
    expect(source).toContain("post.resolvedVacancyCount != null && post.vacancies");
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
    expect(route).toContain("post.officialVacancyEvidenceAccepted === true && vacancies > 0 && Array.isArray(enrichment?.vacancies)");
    expect(section).toContain("const hasOfficialVacancyEvidence = post.officialVacancyEvidenceAccepted === true && resolvedFacts?.vacancyCount != null");
    expect(section).toContain("const isReported = !hasOfficialVacancyEvidence");
  });

  it("fails closed on public search, homepage, category, qualification and organisation vacancy counts", () => {
    const search = read("src/lib/search-queries.ts");
    const queries = read("src/lib/queries.ts");
    const recruitmentList = read("src/db/operations/get-recruitments.ts");
    const organisationStats = read("src/lib/organizations/stats.ts");

    expect(search).toContain("totalVacancies: null");
    expect(search).not.toContain("COALESCE(r.total_vacancies, p.total_vacancies)");
    expect(queries).toContain("totalVacancies: null");
    expect(queries).toContain("vacancyTotal: sql<number | null>`NULL`");
    expect(queries).not.toContain("verifiedHomeVacancy");
    expect(recruitmentList).toContain('NULL::int AS "totalVacancies"');
    expect(organisationStats).toContain("totalVacancies: null");
  });

  it("does not sum or rank public inventory using unsupported vacancy columns", () => {
    const homepage = read("src/lib/queries.ts");
    const legacyArchive = read("src/app/(default)/recruitments/page.tsx");
    const controlCenter = read("src/app/(default)/posts/page.tsx");
    const quickFacts = read("src/components/job-posting/sections/quick-facts.tsx");
    const quickFactsGrid = read("src/components/job-posting/sections/quick-facts-grid.tsx");

    expect(homepage).not.toContain("r.total_vacancies DESC");
    expect(homepage).not.toContain("SUM(po.vacancy_total)");
    expect(legacyArchive).not.toContain("SUM(${vacancies.count})");
    expect(legacyArchive).not.toContain("recruitment.totalVacancies");
    expect(controlCenter).toContain("Verified Vacancy Figures");
    expect(quickFacts).toContain('label: vacancyFieldAccepted ? "Vacancies" : "Vacancies (reported)"');
    expect(quickFactsGrid).toContain("const fieldAccepted = post.officialVacancyEvidenceAccepted === true");
    expect(quickFactsGrid).toContain("isReported: !fieldAccepted");
  });
});
