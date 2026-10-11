import { describe, expect, test } from "vitest";
import { readSource, stripComments } from "../helpers/source";

const POST_QUERY = "src/db/operations/get-posts.ts";
const POST_TYPE = "src/types/job-posting.ts";
const POST_PAGE = "src/components/job-posting/job-posting-page.tsx";
const ELIGIBILITY = "src/components/job-posting/sections/eligibility-criteria.tsx";
const SALARY = "src/components/job-posting/sections/salary-compensation.tsx";
const DATES = "src/components/job-posting/sections/important-dates.tsx";
const QUICK_FACTS = "src/components/job-posting/sections/quick-facts.tsx";
const APPLY = "src/components/job-posting/sections/how-to-apply.tsx";
const VERIFICATION = "src/components/job-posting/sections/official-source-verification.tsx";
const HUB = "src/components/recruitment/recruitment-hub.tsx";

describe("extracted source projection", () => {
  test("maps inventory by its existing canonical Post mapping and keeps it separate from enrichment", () => {
    const source = stripComments(readSource(POST_QUERY));
    expect(source).toContain("inventory_post.other_info_raw->>'canonical_post_id' = p.id::text");
    expect(source).toContain('fi.qualification_raw AS "fjaQualificationRaw"');
    expect(source).toContain('fi.milestones_raw AS "fjaMilestonesRaw"');
    expect(source).toContain('fi.official_verification_status AS "fjaVerificationStatus"');
    expect(source).toContain("fjaExtract: data.fjaInventoryPostId != null");
  });

  test("types source-extracted fields independently from canonical facts", () => {
    const source = readSource(POST_TYPE);
    expect(source).toContain("fjaExtract?: {");
    expect(source).toContain("verificationStatus?: string | null");
    expect(source).toContain("sourcePublishedDate?: Date | string | null");
    expect(source).toContain("recruitmentOtherInfoRaw?: unknown");
  });

  test("post leaf visibly distinguishes extracted claims from official verification", () => {
    const source = stripComments(readSource(POST_PAGE));
    expect(source).toContain("Official verification pending");
    expect(source).toContain("secondary listing");
    expect(source).toContain("post.fjaExtract.verificationStatus !== \"VERIFIED\"");
  });

  test("eligibility, salary and dates can display extracted details without relabelling listing dates as official notification dates", () => {
    const eligibility = stripComments(readSource(ELIGIBILITY));
    const salary = stripComments(readSource(SALARY));
    const dates = stripComments(readSource(DATES));
    const quickFacts = stripComments(readSource(QUICK_FACTS));
    expect(eligibility).toContain("extracted?.qualificationRaw");
    expect(eligibility).toContain("extracted?.experienceRaw");
    expect(salary).toContain("Pay reported in listing · pending verification");
    expect(salary).toContain("post.fjaExtract?.tenureRaw");
    expect(dates).toContain("Source listing published");
    expect(dates).toContain("post.fjaExtract?.milestonesRaw");
    expect(dates).toContain("enrichment?.applicationClosingDate ?? null");
    expect(quickFacts).toContain("Application Deadline (reported)");
    expect(quickFacts).toContain("reportedDeadline");
  });

  test("unverified extracted application methods do not become clickable application links", () => {
    const source = stripComments(readSource(APPLY));
    expect(source).toContain("recruitmentResolvedFacts?.applicationUrl ?? null");
    expect(source).not.toMatch(/post\.applyPortalUrl/);
    expect(source).toContain("Application method reported in listing");
  });

  test("verification UI does not claim extraction confidence is official verification", () => {
    const source = stripComments(readSource(VERIFICATION));
    expect(source).toContain("This status does not mean the details have been");
    expect(source).toContain("Direct official notice link is not available in this record.");
    expect(source).not.toContain("This data has been carefully verified against the official notification.");
  });

  test("recruitment hub separates lifecycle status from source-verification status", () => {
    const source = stripComments(readSource(HUB));
    expect(source).toContain("Official verification pending");
    expect(source).toContain("Recruitment verification notice");
    expect(source).toContain("recruitment.sourceVerificationStatus !== \"VERIFIED\"");
    expect(source).toContain('sourceFactsUnverified ? "Source listing published" : "Notification Published"');
    expect(source).toContain("sourceFactsUnverified ? null : daysUntil(recruitment.applicationEndDate)");
    expect(source).toContain('sourceFactsUnverified ? "Reported Last Date" : "Last Date"');
    expect(source).toContain("The source listing reports");
    expect(source).toContain('sourceFactsUnverified ? "Reported vacancies" : "Vacancies"');
  });
  test("recruitment hubs are non-indexable and only use a role canonical when unambiguous", () => {
    const route = stripComments(readSource("src/app/(default)/jobs/[recruitment-slug]/page.tsx"));
    const schema = stripComments(readSource("src/components/recruitment/structured-data/recruitment-hub-schema.tsx"));
    expect(route).toContain("pageSeo(canonicalPath, { index: false })");
    expect(route).toContain("const canonicalPath = roleSlugs.length === 1 ?");
    expect(route).toContain("/posts/${roleSlugs[0]}");
    expect(route).toContain("/jobs/${recruitment.slug}");
    expect(route).toContain("verificationStatus: recruitment.sourceVerificationStatus ?? null");
    expect(schema).toContain("factsVerified ? toIso(recruitment.notificationDate) : undefined");
    expect(schema).toContain("factsVerified ? toIso(recruitment.applicationEndDate) : undefined");
  });

});