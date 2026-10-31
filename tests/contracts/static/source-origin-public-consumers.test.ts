import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("source-origin publication gates across public consumers", () => {
  const recruitments = read("src/db/operations/get-recruitments.ts");
  const posts = read("src/db/operations/get-posts.ts");
  const relatedPosts = read("src/db/operations/get-related-posts.ts");
  const organizations = read("src/db/operations/get-organizations.ts");
  const queries = read("src/lib/queries.ts");
  const search = read("src/lib/search-queries.ts");
  const sitemap = read("src/app/sitemap.ts");
  const leafPage = read("src/app/(default)/jobs/[recruitment-slug]/[post-slug]/page.tsx");
  const leafComponent = read("src/components/job-posting/job-detail-page-production.tsx");

  it("gates Recruitment hubs and every loaded canonical Post Leaf", () => {
    expect(recruitments).toContain("private.is_recruitment_publicly_trusted");
    expect(recruitments).toContain("private.is_post_publicly_trusted");
    expect(posts).toContain("private.is_post_publicly_trusted");
    expect(relatedPosts).toContain("private.is_post_publicly_trusted");
  });

  it("gates organization, homepage, legacy-posting and qualification discovery", () => {
    expect(organizations).toContain("private.is_recruitment_publicly_trusted");
    expect(queries).toContain("private.is_recruitment_publicly_trusted");
    expect(queries).toContain("private.is_post_publicly_trusted");
    expect(queries).toContain("const sourceTrustedPosting");
    expect(queries).toContain("postings.inferredPostId} IS NOT NULL");
    expect(queries).toContain("private.is_post_publicly_trusted(sp.inferred_post_id)");
  });

  it("gates search results and autocomplete through canonical Post mappings", () => {
    expect(search).toContain("private.is_recruitment_publicly_trusted(r.id)");
    expect(search).toContain("private.is_post_publicly_trusted(p.inferred_post_id)");
    expect(search).toContain("private.is_post_publicly_trusted(po.id)");
  });

  it("uses issuer notification dates, never database ingestion timestamps, for announcement state", () => {
    expect(search).toContain("r.notification_date::timestamptz AS announced_at");
    expect(search).not.toContain("COALESCE(p.created_at, r.created_at) AS announced_at");
  });

  it("keeps the sitemap aligned with the public Recruitment and Post gates", () => {
    expect(sitemap).toContain("private.is_recruitment_publicly_trusted(r.id)");
    expect(sitemap).toContain("private.is_post_publicly_trusted(p.id)");
  });

  it("does not pass raw FJA extraction or aggregator links into public Post Leaf UI", () => {
    expect(leafPage).not.toContain("fjaExtract");
    expect(leafComponent).not.toContain("fjaExtract");
    expect(leafPage).toContain("publicLink(post.recruitmentOfficialNotificationUrl)");
    expect(leafPage).toContain("publicLink(post.recruitmentOfficialApplicationUrl)");
    expect(leafPage).toContain("stripAggregatorData(post.enrichment)");
  });
});
