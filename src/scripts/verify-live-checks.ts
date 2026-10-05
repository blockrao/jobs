/** Pure checks for verify-live (no network). */
import { isAggregatorUrl, mentionsAggregator } from "../lib/aggregators";

export type CheckResult = { page: string; check: string; ok: boolean; detail: string };
export type PageInput = { label: string; url: string; status: number; body: string };
export type Expect = { enUrl: string; hiUrl: string };

const norm = (u: string) => u.trim().replace(/\/$/, "");

function tags(html: string, name: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const re = new RegExp(`<${name}\\b([^>]*)>`, "gi");
  for (const m of html.matchAll(re)) {
    const attrs: Record<string, string> = {};
    for (const a of m[1].matchAll(/([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
      attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? "";
    }
    out.push(attrs);
  }
  return out;
}

export function checkStatus(status: number): [boolean, string] {
  return [status === 200, `HTTP ${status}`];
}

export function checkIndexable(html: string): [boolean, string] {
  const bad = tags(html, "meta").filter(
    (m) => /^(robots|googlebot)$/i.test(m.name ?? "") && /noindex/i.test(m.content ?? ""),
  );
  return [bad.length === 0, bad.length ? `noindex: ${bad[0].content}` : "no noindex meta"];
}

export function checkCanonical(html: string, self: string): [boolean, string] {
  const c = tags(html, "link").filter((l) => /(^|\s)canonical(\s|$)/i.test(l.rel ?? ""));
  if (c.length !== 1) return [false, `${c.length} canonical links`];
  const ok = norm(c[0].href ?? "") === norm(self);
  return [ok, ok ? c[0].href : `canonical ${c[0].href} != ${self}`];
}

export function checkHreflang(html: string, e: Expect): [boolean, string] {
  const alts = tags(html, "link").filter((l) => /alternate/i.test(l.rel ?? "") && l.hreflang);
  const map = new Map(alts.map((l) => [l.hreflang.toLowerCase(), norm(l.href ?? "")]));
  const want: [string, string][] = [
    ["en", norm(e.enUrl)],
    ["hi", norm(e.hiUrl)],
    ["x-default", norm(e.enUrl)],
  ];
  const miss = want
    .filter(([k, v]) => map.get(k) !== v)
    .map(([k, v]) => `${k} (expected ${v}, got ${map.get(k) ?? "none"})`);
  return [miss.length === 0, miss.length ? `bad: ${miss.join("; ")}` : "en/hi/x-default ok"];
}

export function extractJsonLd(html: string): { ok: boolean; types: string[]; errors: number } {
  const types: string[] = [];
  let errors = 0;
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (n && typeof n === "object") {
      const o = n as Record<string, unknown>;
      const t = o["@type"];
      (Array.isArray(t) ? t : t ? [t] : []).forEach((x) => types.push(String(x)));
      if (o["@graph"]) walk(o["@graph"]);
    }
  };
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    try {
      walk(JSON.parse(m[1]));
    } catch {
      errors++;
    }
  }
  return { ok: errors === 0 && types.length > 0, types, errors };
}

export function checkJsonLd(html: string, required = ["BreadcrumbList"]): [boolean, string] {
  const j = extractJsonLd(html);
  if (j.errors) return [false, `${j.errors} JSON-LD block(s) failed to parse`];
  const missing = required.filter((t) => !j.types.includes(t));
  if (missing.length) {
    return [false, `missing types: ${missing.join(", ")} (found: ${j.types.join(", ") || "none"})`];
  }
  return [true, `types: ${j.types.join(", ")}`];
}

export function checkNoAggregators(html: string): [boolean, string] {
  const hits: string[] = [];
  for (const a of tags(html, "a")) if (a.href && isAggregatorUrl(a.href)) hits.push(`link ${a.href}`);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  if (mentionsAggregator(text)) hits.push("aggregator name in text");
  return [hits.length === 0, hits.length ? hits.slice(0, 3).join("; ") : "none found"];
}

export function checkSitemap(status: number, xml: string, urls: string[]): CheckResult[] {
  if (status !== 200) return [{ page: "sitemap", check: "sitemap.xml", ok: false, detail: `HTTP ${status}` }];
  const locs = new Set([...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => norm(m[1])));
  return urls.map((u) => ({
    page: u.includes("/hi/") ? "hi" : "en",
    check: "in sitemap",
    ok: locs.has(norm(u)),
    detail: locs.has(norm(u)) ? "present" : "absent from /sitemap.xml",
  }));
}

export function checkPage(p: PageInput, e: Expect): CheckResult[] {
  const r = (check: string, [ok, detail]: [boolean, string]): CheckResult => ({
    page: p.label,
    check,
    ok,
    detail,
  });
  const st = checkStatus(p.status);
  const out = [r("HTTP 200", st)];
  if (!st[0]) return out;
  out.push(
    r("indexable", checkIndexable(p.body)),
    r("self-canonical", checkCanonical(p.body, p.url)),
    r("hreflang", checkHreflang(p.body, e)),
    r("JSON-LD", checkJsonLd(p.body)),
    r("no aggregators", checkNoAggregators(p.body)),
  );
  return out;
}

export function formatTable(rs: CheckResult[]): string {
  const w1 = Math.max(4, ...rs.map((r) => r.page.length));
  const w2 = Math.max(5, ...rs.map((r) => r.check.length));
  const line = (a: string, b: string, c: string, d: string) =>
    `${a.padEnd(w1)}  ${b.padEnd(w2)}  ${c.padEnd(4)}  ${d}`;
  return [
    line("PAGE", "CHECK", "", "DETAIL"),
    ...rs.map((r) => line(r.page, r.check, r.ok ? "PASS" : "FAIL", r.detail)),
  ].join("\n");
}
