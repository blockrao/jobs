import { describe, expect, test } from "vitest";
import { readSource, stripComments } from "../helpers/source";

const source = () => stripComments(readSource("src/db/operations/get-posts.ts"));

describe("canonical Post leaf lookup", () => {
  test("returns the Recruitment current slug, not a denormalized legacy slug", () => {
    const sql = source();
    // Every projection of a post's recruitment slug reads the live
    // recruitments row; the denormalized p."recruitmentSlug" is never selected.
    expect(sql.match(/r\.slug AS "recruitmentSlug"/g)!.length).toBeGreaterThanOrEqual(2);
    expect(sql).not.toMatch(/p\."recruitmentSlug"\s+AS/);
    expect(sql).not.toContain('COALESCE(p."recruitmentSlug", r.slug)');
  });

  test("scopes the Post to its canonical Recruitment while preserving old-slug redirects", () => {
    const sql = source();
    expect(sql.match(/r\.slug = \$\{recruitmentSlug\}/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    const legacySlugPredicates = sql.match(/WHERE old_slug = \$\{recruitmentSlug\}/g) ?? [];
    expect(legacySlugPredicates.length).toBeGreaterThanOrEqual(2);
  });
});
