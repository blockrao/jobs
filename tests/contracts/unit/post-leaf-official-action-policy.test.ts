import { describe, expect, test } from "vitest";
import { readSource, stripComments } from "../helpers/source";

const POST_LEAF_COMPONENT = "src/components/job-posting/job-posting-page.tsx";

describe("Post Leaf official actions", () => {
  test("public application and notification links use resolver-approved Recruitment URLs only", () => {
    const source = stripComments(readSource(POST_LEAF_COMPONENT));

    expect(source).toContain("recruitmentResolvedFacts?.applicationUrl ?? null");
    expect(source).toContain("recruitmentResolvedFacts?.officialSource ?? null");
    expect(source).not.toMatch(/post\.applyPortalUrl/);
    expect(source).not.toMatch(/post\.officialSourceUrl/);
  });

  test("internal Recruitment, Organization and sibling-Post links preserve the locale prefix", () => {
    const source = stripComments(readSource(POST_LEAF_COMPONENT));

    expect(source).toContain('const localePrefix = locale === "hi" ? "/hi" : "";');
    expect(source).toContain('href={`${localePrefix}/jobs`}');
    expect(source).toContain('href={`${localePrefix}/organizations/${recruitment.recruitment.organizationSlug}`}');
    expect(source).toContain('href={`${localePrefix}/jobs/${post.recruitmentSlug}/${p.slug}`}');
  });
});
