/**
 * Public Recruitment/Post UI contracts.
 * Keeps internal inventory diagnostics out of candidate-facing pages and preserves locale-aware navigation.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const recruitmentHub = readFileSync("src/components/recruitment/recruitment-hub.tsx", "utf8");
const postLeaf = readFileSync("src/components/job-posting/job-posting-page.tsx", "utf8");
const recruitmentQueries = readFileSync("src/db/operations/get-recruitments.ts", "utf8");
const localeRecruitmentRoute = readFileSync("src/app/[locale]/jobs/[slug]/page.tsx", "utf8");
const internalReviewRoute = readFileSync("src/app/(default)/fja-review/page.tsx", "utf8");

function collectPublicUiSources(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "api" || entry === "admin" || entry === "__tests__") return [];
      return collectPublicUiSources(path);
    }
    return /\\.(tsx?|jsx?|css|mdx?)$/i.test(path) ? [path] : [];
  });
}

describe("candidate-facing Recruitment and Post UI", () => {
  test("Recruitment hub does not render raw database or source inventory audit panels", () => {
    expect(recruitmentHub).not.toContain("Database Field Coverage");
    expect(recruitmentHub).not.toContain("Complete Recruitment Record");
    expect(recruitmentHub).not.toContain("RecordFieldGrid");
    expect(recruitmentHub).not.toContain("fjaInventory");
    expect(recruitmentHub).not.toContain("Source article ID:");
  });

  test("public routes and UI source contain no source-aggregator brand or domain references", () => {
    const publicSources = [
      ...collectPublicUiSources("src/app"),
      ...collectPublicUiSources("src/components"),
      ...collectPublicUiSources("src/content"),
    ];
    const prohibited = /free\\s*job\\s*alert|freejobalert\\.com|\\bfja\\b/i;
    const matches = publicSources.flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return prohibited.test(source) ? [path] : [];
    });
    expect(matches).toEqual([]);
  });

  test("candidate-facing Recruitment and Post components contain no source-aggregator branding", () => {
    for (const source of [recruitmentHub, postLeaf]) {
      expect(source).not.toMatch(/free\\s*job\\s*alert|freejobalert|\\bfja\\b/i);
      expect(source).not.toContain("source extraction is not an official confirmation");
      expect(source).not.toContain("All Posts — Detailed Comparison");
    }
  });

  test("internal source-review route is not publicly accessible", () => {
    expect(internalReviewRoute).toContain('import { notFound } from "next/navigation";');
    expect(internalReviewRoute).toContain("notFound();");
    expect(internalReviewRoute).not.toContain("freejobalert.com");
  });

  test("public pages never fall back to unverified raw source/application URLs", () => {
    expect(recruitmentHub).not.toContain("recruitment.officialNotificationUrl ?? null");
    expect(recruitmentHub).not.toContain("recruitment.officialApplicationUrl ?? recruitment.applyUrl");
    expect(postLeaf).not.toContain("post.officialSourceUrl ?? null");
    expect(postLeaf).not.toContain("post.applyPortalUrl ?? null");
    expect(readFileSync("src/components/job-posting/sections/official-source-verification.tsx", "utf8")).not.toContain("post.officialSourceUrl ?? null");
  });

  test("Recruitment source link is not incorrectly labelled as an official PDF", () => {
    expect(recruitmentHub).toContain("Notification / source link");
    expect(recruitmentHub).not.toContain("View Official PDF");
  });

  test("Recruitment hub preserves locale-prefixed internal links", () => {
    expect(recruitmentHub).toContain('const localePrefix = locale === "hi" ? "/hi" : "";');
    expect(recruitmentHub).toContain("localePrefix}/jobs");
    expect(recruitmentHub).toContain("localePrefix}/organizations");
    expect(localeRecruitmentRoute).toContain("locale={locale}");
  });

  test("Recruitment hub maps stored exam, notification, fee, and selection facts into readable rows", () => {
    expect(recruitmentHub).toContain("Notification No.");
    expect(recruitmentHub).toContain("Application Fee");
    expect(recruitmentHub).toContain("Selection Process");
    expect(recruitmentHub).toContain("recruitment.recruitmentFees");
    expect(recruitmentHub).toContain("recruitment.selectionProcesses");
    expect(recruitmentHub).toContain("recruitment.exam");
  });

  test("public Recruitment loader avoids raw inventory and per-post audit joins", () => {
    expect(recruitmentQueries).not.toContain("fja_post_inventory");
    expect(recruitmentQueries).not.toContain("post_enrichments");
    expect(recruitmentQueries).toContain("recruitment_fees");
    expect(recruitmentQueries).toContain("selection_processes");
  });

  test("Post Leaf internal navigation preserves the Hindi prefix", () => {
    expect(postLeaf).toContain('const localePrefix = locale === "hi" ? "/hi" : "";');
    expect(postLeaf).toContain('href={`${localePrefix}/jobs`}');
    expect(postLeaf).toContain('href={`${localePrefix}/jobs/${post.recruitmentSlug}`}');
    expect(postLeaf).toContain('href={`${localePrefix}/jobs/${post.recruitmentSlug}/${p.slug}`}');
  });
});
