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
  // FJA inventory projection tests removed 2026-10-24: fja_job_inventory and
  // fja_post_inventory were dropped; aggregator data no longer reaches pages.

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
    expect(source).toContain("sourceFactsUnverified || lifecycleEvidenceMissing ? null : lifecycle.state");
    expect(source).toContain("sourceFactsUnverified || lifecycleEvidenceMissing ? false : lifecycle.state === 'closed'");
    expect(source).toContain("sourceFactsUnverified || lifecycleEvidenceMissing ? null : lifecycle.daysLeft");
  });
  test("Post Leaves emit JobPosting until the deadline closes, regardless of verification; frontend labels unverified facts as reported", () => {
    // Architecture decision (2026-10-15): All posts emit full JobPosting schema.
    // Unverified posts are marked as "reported" on the UI for consumer transparency.
    const route = stripComments(readSource("src/app/(default)/jobs/[recruitment-slug]/[post-slug]/page.tsx"));
    const schema = stripComments(readSource("src/components/job-posting/structured-data/post-leaf-schema.tsx"));
    // No verification-based schema suppression anywhere on the leaf path.
    expect(route).not.toContain("suppressJobPostingSchema");
    expect(route).not.toContain("sourceVerificationPending");
    // Verification status is not a schema gate. JobPosting requires an open
    // lifecycle and an indexable leaf; a CLOSED deadline also drops the node.
    expect(schema).toContain("jsonLdGraph(siteOrg, breadcrumb, webPage, postingClosed || !emitJobPosting ? null : jobPosting, faqPage)");
    expect(schema).toContain('const postingClosed = resolvedDeadline.state === "CLOSED";');
    expect(schema).not.toMatch(/[vV]erif/);
    // Frontend shows "reported" labels for consumer protection (verification notice banners)
    const page = stripComments(readSource("src/components/job-posting/job-posting-page.tsx"));
    expect(page).toContain("Vacancies (reported)");
    expect(page).toContain("verificationStatus");
  });

  test("the leaf renderer gates JobPosting on open lifecycle and manually verified official links", () => {
    const renderer = stripComments(readSource("src/components/job-posting/job-detail-page-production.tsx"));
    expect(renderer).toContain("const notificationLinkVerified = Boolean(post.officialSourceUrl) && isManuallyVerifiedOfficialLink(post.officialLinkSource);");
    expect(renderer).toContain("const applicationLinkVerified = Boolean(post.applyUrl) && isManuallyVerifiedOfficialLink(post.officialLinkSource);");
    expect(renderer).toContain("const emitJobPosting = (lifecycle ? lifecycle.isOpen : !isApplicationClosed)");
    expect(renderer).toContain("const publishedDate = toPlausibleRecruitmentDate(post.notificationPublicationDate);");
    expect(renderer).toContain("&& indexable && notificationLinkVerified && applicationLinkVerified && hasValidPublishedDate;");
    expect(renderer).not.toContain("post.notificationPublicationDate || post.postedAt");
    expect(renderer).not.toContain("post.postedAt");
    const schema = stripComments(readSource("src/components/job-posting/structured-data/post-leaf-schema.tsx"));
    expect(schema).toContain("const datePostedIso = toIso(post.notificationPublicationDate);");
    expect(schema).not.toContain("toIso(post.postedAt)");
  });

  test("a recruitment hub remains canonical and is indexable only when source and employer checks pass (URL contract 2026-10-20)", () => {
    // The single-post-leaf canonical exception (Oct 2026) was retired with the
    // URL contract: /jobs/{recruitment-slug} is the canonical unit, always.
    const route = stripComments(readSource("src/app/(default)/jobs/[recruitment-slug]/page.tsx"));
    const schema = stripComments(readSource("src/components/recruitment/structured-data/recruitment-hub-schema.tsx"));
    expect(route).not.toContain("getSinglePostLeafSlug");
    expect(route).not.toContain("singleLeafSlug");
    expect(route).not.toContain("/posts/${roleSlugs[0]}");
    // Canonical and robots go through src/lib/seo (CAN-05): self-canonical, indexable.
    // Indexable unless the issuing organisation is still unidentified (placeholder org).
    expect(route).toContain("index: !safeInput.unverifiedAggregator && !isUnresolvedOrganization(recruitment.organizationSlug)");
    // Only a legacy slug (recruitment_slug_redirects) redirects; smart resolution renders in place.
    expect(route).toMatch(/if \(data\.resolutionMethod === "legacy-redirect"\) \{\s*permanentRedirect\(`\/jobs\/\$\{data\.recruitment\.slug\}`\);/);
    // Hub structured data keys its dates on source verification, never fabricating them.
    expect(schema).toMatch(/const datePostedIso = factsVerified\s*\?\s*toIso\(recruitment\.notificationDate\)/);
    expect(schema).toContain("const expiresIso = factsVerified ? toIso(recruitment.applicationEndDate) : undefined;");
  });

});