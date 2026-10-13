#!/usr/bin/env tsx
/**
 * Read-only audit for Posts whose organizationName is a placeholder.
 * Never writes canonical tables. Source page metadata and alias matches are
 * suggestions only; the official notice must support the employer identity.
 *
 * Usage: DATABASE_URL=... npx tsx scripts/audit-unknown-organizations.ts [--out path.json]
 */
import postgres from "postgres";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type Target = {
  post_id: number; slug: string; post_name: string | null; post_title: string | null;
  organization_name: string | null; organization_id: number | null;
  employing_organization_id: number | null; recruitment_id: number | null;
  recruitment_name: string | null; recruitment_organization_id: number | null;
  recruitment_official_url: string | null; post_official_url: string | null; apply_portal_url: string | null;
};
type Alias = {
  organization_id: number; organization_name: string; organization_slug: string;
  website_url: string | null; alias_raw: string; alias_normalized: string;
};
type Observation = {
  url: string; finalUrl?: string; httpStatus?: number; contentType?: string | null;
  pageTitle?: string | null; metaDescription?: string | null; h1?: string | null;
  hostname?: string; error?: string;
};
const normalize = (value: string) =>
  value.toLocaleLowerCase("en-IN").replace(/[^a-z0-9]+/g, " ").trim();
