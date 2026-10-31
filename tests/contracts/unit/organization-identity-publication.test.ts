import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("issuer / organisation mismatch publication guard", () => {
  test("Post Leaf metadata becomes noindex for a conflicting organisation", () => {
    const source = read("src/app/(default)/jobs/[recruitment-slug]/[post-slug]/page.tsx");
    expect(source).toContain("post.organizationIdentityMismatch !== true");
    expect(source).toContain("indexable={post.organizationIdentityMismatch !== true");
  });

  test("Recruitment Hub metadata becomes noindex for a conflicting organisation", () => {
    const source = read("src/app/(default)/jobs/[recruitment-slug]/page.tsx");
    expect(source).toContain("recruitment.organizationIdentityMismatch !== true");
  });

  test("both canonical URL levels are filtered from the sitemap", () => {
    const source = read("src/app/sitemap.ts");
    expect(source.match(/hasHighConfidenceIssuerOrganizationMismatch/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  test("organisation pages exclude mismatched recruitments before calculating roles and totals", () => {
    const source = read("src/lib/organizations/stats.ts");
    expect(source).toContain("const eligibleRows = rowsOf<RecruitmentRow>(recResult).filter");
    expect(source).toContain("const eligibleIds = eligibleRows.map((r) => r.id)");
    expect(source).toContain("r.id IN (${sql.join");
  });

  test("Post Leaf data does not publish the conflicting organisation name", () => {
    const source = read("src/db/operations/get-posts.ts");
    expect(source).toContain("organizationIdentityMismatch ? null : data.organizationName");
    expect(source).toContain("hasHighConfidenceIssuerOrganizationMismatch");
  });

  test("Recruitment Hub data does not publish the conflicting organisation name", () => {
    const source = read("src/db/operations/get-recruitments.ts");
    expect(source).toContain("organizationName: organizationIdentityMismatch ? null");
    expect(source).toContain("organization: organizationIdentityMismatch ? null");
  });
});
