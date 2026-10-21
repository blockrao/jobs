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
const HUB_DATES = "src/components/recruitment/sections/hub-dates.tsx";

describe("extracted source projection", () => {
  test("maps inventory by its existing canonical Post mapping and keeps it separate from enrichment", () => {
    const source = stripComments(readSource(POST_QUERY));
    expect(source).toContain("fi.other_info_raw->>'canonical_post_id'");
    expect(source).toContain('fi.qualification_raw AS "fjaQualificationRaw"');
    expect(source).toContain('fi.milestones_raw AS "fjaMilestonesRaw"');
    expect(source).toContain('fi.official_verification_status AS "fjaVerificationStatus"');
    expect(source).toContain("fjaExtract: data.fjaInventoryPostId != null");
  });

  test("recruitment hubs project inventory-level fields and source-post rows without writing or re-seeding", () => {
    const query = stripComments(readSource("src/db/operations/get-recruitments.ts"));
    const hub = stripComments(readSource(HUB));
    expect(query).toContain("sourceExtract: sourceInventory");
    expect(query).toContain("source_application_end_date");
    expect(query).toContain("source_vacancy_count");
    expect(query).toContain("FROM fja_post_inventory");
    expect(query).toContain("other_info_raw->>'canonical_post_id'");
    expect(query).toContain("fjaExtract: sourcePost");
    expect(hub).toContain("recruitment.sourceExtract?.vacancyCount");
    expect(hub).toContain("sourceDetails.location");
    expect(hub).toContain("sourceDetails.application_mode");
    expect(hub).toContain("parseReportedVacancyCount(post.fjaExtract?.vacancyCountRaw)");
    expect(hub).toContain("sourceDetails?.interview_date_tentative");
    // The hub only surfaces the interview date when source facts are unverified, and
    // the timeline labels it tentative rather than as an official schedule.
    expect(hub).toMatch(/tentativeInterviewDate = sourceFactsUnverified &&/);
    expect(hub).toContain("label: 'Tentative interview date'");
    expect(hub).toContain("note: 'tentative'");
    const hubDates = stripComments(readSource(HUB_DATES));
    expect(hubDates).toMatch(/step\.note && <span[^>]*> \(\{step\.note\}\)<\/span>/);
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
    expect(quickFacts).toContain("extractedVacancyCount");
    expect(quickFacts).toContain('"Location (reported)"');
    expect(salary).toContain('sourceFactsUnverified && post.fjaExtract?.salaryRaw');
  });

  test("unverified extracted application methods do not become clickable application links", () => {
    const source = stripComments(readSource(APPLY));
    expect(source).toContain("recruitmentResolvedFacts?.applicationUrl ?? null");
    expect(source).not.toMatch(/post\.applyPortalUrl/);
    // Extracted (fjaExtract) application modes are never turned into an href.
    expect(source).not.toMatch(/href=\{[^}]*extractedApplicationModes/);
    expect(source).not.toMatch(/href=\{[^}]*fjaExtract/);
  });

  test("verification UI does not claim extraction confidence is official verification", () => {
    const source = stripComments(readSource(VERIFICATION));
    expect(source).toContain("This status does not mean the details have been");
    expect(source).toContain("Official recruitment source link is not available in this record.");
    expect(source).not.toContain("This data has been carefully verified against the official notification.");
  });

  test("recruitment hub separates lifecycle status from source-verification status", () => {
    const source = stripComments(readSource(HUB));
    // Verification state is derived from the Recruitment's own source-verification
    // status, never from lifecycle status.
    expect(source).toContain("recruitment.sourceVerificationStatus !== 'VERIFIED'");
    // Unverified facts are labelled as reported, never as official.
    expect(source).toContain("? 'Source listing published' : 'Notification published'");
    expect(source).toContain("sourceFactsUnverified ? 'Application deadline (reported)' : 'Application closes'");
    expect(source).toContain("The source listing reports");
    // Lifecycle-derived claims (closed state, countdown) come from the shared
    // lifecycle rule and are suppressed while unverified.
    expect(source).toContain("deriveLifecycle(recruitment.status, recruitment.applicationEndDate, now)");
    expect(source).toContain("sourceFactsUnverified ? null : lifecycle.state");
    expect(source).toContain("sourceFactsUnverified ? false : lifecycle.state === 'closed'");
    expect(source).toContain("sourceFactsUnverified ? null : lifecycle.daysLeft");
  });
  test("all Post Leaves emit JobPosting schema; frontend labels unverified facts as reported", () => {
    // Architecture decision (2026-10-15): All posts emit full JobPosting schema.
    // Unverified posts are marked as "reported" on the UI for consumer transparency.
    const route = stripComments(readSource("src/app/(default)/jobs/[recruitment-slug]/[post-slug]/page.tsx"));
    const schema = stripComments(readSource("src/components/job-posting/structured-data/post-leaf-schema.tsx"));
    // No verification-based schema suppression anywhere on the leaf path.
    expect(route).not.toContain("suppressJobPostingSchema");
    expect(route).not.toContain("sourceVerificationPending");
    // All posts emit JobPosting schema regardless of verification, in the one
    // shared @graph (site org, breadcrumb, web page, JobPosting, visible FAQ).
    expect(schema).toContain("jsonLdGraph(siteOrg, breadcrumb, webPage, jobPosting, faqPage)");
    expect(schema).not.toMatch(/[vV]erif/);
    // Frontend shows "reported" labels for consumer protection (verification notice banners)
    const page = stripComments(readSource("src/components/job-posting/job-posting-page.tsx"));
    expect(page).toContain("Vacancies (reported)");
    expect(page).toContain("verificationStatus");
  });

  test("the leaf renderer gates JobPosting on lifecycle only, never on verification status", () => {
    const renderer = stripComments(readSource("src/components/job-posting/job-detail-page-production.tsx"));
    expect(renderer).toMatch(/const emitJobPosting = !\(recruitmentClosed && !applicationDeadline\);/);
    expect(renderer).not.toMatch(/emitJobPosting[^\n]*[vV]erif/);
  });

  test("a recruitment hub is always canonical to itself and indexable (URL contract 2026-10-20)", () => {
    // The single-post-leaf canonical exception (Oct 2026) was retired with the
    // URL contract: /jobs/{recruitment-slug} is the canonical unit, always.
    const route = stripComments(readSource("src/app/(default)/jobs/[recruitment-slug]/page.tsx"));
    const schema = stripComments(readSource("src/components/recruitment/structured-data/recruitment-hub-schema.tsx"));
    expect(route).not.toContain("getSinglePostLeafSlug");
    expect(route).not.toContain("singleLeafSlug");
    expect(route).not.toContain("/posts/${roleSlugs[0]}");
    // Canonical and robots go through src/lib/seo (CAN-05): self-canonical, indexable.
    expect(route).toContain("pageSeo(`/jobs/${recruitment.slug}`, { index: true })");
    // Only a legacy slug (recruitment_slug_redirects) redirects; smart resolution renders in place.
    expect(route).toMatch(/if \(data\.resolutionMethod === "legacy-redirect"\) \{\s*permanentRedirect\(`\/jobs\/\$\{data\.recruitment\.slug\}`\);/);
    // Hub structured data keys its dates on source verification, never fabricating them.
    expect(schema).toMatch(/const datePostedIso = factsVerified\s*\?\s*toIso\(recruitment\.notificationDate\)/);
    expect(schema).toContain("const expiresIso = factsVerified ? toIso(recruitment.applicationEndDate) : undefined;");
  });

});