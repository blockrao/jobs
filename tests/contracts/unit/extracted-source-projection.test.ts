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
    expect(source).toContain("inventory_post.other_info_raw->>'canonical_post_id' = p.id::text");
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
    // the renderer labels it tentative rather than as an official schedule.
    expect(hub).toMatch(/tentativeInterviewDate = sourceFactsUnverified &&/);
    const hubDates = stripComments(readSource(HUB_DATES));
    expect(hubDates).toContain("label: 'Tentative interview date'");
    expect(hubDates).toContain("note: 'tentative'");
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
    expect(source).toContain("Application method (reported)");
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
    // Lifecycle-derived claims (closed state, countdown) are suppressed while unverified.
    expect(source).toContain("sourceFactsUnverified ? false : isRecruitmentClosed(recruitment.status)");
    expect(source).toContain("sourceFactsUnverified ? null : daysUntil(appEndRaw)");
  });
  test("unverified extracted Post Leaves omit JobPosting schema and label vacancies as reported", () => {
    const route = stripComments(readSource("src/app/(default)/jobs/[recruitment-slug]/[post-slug]/page.tsx"));
    const schema = stripComments(readSource("src/components/job-posting/structured-data/post-leaf-schema.tsx"));
    // Indexability is gated on a canonical title plus an official source; verification
    // pending gates the structured data and meta claims, not the page itself.
    expect(route).toContain("index: isIndexable");
    expect(route).toContain("suppressJobPostingSchema={sourceVerificationPending}");
    expect(route).toContain('"reported vacancies"');
    expect(schema).toContain("suppressJobPostingSchema ? [breadcrumb] : [breadcrumb, jobPosting]");
  });

  test("locale Post Leaf route wires the same schema-suppression contract as the default route", () => {
    // Regression: the locale route previously rendered PostLeafStructuredData without
    // suppressJobPostingSchema, causing unverified inventory-backed leaves to emit
    // JobPosting JSON-LD even when source verification was pending.
    const localeRoute = stripComments(readSource("src/app/[locale]/jobs/[slug]/[post-slug]/page.tsx"));
    // Must derive sourceVerificationPending from fjaExtract — identical condition to (default) route.
    expect(localeRoute).toContain('post.fjaExtract && post.fjaExtract.verificationStatus !== "VERIFIED"');
    // Must pass it to the structured-data component.
    expect(localeRoute).toContain("suppressJobPostingSchema={sourceVerificationPending}");
    // Must suppress indexing in metadata when verification is pending — parallel to (default) route.
    expect(localeRoute).toContain("index: false");
    // BreadcrumbList suppression guard must still be the locale check, not the inventory check.
    expect(localeRoute).toContain('locale !== "hi"');
  });

  test("null fjaExtract does not suppress schema — absence of inventory link is not unverified", () => {
    // Invariant: fjaExtract is null for posts with no fja_post_inventory canonical_post_id link.
    // These are canonical write-path posts (not aggregator-scraped) and are safe to index.
    // The suppression condition must be: fjaExtract present AND verificationStatus !== VERIFIED.
    // It must NOT be: !fjaExtract (which would suppress all non-inventory posts).
    const defaultRoute = stripComments(readSource("src/app/(default)/jobs/[recruitment-slug]/[post-slug]/page.tsx"));
    const localeRoute = stripComments(readSource("src/app/[locale]/jobs/[slug]/[post-slug]/page.tsx"));
    // Both routes must gate on fjaExtract presence first, then check status — not just status alone.
    expect(defaultRoute).toContain("post.fjaExtract && post.fjaExtract.verificationStatus");
    expect(localeRoute).toContain("post.fjaExtract && post.fjaExtract.verificationStatus");
    // Neither route may suppress schema when fjaExtract is absent (null-guard must be the && clause).
    expect(defaultRoute).not.toMatch(/!post\.fjaExtract.*suppressJobPostingSchema/);
    expect(localeRoute).not.toMatch(/!post\.fjaExtract.*suppressJobPostingSchema/);
  });

  test("a recruitment hub canonicalises to its single indexable Post leaf and stays noindex; otherwise it is canonical and indexable", () => {
    // Owner decision, Oct 2026 (implemented 2026-10-14): a single-Post recruitment
    // canonicalises to its own Post page; multi-Post hubs are the canonical unit.
    const route = stripComments(readSource("src/app/(default)/jobs/[recruitment-slug]/page.tsx"));
    const schema = stripComments(readSource("src/components/recruitment/structured-data/recruitment-hub-schema.tsx"));
    expect(route).toContain("const singleLeafSlug = await getSinglePostLeafSlug(recruitment.id);");
    expect(route).toContain("const canonicalPath = singleLeafSlug ? `/jobs/${recruitment.slug}/${singleLeafSlug}` : `/jobs/${recruitment.slug}`;");
    expect(route).toContain("const hubIndexable = !singleLeafSlug && !unresolvedOrg;");
    expect(route).toContain("pageSeo(canonicalPath, hubIndexable ? undefined : { index: false })");
    expect(route).not.toContain("/posts/${roleSlugs[0]}");
    expect(route).toContain("verificationStatus: recruitment.sourceVerificationStatus ?? null");
    expect(schema).toMatch(/const datePostedIso = factsVerified\s*\?\s*toIso\(recruitment\.notificationDate\)/);
    expect(schema).toContain("const expiresIso = factsVerified ? toIso(recruitment.applicationEndDate) : undefined;");
  });

});