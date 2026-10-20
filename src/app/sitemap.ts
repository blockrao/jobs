import type { MetadataRoute } from "next";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { SITE_URL } from "@/lib/site";
import { deriveLifecycle } from "@/lib/lifecycle";

/**
 * Sitemap follows the URL contract (2026-10-20) exactly:
 *   /jobs, every recruitment hub /jobs/{recruitment-slug}, and every post leaf
 *   /jobs/{recruitment-slug}/{post-slug}. Nothing else is a canonical job URL.
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
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getDb();
    const [hubResult, leafResult] = await Promise.all([
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

    console.log(`[sitemap] ${hubs.length} recruitment hubs, ${leaves.length} post leaves`);
    return [...STATIC, ...hubs, ...leaves];
  } catch (error) {
    console.error("[sitemap] database error, emitting static entries only:", error);
    return STATIC;
  }
}