function clean(value?: string) {
  return value?.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim() || null;
}
function parseHtml(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i)?.[1];
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  return { pageTitle: clean(title), metaDescription: clean(description), h1: clean(h1) };
}
async function observe(url: string): Promise<Observation> {
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Unsupported URL scheme");
  } catch (error) {
    return { url, error: error instanceof Error ? error.message : String(error) };
  }
  try {
    const response = await fetch(url, {
      redirect: "follow", signal: AbortSignal.timeout(12000),
      headers: { "user-agent": "JobOye-OfficialSourceAudit/1.0 (read-only)" },
    });
    const contentType = response.headers.get("content-type");
    const base: Observation = {
      url, finalUrl: response.url, httpStatus: response.status, contentType,
      hostname: new URL(response.url).hostname,
    };
    if (!response.ok) return { ...base, error: "HTTP " + response.status };
    if (contentType?.includes("text/html")) return { ...base, ...parseHtml((await response.text()).slice(0, 1000000)) };
    if (contentType?.includes("pdf") || /\.pdf(?:$|[?#])/i.test(response.url)) {
      return { ...base, pageTitle: "PDF document; content requires PDF text/OCR review" };
    }
    return base;
  } catch (error) {
    return { url, hostname: parsed.hostname, error: error instanceof Error ? error.message : String(error) };
  }
}
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const outIndex = process.argv.indexOf("--out");
  const out = resolve(outIndex >= 0 ? process.argv[outIndex + 1] : "./unknown-organization-audit.json");
  const db = postgres(process.env.DATABASE_URL, { max: 3, connect_timeout: 10, idle_timeout: 5 });
  try {
    const targets = await db<Target[]>(
      "select p.id as post_id, p.slug, p.name as post_name, p.title as post_title, " +
      'p."organizationName" as organization_name, p."organizationId" as organization_id, ' +
      "p.employing_organization_id, p.recruitment_id, r.name as recruitment_name, " +
      "r.organization_id as recruitment_organization_id, r.official_notification_url as recruitment_official_url, " +
      'p."officialSourceUrl" as post_official_url, p."applyPortalUrl" as apply_portal_url ' +
      "from public.posts p left join public.recruitments r on r.id = p.recruitment_id " +
      "where p.\"organizationName\" is null or lower(btrim(p.\"organizationName\")) in ('unknown organization', '') order by p.id"
    );
    const aliases = await db<Alias[]>(
      "select a.organization_id, o.name as organization_name, o.slug as organization_slug, o.website_url, " +
      "a.alias_raw, a.alias_normalized from public.organization_aliases a join public.organizations o " +
      "on o.id = a.organization_id where lower(o.name) <> 'unknown organization' order by a.organization_id"
    );
    const orgs = await db<Array<{id:number;name:string;slug:string;website_url:string|null}>>(
      "select id, name, slug, website_url from public.organizations where lower(name) <> 'unknown organization' order by id"
    );
    const urls = [...new Set(targets.flatMap((t) => [t.post_official_url, t.recruitment_official_url, t.apply_portal_url])
      .filter((u): u is string => Boolean(u && /^https?:\/\//i.test(u))))];
    const observed = new Map<string, Observation>();
    for (let i = 0; i < urls.length; i += 4) {
      const results = await Promise.all(urls.slice(i, i + 4).map(observe));
      results.forEach((item) => observed.set(item.url, item));
    }
    const rows = targets.map((target) => {
      const sourceUrls = [...new Set([target.post_official_url, target.recruitment_official_url, target.apply_portal_url]
        .filter((u): u is string => Boolean(u)))];
      const sourceObservations = sourceUrls.map((u) => observed.get(u)).filter((x): x is Observation => Boolean(x));
      const searchText = normalize([
        target.post_name, target.post_title, target.recruitment_name,
        ...sourceObservations.flatMap((x) => [x.pageTitle, x.metaDescription, x.h1, x.hostname]),
      ].filter(Boolean).join(" "));
      const candidateMap = new Map<number, { organizationId:number; name:string; slug:string; matchedAliases:string[]; score:number }>();
      for (const alias of aliases) {
        const text = normalize(alias.alias_normalized || alias.alias_raw || alias.organization_name);
        if (text.length < 5 || !searchText.includes(text)) continue;
        const item = candidateMap.get(alias.organization_id) ?? {
          organizationId: alias.organization_id, name: alias.organization_name, slug: alias.organization_slug,
          matchedAliases: [], score: 0,
        };
        item.matchedAliases.push(alias.alias_raw);
        item.score = Math.max(item.score, Math.min(90, 45 + text.length));
        candidateMap.set(alias.organization_id, item);
      }
      for (const org of orgs) {
        const text = normalize(org.name);
        if (text.length < 8 || !searchText.includes(text)) continue;
        const item = candidateMap.get(org.id) ?? {
          organizationId: org.id, name: org.name, slug: org.slug, matchedAliases: [], score: 0,
        };
        item.score = Math.max(item.score, Math.min(95, 50 + text.length));
        candidateMap.set(org.id, item);
      }
      const ranked = [...candidateMap.values()].sort((a,b) => b.score - a.score);
      const top = ranked[0], second = ranked[1];
      const strong = Boolean(top && top.score >= 65 && (!second || top.score - second.score >= 12));
      return {
        ...target, source_observations: sourceObservations, organization_candidates: ranked.slice(0,5),
        suggested_organization_id: strong ? top.organizationId : null,
        suggested_organization_name: strong ? top.name : null,
        suggestion_status: strong ? "REVIEWABLE_STRONG_MATCH" : ranked.length ? "AMBIGUOUS_MATCH_REQUIRES_REVIEW" : "NO_MATCH_REQUIRES_RESEARCH",
        auto_update_eligible: false,
        note: "Read-only heuristic; official notice and employer identity require verification before canonical mutation.",
      };
    });
    const report = {
      generated_at: new Date().toISOString(), mode: "READ_ONLY_NO_CANONICAL_WRITES",
      target_count: rows.length, url_count: urls.length, source_observation_count: observed.size,
      summary: {
        reviewable_strong_match: rows.filter((x) => x.suggestion_status === "REVIEWABLE_STRONG_MATCH").length,
        ambiguous_match_requires_review: rows.filter((x) => x.suggestion_status === "AMBIGUOUS_MATCH_REQUIRES_REVIEW").length,
        no_match_requires_research: rows.filter((x) => x.suggestion_status === "NO_MATCH_REQUIRES_RESEARCH").length,
        source_fetch_errors: [...observed.values()].filter((x) => x.error).length,
      }, rows,
    };
    await writeFile(out, JSON.stringify(report, null, 2) + "\n", "utf8");
    console.log(JSON.stringify({ output: out, target_count: rows.length, ...report.summary }, null, 2));
  } finally {
    await db.end();
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.stack : error); process.exitCode = 1; });
