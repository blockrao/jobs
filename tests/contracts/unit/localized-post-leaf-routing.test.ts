import { describe, expect, test } from "vitest";
import { readSource, stripComments } from "../helpers/source";

describe("localized Post Leaf route contract", () => {
  test("explicitly prefixed Post Leaf URLs reach next-intl before locale fallback redirects", () => {
    const proxy = stripComments(readSource("src/proxy.ts"));
    expect(proxy).toContain("if (/^\\/(en|hi)\\/jobs\\/[^/]+\\/[^/]+\\/?$/.test(pathname)) {");
    expect(proxy.indexOf("return intlMiddleware(request);")).toBeLessThan(
      proxy.indexOf("const localePrefixMatch = pathname.match"),
    );
  });

  test("leaf metadata derives its canonical path from the resolved Post relationship", () => {
    const route = stripComments(readSource("src/app/[locale]/jobs/[slug]/[post-slug]/page.tsx"));
    expect(route).toContain('const canonicalSlug = post.recruitmentSlug + "/" + post.slug;');
    expect(route).toContain("slug: canonicalSlug");
    expect(route).toContain("hasHindi: false");
  });
});
