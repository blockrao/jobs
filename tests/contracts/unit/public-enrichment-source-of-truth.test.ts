import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("public enrichment source of truth", () => {
  test("Post Leaf loader uses canonical Post data and JSONB, not the legacy enrichment row", () => {
    const source = read("src/db/operations/get-posts.ts");
    const start = source.indexOf("export async function getPostBySlug(");
    const end = source.indexOf("export const getPostBySlugCached", start);
    const loader = source.slice(start, end);

    expect(loader).toContain("const data = coreData as PostRow");
    expect(loader).not.toContain("getPostEnrichmentData");
    expect(loader).not.toContain("getFjaExtractForPost");
    expect(loader).toContain("transformEnrichment(enrichmentJsonb)");
  });

  test("Recruitment Hub loader does not fetch or attach unused post_enrichments rows", () => {
    const source = read("src/db/operations/get-recruitments.ts");
    expect(source).not.toContain("FROM post_enrichments");
    expect(source).not.toContain("postEnrichment:");
  });

  test("legacy detail projections remain available without overriding canonical fields", () => {
    const source = read("src/db/operations/get-posts.ts");
    expect(source).toContain("async function getPostDetailEnrichment");
    expect(source).toContain("LEFT JOIN post_enrichments e ON p.id = e.post_id");
  });
});
