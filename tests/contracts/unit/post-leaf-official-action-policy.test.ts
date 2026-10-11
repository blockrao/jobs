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
});
