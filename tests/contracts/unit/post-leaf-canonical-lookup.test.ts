import { describe, expect, test } from "vitest";
import { readSource, stripComments } from "../helpers/source";

const source = () => stripComments(readSource("src/db/operations/get-posts.ts"));

describe("canonical Post leaf lookup", () => {
  test("returns the Recruitment's current slug, not a denormalized legacy slug", () => {
    const sql = source();
    expect(sql.match(/r\.slug AS "recruitmentSlug"/g)).toHaveLength(2);
    expect(sql).not.toContain('COALESCE(p."recruitmentSlug", r.slug)');
  });

  test("scopes the Post to its canonical Recruitment while preserving old-slug redirects", () => {
    const sql = source();
    expect(sql.match(/r\.slug = \$\{recruitmentSlug\}/g)).toHaveLength(2);
    const legacySlugPredicates = sql.match(/WHERE old_slug = \$\{recruitmentSlug\}/g) ?? [];
    expect(legacySlugPredicates.length).toBeGreaterThanOrEqual(2);
  });
});
