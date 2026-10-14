import { describe, expect, test } from "vitest";
import { readSource, stripComments } from "../helpers/source";

const LEAF_ROUTE = "src/app/(default)/jobs/[recruitment-slug]/[post-slug]/page.tsx";
const RECRUITMENT_QUERIES = "src/db/operations/get-recruitments.ts";
const NEXT_CONFIG = "next.config.ts";

describe("P0 Post Leaf ISR and bounded context query", () => {
  test("supports on-demand ISR without enumerating the growing URL inventory", () => {
    const route = stripComments(readSource(LEAF_ROUTE));

    expect(route).toMatch(/export const revalidate\s*=\s*300\s*;/);
    expect(route).toMatch(/export const dynamicParams\s*=\s*true\s*;/);
    expect(route).toMatch(/export async function generateStaticParams\(\)\s*\{\s*return \[\];\s*\}/);
    expect(route).toContain("getRecruitmentLeafContext(recruitmentSlug)");
    expect(route).toContain("getPostBySlug(recruitmentSlug, postSlug, true)");
    expect(route).not.toContain("getRecruitmentWithPosts(recruitmentSlug)");

    const postQuery = stripComments(readSource("src/db/operations/get-posts.ts"));
    expect(postQuery).toContain("throwOnError = false");
    expect(postQuery).toContain("if (throwOnError) throw err;");
  });

  test("leaf context only selects recruitment facts and sibling link summaries", () => {
    const source = stripComments(readSource(RECRUITMENT_QUERIES));
    const start = source.indexOf("export async function getRecruitmentLeafContext(");
    const end = source.indexOf("export const getRecruitmentWithPostsCached", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const helper = source.slice(start, end);
    expect(helper).toContain(".from(recruitments)");
    expect(helper).toContain(".innerJoin(organizations");
    expect(helper).toContain("id: posts.id");
    expect(helper).toContain("slug: posts.slug");
    expect(helper).toContain("title: posts.name");
    expect(helper).toContain(".from(posts)");
    expect(helper).not.toContain(".from(vacancies)");
    expect(helper).not.toContain(".from(eligibilities)");
    expect(helper).not.toContain("fja_post_inventory");
    expect(helper).not.toContain("post_enrichments");
  });

  test("does not override Post Leaf ISR with a route-specific no-store header", () => {
    const config = stripComments(readSource(NEXT_CONFIG));
    expect(config).not.toContain('source: "/jobs/:slug/:postSlug"');
    expect(config).not.toContain('value: "no-store"');
  });
});
