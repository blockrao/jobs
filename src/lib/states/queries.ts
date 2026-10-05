import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { postings } from "@/db/schema";

/**
 * State hub queries. A posting belongs to a state hub only through postings.state_slug,
 * which is set from explicit evidence (see resolve-state.ts). Same "current" rule as the
 * other entity pages: approved, not expired, last date not passed, and never a Tier C
 * (non-job, duplicate or stale-open) posting.
 */
const current = [
  eq(postings.reviewStatus, "APPROVED"),
  sql`${postings.isExpired} IS NOT TRUE`,
  sql`(${postings.validThrough} IS NULL OR ${postings.validThrough} >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')`,
  sql`${postings.indexTier} IS DISTINCT FROM 'C'`,
];

export async function listStateJobs(slug: string, limit = 100) {
  const db = getDb();
  if (!db) return [];
  return db.query.postings.findMany({
    where: and(eq(postings.stateSlug, slug), ...current),
    with: { organization: true },
    orderBy: [desc(postings.datePosted), desc(postings.id)],
    limit,
  });
}

/** Current postings per state slug (slugs with none are absent). */
export async function countCurrentByState(): Promise<Record<string, number>> {
  const db = getDb();
  if (!db) return {};
  const rows = await db
    .select({ slug: postings.stateSlug, n: sql<number>`count(*)::int` })
    .from(postings)
    .where(and(sql`${postings.stateSlug} IS NOT NULL`, ...current))
    .groupBy(postings.stateSlug);
  return Object.fromEntries(rows.map((r) => [r.slug as string, r.n]));
}
