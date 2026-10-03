/**
 * Rendered-HTML contracts, asserted against real server responses. Opt-in:
 * set CONTRACT_BASE_URL (e.g. https://www.joboye.com or a preview deploy).
 * Skipped otherwise.
 *
 * These are the only tests that can prove the server-side invariants —
 * <html lang> in the raw response, the canonical Next.js actually renders,
 * real status codes — so they are the acceptance gate for W1-D. Sample URLs
 * are discovered from the target's own sitemap; nothing is hardcoded.
 *
 * Every request is a plain GET with redirects disabled and no JavaScript
 * execution: what a crawler sees before hydration.
 */
import { beforeAll, describe, expect, test } from "vitest";

const BASE = process.env.CONTRACT_BASE_URL?.replace(/\/$/, "");

type Page = { status: number; html: string; location: string | null };

async function get(pathOrUrl: string): Promise<Page> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE}${pathOrUrl}`;
  const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "joboye-contract-tests" } });
  return { status: res.status, html: res.status === 200 ? await res.text() : "", location: res.headers.get("location") };
}

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1] ?? null;
const tags = (html: string, re: RegExp) => html.match(re) ?? [];

const htmlLang = (html: string) => attr(html.match(/<html\b[^>]*>/i)?.[0] ?? "", "lang");
const canonical = (html: string) =>
  tags(html, /<link\b[^>]*>/gi).filter((t) => attr(t, "rel") === "canonical").map((t) => attr(t, "href"));
const hreflang = (html: string) =>
  Object.fromEntries(
    tags(html, /<link\b[^>]*>/gi)
      .filter((t) => attr(t, "rel") === "alternate" && attr(t, "hreflang"))
      .map((t) => [attr(t, "hreflang")!, attr(t, "href")!]),
  );
const noindex = (html: string) =>
  tags(html, /<meta\b[^>]*>/gi).some((t) => attr(t, "name") === "robots" && /noindex/i.test(attr(t, "content") ?? ""));
const jsonLdTypes = (html: string) =>
  tags(html, /<script\b[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi).flatMap((s) =>
    [...s.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map((m) => m[1]),
  );

const ENTITY_PATHS = ["/jobs/", "/organizations/", "/exams/", "/articles/"];

/** For each entity type: one URL that lists a Hindi alternate, one that doesn't. */
const samples: { type: string; en: string; hi: string | null }[] = [];

describe.skipIf(!BASE)("rendered pages", () => {
  beforeAll(async () => {
    const { status, html } = await get("/sitemap.xml");
    expect(status).toBe(200);
    const entries = tags(html, /<url>[\s\S]*?<\/url>/g).map((u) => ({
      loc: u.match(/<loc>([^<]+)<\/loc>/)![1],
      hi: u.match(/hreflang="hi"\s+href="([^"]+)"/)?.[1] ?? null,
    }));
    for (const prefix of ENTITY_PATHS) {
      const ofType = entries.filter((e) => new URL(e.loc).pathname.startsWith(prefix));
      const translated = ofType.find((e) => e.hi);
      const untranslated = ofType.find((e) => !e.hi);
      if (translated) samples.push({ type: prefix, en: translated.loc, hi: translated.hi });
      if (untranslated) samples.push({ type: prefix, en: untranslated.loc, hi: null });
    }
    expect(samples.length).toBeGreaterThan(0);
  });

  test("CAN-01/02 every sampled entity page returns 200 with exactly one absolute, self-referencing, query-free canonical", async () => {
    for (const s of samples) {
      const page = await get(s.en);
      expect(page.status, s.en).toBe(200);
      expect(canonical(page.html), s.en).toEqual([s.en]);
      expect(new URL(s.en).search).toBe("");
    }
  });

  test("CAN-03 the canonical target itself answers 200, never a redirect", async () => {
    for (const s of samples) {
      const [href] = canonical((await get(s.en)).html);
      expect((await get(href!)).status, href!).toBe(200);
    }
  });

  test("LOC-01 the raw server response declares lang=en on English pages and lang=hi on Hindi pages", async () => {
    for (const s of samples) {
      expect(htmlLang((await get(s.en)).html), s.en).toBe("en");
      if (s.hi) expect(htmlLang((await get(s.hi)).html), s.hi).toBe("hi");
    }
  });

  test("LOC-03 hreflang is reciprocal where a Hindi version exists and absent where it does not", async () => {
    for (const s of samples) {
      const en = hreflang((await get(s.en)).html);
      if (s.hi) {
        const hi = hreflang((await get(s.hi)).html);
        expect(en, s.en).toEqual({ en: s.en, hi: s.hi, "x-default": s.en });
        expect(hi, s.hi).toEqual(en);
        expect(canonical((await get(s.hi)).html), s.hi).toEqual([s.hi]);
      } else {
        expect(en, s.en).toEqual({});
      }
    }
  });

  test("LOC-02 an untranslated Hindi URL is noindex and advertises no hreflang", async () => {
    for (const s of samples.filter((x) => !x.hi)) {
      const u = new URL(s.en);
      const page = await get(`${u.origin}/hi${u.pathname}`);
      if (page.status !== 200) continue; // a 404/redirect is also an acceptable outcome
      expect(noindex(page.html), `/hi${u.pathname}`).toBe(true);
      expect(hreflang(page.html), `/hi${u.pathname}`).toEqual({});
    }
  });

  test("SD-01 JobPosting markup appears only on individual job pages", async () => {
    for (const s of samples.filter((x) => x.type !== "/jobs/")) {
      expect(jsonLdTypes((await get(s.en)).html), s.en).not.toContain("JobPosting");
    }
    for (const path of ["/", "/jobs", "/search", "/organizations", "/exams", "/positions", "/recruitments"]) {
      const page = await get(path);
      if (page.status === 200) expect(jsonLdTypes(page.html), path).not.toContain("JobPosting");
    }
  });

  test("IDX-01/02 search and filter views are noindex", async () => {
    for (const path of ["/search", "/search?q=clerk", "/jobs?kind=GOVERNMENT", "/jobs?q=clerk"]) {
      const page = await get(path);
      expect(page.status, path).toBe(200);
      expect(noindex(page.html), path).toBe(true);
    }
  });

  test("IDX-03 sampled canonical entity pages listed in the sitemap are indexable", async () => {
    for (const s of samples) expect(noindex((await get(s.en)).html), s.en).toBe(false);
  });

  test("HTTP-01 an unknown slug returns a real 404 for every entity type", async () => {
    for (const prefix of [...ENTITY_PATHS, "/positions/", "/recruitments/"]) {
      expect((await get(`${prefix}__contract-test-missing__`)).status, prefix).toBe(404);
    }
  });

  test("HTTP-02 the /en/ prefix permanently redirects to the unprefixed canonical URL", async () => {
    for (const s of samples) {
      const u = new URL(s.en);
      const page = await get(`${u.origin}/en${u.pathname}`);
      expect([301, 308], `/en${u.pathname}`).toContain(page.status);
      expect(new URL(page.location!, u.origin).pathname).toBe(u.pathname);
    }
  });
});
