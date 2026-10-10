/**
 * Public Recruitment/Post UI contracts.
 * Keeps internal inventory diagnostics out of candidate-facing pages and preserves locale-aware navigation.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const recruitmentHub = readFileSync("src/components/recruitment/recruitment-hub.tsx", "utf8");
const postLeaf = readFileSync("src/components/job-posting/job-posting-page.tsx", "utf8");

describe("candidate-facing Recruitment and Post UI", () => {
  test("Recruitment hub does not render raw database or source inventory audit panels", () => {
    expect(recruitmentHub).not.toContain("Database Field Coverage");
    expect(recruitmentHub).not.toContain("Complete Recruitment Record");
    expect(recruitmentHub).not.toContain("RecordFieldGrid");
    expect(recruitmentHub).not.toContain("fjaInventory");
    expect(recruitmentHub).not.toContain("Source article ID:");
  });

  test("Recruitment source link is not incorrectly labelled as an official PDF", () => {
    expect(recruitmentHub).toContain("Notification / source link");
    expect(recruitmentHub).not.toContain("View Official PDF");
  });

  test("Post Leaf internal navigation preserves the Hindi prefix", () => {
    expect(postLeaf).toContain('const localePrefix = locale === "hi" ? "/hi" : "";');
    expect(postLeaf).toContain('href={`${localePrefix}/jobs`}');
    expect(postLeaf).toContain('href={`${localePrefix}/jobs/${post.recruitmentSlug}`}');
    expect(postLeaf).toContain('href={`${localePrefix}/jobs/${post.recruitmentSlug}/${p.slug}`}');
  });
});
