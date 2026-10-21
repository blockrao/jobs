import type { MetadataRoute } from "next";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { SITE_URL } from "@/lib/site";
import { deriveLifecycle } from "@/lib/lifecycle";
import { ORG_INDEX_MIN_RECRUITMENTS } from "@/lib/organizations/stats";
import { getAllHubs } from "@/data/hubs";

/**
 * Sitemap follows the URL contract (2026-10-20) exactly:
 *   /jobs, every recruitment hub /jobs/{recruitment-slug}, and every post leaf
 *   /jobs/{recruitment-slug}/{post-slug}. Nothing else is a canonical job URL.
 *   Entity pages: /organizations/{slug} for canonical (non-merged) organizations
 *   with at least ORG_INDEX_MIN_RECRUITMENTS recruitments on record — the same
 *   rule that sets their robots meta, so sitemap and indexability never disagree.
 *
 * Closed recruitments stay in the sitemap as historical pages (they carry no
 * open JobPosting markup — see lifecycle gating in the leaf renderer) but at a
 * lower priority and a slower change frequency, so crawl budget goes to live
 * recruitments first.
 */

export const revalidate = 3600;

type HubRow = { slug: string; status: string; application_end_date: Date | string | null; updated_at: Date | string | null };
type LeafRow = HubRow & { post_slug: string; post_updated_at: Date | string | null };

function toDate(v: Date | string | null | undefined): Date {
  if (!v) return new Date();
  const d = v instanceof Date ? v : new Date(v);
  return Number.isFinite(d.getTime()) ? d : new Date();
}

function rowsOf<T>(result: unknown): T[] {
  const r = result as { rows?: T[] };
  if (Array.isArray(result)) return result as T[];
  return Array.isArray(r?.rows) ? r.rows : [];
}

const STATIC: MetadataRoute.Sitemap = [
  { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
  { url: `${SITE_URL}/jobs`, lastModified: new Date(), changeFrequency: "daily", priority: 0.95 },
  { url: `${SITE_URL}/exams`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/organizations`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  // Hub pages
  ...getAllHubs().map((hub) => ({
    url: `${SITE_URL}/hubs/${hub.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  })),
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getDb();
    const [hubResult, leafResult, orgResult] = await Promise.all([
      db.execute(sql`
        SELECT r.slug, r.status::text AS status, r.application_end_date, r.updated_at
        FROM recruitments r
        WHERE r.verification_status IS DISTINCT FROM 'QUARANTINED'
        ORDER BY r.updated_at DESC NULLS LAST, r.id DESC
      `),
      db.execute(sql`
        SELECT r.slug, r.status::text AS status, r.application_end_date, r.updated_at,
               p.slug AS post_slug, p.updated_at AS post_updated_at
        FROM posts p
        INNER JOIN recruitments r ON r.id = p.recruitment_id
        WHERE r.verification_status IS DISTINCT FROM 'QUARANTINED'
        ORDER BY p.updated_at DESC NULLS LAST, p.id DESC
      `),
      db.execute(sql`
        SELECT o.slug, max(r.updated_at) AS updated_at, count(*)::int AS n
        FROM organizations o
        JOIN recruitments r ON r.organization_id = o.id
          AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
        GROUP BY o.id, o.slug
        HAVING count(*) >= ${ORG_INDEX_MIN_RECRUITMENTS}
        ORDER BY count(*) DESC
      `),
    ]);

    const hubs = rowsOf<HubRow>(hubResult).map((h) => {
      const live = deriveLifecycle(h.status, h.application_end_date).isLive;
      return {
        url: `${SITE_URL}/jobs/${h.slug}`,
        lastModified: toDate(h.updated_at),
        changeFrequency: (live ? "daily" : "monthly") as "daily" | "monthly",
        priority: live ? 0.9 : 0.5,
      };
    });

    const leaves = rowsOf<LeafRow>(leafResult).map((l) => {
      const live = deriveLifecycle(l.status, l.application_end_date).isLive;
      return {
        url: `${SITE_URL}/jobs/${l.slug}/${l.post_slug}`,
        lastModified: toDate(l.post_updated_at ?? l.updated_at),
        changeFrequency: (live ? "daily" : "monthly") as "daily" | "monthly",
        priority: live ? 0.8 : 0.4,
      };
    });

    type OrgRow = { slug: string; updated_at: Date | string | null; n: number };
    const orgs = rowsOf<OrgRow>(orgResult).map((o) => ({
      url: `${SITE_URL}/organizations/${o.slug}`,
      lastModified: toDate(o.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    console.log(`[sitemap] ${hubs.length} recruitment hubs, ${leaves.length} post leaves, ${orgs.length} organizations`);
    return [...STATIC, ...orgs, ...hubs, ...leaves];
  } catch (error) {
    // Never emit a near-empty sitemap: a 4-URL sitemap served with 200 tells
    // search engines thousands of pages are gone. A 500 is retried and the
    // last good sitemap stays in effect.
    console.error("[sitemap] database error; refusing to emit a partial sitemap:", error);
    throw error;
  }
}
