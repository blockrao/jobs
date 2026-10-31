import { cache } from "react";
import { and, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import {
  articleCategories,
  articles,
  categories,
  commissions,
  exams,
  locations,
  organizations,
  postingCategories,
  postings,
} from "@/db/schema";
import { posts, recruitments, positions, postAgeRules, selectionProcesses, recruitmentFees } from "@/db/schema";
import { applySemanticGate } from "@/lib/semantic-fields";
import { isPlausibleRecruitmentVacancyCount, MAX_TRUSTED_RECRUITMENT_VACANCIES } from "@/lib/vacancy-integrity";
import { toPlausibleRecruitmentDate } from "@/lib/recruitment-dates";
import { plausibleRecruitmentDeadlineSql, recruitmentIsLiveSql } from "@/db/operations/recruitment-lifecycle-sql";

import { normalizeEducation, normalizeExperience, normalizeSelectionProcess, auditEnrichmentShape } from "@/lib/enrichment-normalization";
// Before DATABASE_URL is configured, every query degrades to an empty
// result instead of throwing. This lets the site build and deploy (with
// empty states) and light up automatically once the DB is connected.
export function hasDb() {
  return Boolean(process.env.DATABASE_URL);
}

type CanonicalPostWithRelations = typeof posts.$inferSelect & {
  recruitment: typeof recruitments.$inferSelect | null;
  position: typeof positions.$inferSelect | null;
};

export async function getPostingBySlug(slug: string) {
  if (!hasDb()) return null;
  const db = getDb();
  const posting = await db.query.postings.findFirst({
    where: and(eq(postings.slug, slug), or(eq(postings.reviewStatus, "APPROVED"), eq(postings.reviewStatus, "PENDING")), sourceTrustedPosting),
    with: {
      organization: true,
      exam: true,
      updates: true,
      postingCategories: { with: { category: true } },
      postingArticles: { with: { article: true } },
    },
  });

  if (!posting) return null;

  // PERF-002: Fetch canonical relations in parallel, not sequentially
  let canonicalPost: CanonicalPostWithRelations | null = null;
  let canonicalRecruitment: typeof recruitments.$inferSelect | null = null;
  let canonicalPosition: typeof positions.$inferSelect | null = null;

  try {
    const canonicalPromises = [];

    // Fetch post if available
    if (posting.inferredPostId) {
      canonicalPromises.push(
        db.query.posts.findFirst({
          where: eq(posts.id, posting.inferredPostId),
          with: { recruitment: true, position: true },
        })
      );
    } else {
      canonicalPromises.push(Promise.resolve(null));
    }

    // Fetch recruitment as fallback if needed
    if (posting.inferredRecruitmentId) {
      canonicalPromises.push(
        db.query.recruitments.findFirst({
          where: eq(recruitments.id, posting.inferredRecruitmentId),
        })
      );
    } else {
      canonicalPromises.push(Promise.resolve(null));
    }

    const [fetchedPost, fetchedRecruitment] = await Promise.all(canonicalPromises);

    if (fetchedPost) {
      canonicalPost = fetchedPost as CanonicalPostWithRelations;
      canonicalRecruitment = (fetchedPost as CanonicalPostWithRelations).recruitment;
      canonicalPosition = (fetchedPost as CanonicalPostWithRelations).position;
    } else if (fetchedRecruitment) {
      canonicalRecruitment = fetchedRecruitment as typeof recruitments.$inferSelect;
    }
  } catch (e) {
    console.warn("Could not fetch canonical links:", e);
  }

  // Semantic gate (SEM-001): a value that does not mean what its field means is not displayed.
  const gated = applySemanticGate(posting);

  // Normalise postNames: the DB column is typed string[] but older ingest
  // records stored objects { name, count } instead of plain strings.
  // Every consumer (structured-data, page metadata, gate) expects strings.
  const rawPostNames: unknown = (gated as { postNames?: unknown }).postNames;
  const normalizedPostNames: string[] = Array.isArray(rawPostNames)
    ? rawPostNames.map((entry: unknown) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof (entry as { name?: unknown }).name === "string") return (entry as { name: string }).name;
        return String(entry ?? "");
      }).filter(Boolean)
    : [];

  return {
    ...gated,
    postNames: normalizedPostNames,
    canonicalPost,
    canonicalRecruitment,
    canonicalPosition,
  };
}

/**
 * A posting whose last date has passed must not be offered, even if the lifecycle
 * job has not yet set `is_expired` (A-067). The last date itself still counts
 * (UTC day, the same rule promotion uses); an unknown last date is not excluded.
 * This guard is independent of the lifecycle cron and of the stored flag.
 */
const notPastLastDate = sql`(${postings.validThrough} IS NULL OR ${postings.validThrough} >= now()::date)`;

// Legacy Posting rows are never independently canonical. They are visible only
// when both persisted Recruitment/Post relationships resolve to trusted entities.
const sourceTrustedPosting = sql`
  ${postings.inferredPostId} IS NOT NULL
  AND private.is_post_publicly_trusted(${postings.inferredPostId})
  AND (
    ${postings.inferredRecruitmentId} IS NULL
    OR ${postings.inferredRecruitmentId} = (
      SELECT p.recruitment_id FROM public.posts p WHERE p.id = ${postings.inferredPostId}
    )
  )
`;

const sourceTrustedPostingLink = sql`
  EXISTS (
    SELECT 1
    FROM public.postings sp
    JOIN public.posts linked_post ON linked_post.id = sp.inferred_post_id
    WHERE sp.id = ${postingCategories.postingId}
      AND private.is_post_publicly_trusted(sp.inferred_post_id)
      AND (
        sp.inferred_recruitment_id IS NULL
        OR sp.inferred_recruitment_id = linked_post.recruitment_id
      )
  )
`;

export async function listPostings(opts?: {
  kind?: "GOVERNMENT" | "PRIVATE";
  categorySlug?: string;
  search?: string;
  /** "newly-added": posted in last 7 days; "open": current_stage = APPLICATION_OPEN */
  filter?: "newly-added" | "open";
  limit?: number;
  offset?: number;
}) {
  if (!hasDb()) return [];
  const db = getDb();
  const limit = opts?.limit ?? 30;
  const offset = Math.max(0, opts?.offset ?? 0);

  // `is_expired` is maintained by refresh_recruitment_lifecycle(). Search already honours it; the
  // listing must too, or an expired opening stays on /jobs and the home page after its last date.
  const conditions: (SQL | undefined)[] = [inArray(postings.reviewStatus, ["APPROVED", "PENDING"]), sql`${postings.isExpired} IS NOT TRUE`, notPastLastDate, sourceTrustedPosting];
  if (opts?.kind) conditions.push(eq(postings.kind, opts.kind));
  if (opts?.search) {
    conditions.push(
      or(
        ilike(postings.title, `%${opts.search}%`),
        ilike(postings.description, `%${opts.search}%`),
      ),
    );
  }
  if (opts?.filter === "newly-added") {
    // Posted within the last 7 days (date_posted is reliable — set at ingest from source)
    conditions.push(sql`${postings.datePosted} >= now() - interval '7 days'`);
  } else if (opts?.filter === "open") {
    // Application window currently open (stage-based — more reliable than validThrough which may be stale)
    conditions.push(eq(postings.currentStage, "APPLICATION_OPEN"));
  }

  if (opts?.categorySlug) {
    const cat = await db.query.categories.findFirst({
      where: eq(categories.slug, opts.categorySlug),
    });
    if (!cat) return [];

    // PERF-002: Fetch postingCategories with category ID instead of sequential queries
    const links = await db.query.postingCategories.findMany({
      where: eq(postingCategories.categoryId, cat.id),
    });
    const ids = links.map((l) => l.postingId);
    if (ids.length === 0) return [];
    conditions.push(inArray(postings.id, ids));
  }

  return db.query.postings.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: { organization: true },
    orderBy: [desc(postings.datePosted), desc(postings.id)],
    limit,
    offset,
  });
}

/** True when a last date exists and its UTC day has passed (same rule as `notPastLastDate`). */
export function isPastLastDate(validThrough: Date | string | null | undefined, now: Date = new Date()): boolean {
  if (!validThrough) return false;
  const startOfTodayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(validThrough).getTime() < startOfTodayUtc;
}

/** Entity pages (organization, category, exam, commission) list current postings only (A-067 principle). */
const currentOnly = [sql`${postings.isExpired} IS NOT TRUE`, notPastLastDate, sourceTrustedPosting];

export async function getOrganizationBySlug(slug: string) {
  if (!hasDb()) return null;
  const db = getDb();

  // PERF-002: Fetch org and immediately query postings in parallel
  // instead of waiting for org lookup to complete first
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (!org) return null;

  // Fetch postings in parallel with org (would be better to combine,
  // but Drizzle doesn't support subqueries in from() yet)
  const orgPostings = await db.query.postings.findMany({
    where: and(
      eq(postings.organizationId, org.id),
      eq(postings.reviewStatus, "APPROVED"),
      ...currentOnly,
    ),
    orderBy: [desc(postings.datePosted)],
  });
  return { org, postings: orgPostings };
}

export async function getCategoryBySlug(slug: string) {
  if (!hasDb()) return null;
  const db = getDb();
  const category = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
  });
  if (!category) return null;

  // PERF-002: Fetch posting and article links in parallel instead of sequentially
  const [postingLinks, articleLinks] = await Promise.all([
    db.query.postingCategories.findMany({
      where: and(eq(postingCategories.categoryId, category.id), sourceTrustedPostingLink),
      with: { posting: { with: { organization: true } } },
    }),
    db.query.articleCategories.findMany({
      where: eq(articleCategories.categoryId, category.id),
      with: { article: true },
    }),
  ]);

  return {
    category,
    postings: postingLinks
      .map((l) => l.posting)
      .filter((p) => p.reviewStatus === "APPROVED" && p.isExpired !== true && !isPastLastDate(p.validThrough)),
    articles: articleLinks
      .map((l) => l.article)
      .filter((a) => a.status === "PUBLISHED"),
  };
}

export async function listCategories() {
  if (!hasDb()) return [];
  const db = getDb();
  return db.query.categories.findMany({ orderBy: [categories.name] });
}

// ---------- Homepage (deadline desk) ----------
//
// Design decision 2026-10-14 (HOMEPAGE_DESIGN_STRATEGY): the homepage ranks
// by vacancies × urgency, never by recency or pure date — bulk ingest makes
// "new" meaningless and date-sorted heads are dominated by 1-vacancy project
// posts. Government sectors only; "PRIVATE" is the write-path default bucket.

export interface HomeRecruitmentRow {
  slug: string;
  name: string;
  orgName: string;
  orgNameHi: string | null;
  orgSlug: string;
  sector: string;
  totalVacancies: number | null;
  applicationEndDate: Date | null;
  postCount: number;
  daysLeft: number | null;
  /** Set when the recruitment's canonical page is its single Post leaf. */
  singlePostSlug: string | null;
}

export interface HomeOrgRow {
  name: string;
  nameHi: string | null;
  slug: string;
  vacancies: number;
}

export interface HomeStats {
  closing7dPosts: number;
  totalVacancies: number;
  liveRecruitments: number;
}

const liveGovRecruitment = sql`
  ${recruitmentIsLiveSql(sql`r.status`, sql`r.application_end_date`)}
  AND r.slug IS NOT NULL
  AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
  AND private.is_recruitment_publicly_trusted(r.id)
  AND o.slug <> 'unclassified-government-jobs'
`;

// Homepage vacancy rankings are intentionally stricter than general page
// visibility: only officially verified recruitment totals in a conservative
// range are eligible. Extreme values remain available for review, not promotion.
const verifiedHomeVacancy = sql`
  r.verification_status IN ('VERIFIED', 'MANUALLY_VERIFIED')
  AND r.official_notification_url ~ '^https?://'
  AND r.total_vacancies BETWEEN 1 AND ${MAX_TRUSTED_RECRUITMENT_VACANCIES}
`;

/**
 * When a recruitment has exactly one Post whose leaf page is indexable
 * (title + official source URL — the leaf's own gate), that leaf is the
 * canonical URL for the whole recruitment (owner decision, Oct 2026: a
 * single-post recruitment canonicalises to its own Post page; the catch-all
 * "Other" role never counts as a role). Everything that links to a
 * recruitment uses this to link to the canonical page, not the noindex hub.
 */
const singlePostLeafSlug = sql`
  (SELECT p1.slug FROM public.posts p1
    WHERE p1.recruitment_id = r.id
      AND (SELECT COUNT(*) FROM public.posts p2 WHERE p2.recruitment_id = r.id) = 1
      AND p1.slug IS NOT NULL AND p1.title IS NOT NULL
      AND p1."officialSourceUrl" ~ '^https?://'
    LIMIT 1)
`;

const homeRecruitmentSelect = sql`
  SELECT
    r.slug,
    ${singlePostLeafSlug} AS single_post_slug,
    r.name,
    o.name AS org_name,
    o.name_hi AS org_name_hi,
    o.slug AS org_slug,
    o.sector,
    r.total_vacancies,
    r.application_end_date,
    (SELECT COUNT(*)::int FROM public.posts p WHERE p.recruitment_id = r.id) AS post_count
  FROM public.recruitments r
  JOIN public.organizations o ON o.id = r.organization_id
`;

function mapHomeRows(rows: unknown): HomeRecruitmentRow[] {
  return (rows as Record<string, unknown>[]).map((r) => {
    const deadline = toPlausibleRecruitmentDate(r.application_end_date);
    return {
      slug: String(r.slug),
      name: String(r.name),
      orgName: String(r.org_name),
      orgNameHi: r.org_name_hi ? String(r.org_name_hi) : null,
      orgSlug: String(r.org_slug),
      sector: String(r.sector),
      totalVacancies:
        r.total_vacancies != null && isPlausibleRecruitmentVacancyCount(Number(r.total_vacancies))
          ? Number(r.total_vacancies)
          : null,
      applicationEndDate: deadline,
      postCount: Number(r.post_count ?? 0),
      daysLeft: deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86_400_000) : null,
      singlePostSlug: r.single_post_slug ? String(r.single_post_slug) : null,
    };
  });
}

/** For the recruitment hub's canonical decision: the single indexable Post leaf slug, if any. */
export async function getSinglePostLeafSlug(recruitmentId: number): Promise<string | null> {
  if (!hasDb()) return null;
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT ${singlePostLeafSlug} AS single_post_slug
    FROM public.recruitments r WHERE r.id = ${recruitmentId}
  `);
  const v = (rows as unknown as Record<string, unknown>[])[0]?.single_post_slug;
  return v ? String(v) : null;
}

/** Recruitments closing within `days`, biggest first. Used by the homepage and /closing-soon. */
export async function listClosingSoon(opts: { days: number; limit: number; offset?: number }): Promise<HomeRecruitmentRow[]> {
  if (!hasDb()) return [];
  const db = getDb();
  const rows = await db.execute(sql`
    ${homeRecruitmentSelect}
    WHERE ${liveGovRecruitment}
      AND ${verifiedHomeVacancy}
      AND r.application_end_date BETWEEN NOW() AND NOW() + make_interval(days => ${opts.days}::int)
    ORDER BY r.total_vacancies DESC, r.application_end_date ASC, r.id
    LIMIT ${opts.limit} OFFSET ${opts.offset ?? 0}
  `);
  return mapHomeRows(rows);
}

export async function countClosingSoon(days: number): Promise<number> {
  if (!hasDb()) return 0;
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT COUNT(*)::int AS n FROM public.recruitments r
    JOIN public.organizations o ON o.id = r.organization_id
    WHERE ${liveGovRecruitment}
      AND ${verifiedHomeVacancy}
      AND r.application_end_date BETWEEN NOW() AND NOW() + make_interval(days => ${days}::int)
  `);
  return Number((rows as unknown as Record<string, unknown>[])[0]?.n ?? 0);
}

/** Live recruitments ranked by vacancies (the "biggest open now" rule). */
export async function listBiggestOpen(opts: { limit: number; offset?: number }): Promise<HomeRecruitmentRow[]> {
  if (!hasDb()) return [];
  const db = getDb();
  const rows = await db.execute(sql`
    ${homeRecruitmentSelect}
    WHERE ${liveGovRecruitment} AND ${verifiedHomeVacancy}
    ORDER BY r.total_vacancies DESC, r.application_end_date ASC NULLS LAST, r.id
    LIMIT ${opts.limit} OFFSET ${opts.offset ?? 0}
  `);
  return mapHomeRows(rows);
}

export async function listTopHiringOrgs(limit = 12): Promise<HomeOrgRow[]> {
  if (!hasDb()) return [];
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT o.name, o.name_hi, o.slug, COALESCE(SUM(r.total_vacancies), 0)::int AS vacancies
    FROM public.organizations o
    JOIN public.recruitments r ON r.organization_id = o.id
    WHERE ${liveGovRecruitment} AND ${verifiedHomeVacancy} AND o.merged_into_id IS NULL
    GROUP BY o.id
    HAVING COALESCE(SUM(r.total_vacancies), 0) > 0
    ORDER BY vacancies DESC, o.name
    LIMIT ${limit}
  `);
  return (rows as unknown as Record<string, unknown>[]).map((r) => ({
    name: String(r.name),
    nameHi: r.name_hi ? String(r.name_hi) : null,
    slug: String(r.slug),
    vacancies: Number(r.vacancies),
  }));
}

export async function getHomeStats(): Promise<HomeStats> {
  if (!hasDb()) return { closing7dPosts: 0, totalVacancies: 0, liveRecruitments: 0 };
  const db = getDb();
  const rows = await db.execute(sql`
    SELECT
      COUNT(p.id) FILTER (WHERE r.application_end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days')::int AS closing_7d_posts,
      (
        SELECT COALESCE(SUM(r2.total_vacancies), 0)::int
        FROM public.recruitments r2
        JOIN public.organizations o2 ON o2.id = r2.organization_id
        WHERE ${recruitmentIsLiveSql(sql`r2.status`, sql`r2.application_end_date`)}
          AND r2.slug IS NOT NULL
          AND r2.verification_status IN ('VERIFIED', 'MANUALLY_VERIFIED')
          AND r2.official_notification_url ~ '^https?://'
          AND r2.total_vacancies BETWEEN 1 AND ${MAX_TRUSTED_RECRUITMENT_VACANCIES}
          AND r2.verification_status IS DISTINCT FROM 'QUARANTINED'
          AND private.is_recruitment_publicly_trusted(r2.id)
          AND private.is_post_publicly_trusted(po.id)
          AND o2.slug <> 'unclassified-government-jobs'
      ) AS total_vacancies,
      COUNT(DISTINCT r.id)::int AS live_recruitments
    FROM public.posts p
    JOIN public.recruitments r ON r.id = p.recruitment_id
    JOIN public.organizations o ON o.id = r.organization_id
    WHERE ${liveGovRecruitment} AND p.slug IS NOT NULL
  `);
  const s = (rows as unknown as Record<string, unknown>[])[0] ?? {};
  return {
    closing7dPosts: Number(s.closing_7d_posts ?? 0),
    totalVacancies: Number(s.total_vacancies ?? 0),
    liveRecruitments: Number(s.live_recruitments ?? 0),
  };
}

// ---------- Sector hubs (/categories/[slug]) ----------
//
// The public category taxonomy lives in src/lib/sectors.ts and is backed by
// organizations.sector — the only sector dimension set at write time on every
// record. These hubs list canonical Posts (/jobs/{recruitment}/{post}), using
// the same "live" rule as the sitemap (getPostSlugsForSitemap): recruitment
// ACTIVE/UPCOMING and application window not yet closed.

const livePostCondition = sql`
  ${recruitmentIsLiveSql(recruitments.status, recruitments.applicationEndDate)}
  AND ${posts.slug} IS NOT NULL AND ${recruitments.slug} IS NOT NULL
  AND private.is_post_publicly_trusted(${posts.id})
`;

export interface SectorPostRow {
  postId: number;
  postName: string;
  postSlug: string;
  vacancyTotal: number | null;
  recruitmentName: string;
  recruitmentSlug: string;
  recruitmentStatus: "UPCOMING" | "ACTIVE" | "CLOSED" | "RESULTS" | "ARCHIVED";
  applicationEndDate: Date | null;
  locationStateCode: string | null;
  orgName: string;
  orgNameHi: string | null;
  orgSlug: string;
}

/** Live Posts for a set of org sectors, soonest-closing first (null end dates last). */
export async function listLivePostsBySector(
  sectors: readonly string[],
  opts?: { limit?: number; offset?: number },
): Promise<SectorPostRow[]> {
  if (!hasDb() || sectors.length === 0) return [];
  const db = getDb();
  const limit = Math.min(opts?.limit ?? 50, 200);
  const offset = Math.max(0, opts?.offset ?? 0);
  return db
    .select({
      postId: posts.id,
      postName: posts.name,
      postSlug: posts.slug,
      vacancyTotal: posts.vacancyTotal,
      recruitmentName: recruitments.name,
      recruitmentSlug: recruitments.slug,
      recruitmentStatus: recruitments.status,
      applicationEndDate: plausibleRecruitmentDeadlineSql(recruitments.applicationEndDate),
      locationStateCode: recruitments.locationStateCode,
      orgName: organizations.name,
      orgNameHi: organizations.nameHi,
      orgSlug: organizations.slug,
    })
    .from(posts)
    .innerJoin(recruitments, eq(recruitments.id, posts.recruitmentId))
    .innerJoin(organizations, eq(organizations.id, recruitments.organizationId))
    .where(and(inArray(organizations.sector, sectors as never), livePostCondition))
    .orderBy(
      plausibleRecruitmentDeadlineSql(recruitments.applicationEndDate),
      desc(recruitments.updatedAt),
      posts.id,
    )
    .limit(limit)
    .offset(offset);
}

/** Live Post count per org sector — drives tile/index counts in one query. */
export const countLivePostsBySector = cache(async (): Promise<Record<string, number>> => {
  if (!hasDb()) return {};
  const db = getDb();
  const rows = await db
    .select({
      sector: organizations.sector,
      count: sql<number>`count(*)::int`,
    })
    .from(posts)
    .innerJoin(recruitments, eq(recruitments.id, posts.recruitmentId))
    .innerJoin(organizations, eq(organizations.id, recruitments.organizationId))
    .where(livePostCondition)
    .groupBy(organizations.sector);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.sector] = r.count;
  return out;
});

export async function listArticles(opts?: { limit?: number }) {
  if (!hasDb()) return [];
  const db = getDb();
  return db.query.articles.findMany({
    where: eq(articles.status, "PUBLISHED"),
    orderBy: [desc(articles.publishedAt)],
    limit: opts?.limit ?? 30,
  });
}

export async function getArticleBySlug(slug: string) {
  if (!hasDb()) return null;
  const db = getDb();
  const article = await db.query.articles.findFirst({
    where: eq(articles.slug, slug),
    with: {
      postingArticles: { with: { posting: { with: { inferredRecruitment: { columns: { slug: true } } } } } },
      articleCategories: { with: { category: true } },
    },
  });
  return article ?? null;
}

export async function getPostingSlugsPageForSitemap(
  offset: number,
  limit: number,
) {
  if (!hasDb()) return [];
  const db = getDb();
  // Legacy posting URLs that resolve to a canonical Recruitment are not
  // sitemap candidates. Join both supported relationship paths so this
  // works whether ingestion populated inferred_recruitment_id or only
  // inferred_post_id.
  const inferredPostRecruitments = alias(recruitments, "inferred_post_recruitments");
  return db
    .select({
      slug: postings.slug,
      updatedAt: postings.updatedAt,
      contentChangedAt: postings.contentChangedAt,
      titleHi: postings.titleHi,
      canonicalRecruitmentSlug: sql<string | null>`COALESCE(${recruitments.slug}, ${inferredPostRecruitments.slug})`,
    })
    .from(postings)
    .leftJoin(recruitments, eq(postings.inferredRecruitmentId, recruitments.id))
    .leftJoin(posts, eq(postings.inferredPostId, posts.id))
    .leftJoin(inferredPostRecruitments, eq(posts.recruitmentId, inferredPostRecruitments.id))
    // Sitemap = Tier A and B (approved, non-expired postings with content).
    // Tier C (non-job, duplicate, expired) are excluded. Legacy aliases that
    // canonicalize to Recruitment URLs are excluded by sitemap.ts as well.
    .where(
      and(
        eq(postings.reviewStatus, "APPROVED"),
        sql`${postings.indexTier} IN ('A', 'B')`,
        sql`${postings.isExpired} IS NOT TRUE`,
        notPastLastDate,
      ),
    )
    .orderBy(postings.id)
    .offset(offset)
    .limit(limit);
}
export async function getAllArticleSlugsForSitemap() {
  if (!hasDb()) return [];
  const db = getDb();
  return db
    .select({ slug: articles.slug, updatedAt: articles.updatedAt, titleHi: articles.titleHi })
    .from(articles)
    .where(eq(articles.status, "PUBLISHED"));
}

export async function getAllCategorySlugsForSitemap() {
  if (!hasDb()) return [];
  const db = getDb();
  return db.select({ slug: categories.slug }).from(categories);
}

export async function getAllOrganizationSlugsForSitemap() {
  if (!hasDb()) return [];
  const db = getDb();
  // All organizations are included in sitemap; consumer protection via frontend labels.
  return db
    .select({ slug: organizations.slug, nameHi: organizations.nameHi })
    .from(organizations);
}

// All 68 exams have labelHi populated and /exams/[slug] + /hi/exams/[slug]
// both exist, but exams were never in the sitemap at all — added here
// alongside the hreflang work so Google can actually discover them.
export async function getAllExamSlugsForSitemap() {
  if (!hasDb()) return [];
  const db = getDb();
  return db.select({ slug: exams.slug, labelHi: exams.labelHi }).from(exams);
}

// Get all commissions with their exams
export async function listCommissionsWithExams() {
  if (!hasDb()) return [];
  const db = getDb();
  return db.query.commissions.findMany({
    with: { exams: true },
    orderBy: [commissions.name],
  });
}

// Get a single commission with all its exams
export async function getCommissionBySlug(slug: string) {
  if (!hasDb()) return null;
  const db = getDb();
  return db.query.commissions.findFirst({
    where: eq(commissions.slug, slug),
    with: { exams: true },
  });
}

// Get a single exam with just its commission (lightweight - for metadata)
export async function getExamBySlugLight(slug: string) {
  if (!hasDb()) return null;
  const db = getDb();
  return db.query.exams.findFirst({
    where: eq(exams.slug, slug),
    with: { commission: true },
  });
}

// Get a single exam with its commission and all related exams (heavy - for page render)
export async function getExamBySlug(slug: string) {
  if (!hasDb()) return null;
  const db = getDb();
  return db.query.exams.findFirst({
    where: eq(exams.slug, slug),
    with: {
      commission: {
        with: { exams: true }
      }
    },
  });
}

// Get postings for a specific exam
export async function getPostingsByExam(examSlug: string) {
  if (!hasDb()) return [];
  const db = getDb();

  const exam = await db.query.exams.findFirst({
    where: eq(exams.slug, examSlug),
  });

  if (!exam) return [];

  return db.query.postings.findMany({
    where: and(
      eq(postings.examId, exam.id),
      eq(postings.reviewStatus, "APPROVED"),
      ...currentOnly,
    ),
    with: { organization: true },
    orderBy: [desc(postings.datePosted)],
  });
}

// ── PQ-006: per-post leaf page queries ───────────────────────────────────────

/**
 * Get a single Post (the canonical entity) by recruitment slug + post slug,
 * loading everything the leaf page needs: position, recruitment, org, age rules,
 * eligibilities, vacancies. Returns null when not found.
 */
export async function getPostBySlug(recruitmentSlug: string, postSlug: string) {
  if (!hasDb()) {
    console.warn("[getPostBySlug] no DATABASE_URL — returning null");
    return null;
  }
  const db = getDb();

  // Resolve the recruitment first — inferred type includes { organization, exam, selectionProcesses, fees }
  // Note: feeNote, ageNote, selectionProcess are text fields on the recruitments table and are automatically selected
  const recruitmentData = await db.query.recruitments.findFirst({
    where: and(eq(recruitments.slug, recruitmentSlug), sql`private.is_recruitment_publicly_trusted(${recruitments.id})`),
    with: { organization: true, exam: true, selectionProcesses: true, fees: true },
  }).catch((err: unknown) => {
    console.error("[getPostBySlug] recruitments query threw", {
      recruitmentSlug,
      err: err instanceof Error ? err.message : String(err),
    });
    throw err;
  });
  if (!recruitmentData) {
    console.info("[getPostBySlug] recruitment not found", { recruitmentSlug });
    return null;
  }

  // Resolve the post — inferred type includes { position, eligibilities, vacancies, ageRules, employingOrganization }
  const post = await db.query.posts.findFirst({
    where: and(
      eq(posts.recruitmentId, recruitmentData.id),
      eq(posts.slug, postSlug),
      sql`private.is_post_publicly_trusted(${posts.id})`,
    ),
    with: {
      position: true,
      eligibilities: true,
      vacancies: true,
      ageRules: true,
      employingOrganization: true,
    },
  }).catch((err: unknown) => {
    console.error("[getPostBySlug] posts query threw", {
      recruitmentSlug,
      postSlug,
      recruitmentId: recruitmentData.id,
      err: err instanceof Error ? err.message : String(err),
    });
    throw err;
  });
  if (!post) {
    console.info("[getPostBySlug] post not found", { recruitmentSlug, postSlug, recruitmentId: recruitmentData.id });
    return null;
  }

  // Fetch apply_url and employment_type from the associated posting
  // (postings.inferred_recruitment_id → recruitment.id).
  // These live on postings not recruitments, and the leaf page needs both.
  const postingFields = await db
    .select({
      applyUrl: postings.applyUrl,
      employmentType: postings.employmentType,
      officialNotificationUrl: postings.officialNotificationUrl,
    })
    .from(postings)
    .where(eq(postings.inferredRecruitmentId, recruitmentData.id))
    .limit(1)
    .catch(() => [])
    .then((rows) => rows[0] ?? { applyUrl: null, employmentType: null, officialNotificationUrl: null });

  return {
    post,
    recruitment: {
      ...recruitmentData,
      // Map the raw field names to enrichment field names for backward compatibility
      enrichmentFeeNote: recruitmentData.feeNote,
      enrichmentAgeNote: recruitmentData.ageNote,
      enrichmentSelectionProcess: recruitmentData.selectionProcess,
    },
    applyUrl: postingFields.applyUrl,
    postingEmploymentType: postingFields.employmentType,
    // Official notification URL: prefer the verified column on the recruitment
    // (populated from the official source), fall back to postings discovery value.
    // Leaf page uses this for the "Official Notification" button.
    officialNotificationUrl:
      recruitmentData.officialNotificationUrl ??
      postingFields.officialNotificationUrl ??
      recruitmentData.notificationUrl ??
      null,
    // Convenience aliases surfaced explicitly so leaf-page code doesn't need
    // to dig into recruitment for these high-value fields.
    selectionProcesses: recruitmentData.selectionProcesses ?? [],
    fees: recruitmentData.fees ?? [],
    // ISO 3166-2:IN state code for JobPosting addressRegion (Step B / A-082).
    locationStateCode: recruitmentData.locationStateCode ?? null,
  };
}

/**
 * Get all posts for a recruitment, with minimal fields for the hub page nav strip.
 */
export async function getPostsForRecruitment(recruitmentId: number) {
  if (!hasDb()) return [];
  const db = getDb();
  return db.query.posts.findMany({
    where: and(eq(posts.recruitmentId, recruitmentId), sql`private.is_post_publicly_trusted(${posts.id})`),
    with: {
      position: true,
      ageRules: true,
      // Eligibility for each post — qualification text, age range, education category.
      // Used by the hub page to render the posts comparison table.
      eligibilities: {
        with: { qualification: true },
        limit: 1,
      },
    },
    orderBy: (p, { asc }) => [asc(p.name)],
  });
}

/**
 * Get all post slugs for a recruitment — used in generateStaticParams.
 */
export async function getPostSlugsForSitemap() {
  if (!hasDb()) return [];
  const db = getDb();
  // Phase 1B sitemap policy (PQ-007):
  //   Indexability  — all Post pages are indexable (HTTP 200, self-canonical), including expired.
  //   Sitemap       — all 1,368 Posts with valid slugs are submitted; no LIVE-only filter.
  //   JobPosting SD — suppressed at render time for expired/RESULTS/ARCHIVED (existing logic).
  //
  // is_live drives changeFrequency and priority in sitemap.ts:
  //   LIVE  (ACTIVE/UPCOMING, application window open) → "weekly" / 0.75
  //   historical (application window closed)           → "yearly"  / 0.5
  //
  // lastmod = GREATEST(posts.updatedAt, recruitments.updatedAt): captures Post-level edits
  // (vacancies, source_post_code) and Recruitment-level changes (status, date corrections).
  // contentChangedAt does not exist on posts or recruitments (only on the postings ingest table).
  const rows = await db
    .select({
      recruitmentSlug: recruitments.slug,
      postSlug: posts.slug,
      lastModified: sql<Date>`GREATEST(${posts.updatedAt}, ${recruitments.updatedAt})`,
      isLive: sql<boolean>`${recruitmentIsLiveSql(recruitments.status, recruitments.applicationEndDate)}`,
    })
    .from(posts)
    .innerJoin(recruitments, eq(recruitments.id, posts.recruitmentId))
    .innerJoin(organizations, eq(organizations.id, recruitments.organizationId))
    // All posts are included in sitemap; consumer protection via frontend labels.
    .where(sql`${posts.slug} IS NOT NULL AND ${recruitments.slug} IS NOT NULL AND private.is_post_publicly_trusted(${posts.id})`)
    .orderBy(posts.id);
  return rows;
}

export async function getRecruitmentSlugsForSitemap() {
  if (!hasDb()) return [];
  const db = getDb();
  // All recruitments with a slug are included in the sitemap.
  // is_live drives changeFrequency and priority.
  const rows = await db.execute(sql`
    SELECT r.slug, r.updated_at AS "updatedAt",
      ${recruitmentIsLiveSql(sql`r.status`, sql`r.application_end_date`)} AS "isLive",
      (${singlePostLeafSlug}) IS NOT NULL AS "canonicalIsLeaf"
    FROM public.recruitments r
    JOIN public.organizations o ON o.id = r.organization_id
    WHERE r.slug IS NOT NULL
      AND private.is_recruitment_publicly_trusted(r.id)
    ORDER BY r.id
  `);
  return (rows as unknown as Record<string, unknown>[]).map((r) => ({
    slug: String(r.slug),
    updatedAt: new Date(String(r.updatedAt)),
    isLive: Boolean(r.isLive),
    // A single-post hub canonicalises to its Post leaf (already in the sitemap as a leaf); listing the hub too would submit a noindex URL.
    canonicalIsLeaf: Boolean(r.canonicalIsLeaf),
  }));
}

// Get postings for a specific commission (all exams under it)
export async function getPostingsByCommission(commissionSlug: string) {
  if (!hasDb()) return [];
  const db = getDb();

  const comm = await db.query.commissions.findFirst({
    where: eq(commissions.slug, commissionSlug),
    with: { exams: true },
  });

  if (!comm) return [];

  const examIds = comm.exams.map((e) => e.id);
  if (examIds.length === 0) return [];

  return db.query.postings.findMany({
    where: and(
      inArray(postings.examId, examIds),
      eq(postings.reviewStatus, "APPROVED"),
      ...currentOnly,
    ),
    with: {
      organization: true,
      exam: { with: { commission: true } },
      inferredRecruitment: { columns: { slug: true } },
    },
    orderBy: [desc(postings.datePosted)],
    limit: 200,
  });
}

/** Current (approved, not expired, not past last date) postings per commission, in one query. Capped at 200 like getPostingsByCommission. */
export async function countCurrentPostingsByCommission(): Promise<Record<number, number>> {
  if (!hasDb()) return {};
  const db = getDb();
  const rows = await db
    .select({ commissionId: exams.commissionId, n: sql<number>`count(*)::int` })
    .from(postings)
    .innerJoin(exams, eq(exams.id, postings.examId))
    .where(and(eq(postings.reviewStatus, "APPROVED"), ...currentOnly))
    .groupBy(exams.commissionId);
  const out: Record<number, number> = {};
  for (const r of rows) if (r.commissionId != null) out[r.commissionId] = Math.min(r.n, 200);
  return out;
}

// ── Jobs Control Center data ──────────────────────────────────────────────────
// Powers the /posts page: headline stats, deadline heatmap, top-org table,
// and the full paginated job list. All queries hit recruitments + posts only.

export interface ControlCenterStats {
  activeRecruitments: number;
  totalPosts: number;
  totalVacancies: number;
  orgsHiring: number;
  closingThisWeek: number;   // within 7 days
  closingThisMonth: number;  // within 30 days
  upcomingCount: number;
}

export interface DeadlineBucket {
  label: string;
  recruitments: number;
  vacancies: number;
  urgency: "critical" | "high" | "medium" | "low" | "none";
}

export interface TopOrg {
  orgName: string;
  orgSlug: string;
  postCount: number;
  vacancies: number | null;
  earliestDeadline: Date | null;
}

export interface JobRow {
  recruitmentId: number;
  recruitmentSlug: string;
  recruitmentName: string;
  orgName: string;
  status: string;
  applicationEndDate: Date | null;
  applicationStartDate: Date | null;
  totalVacancies: number | null;
  postCount: number;
  postNames: string;
  daysRemaining: number | null;
  locationStateCode: string | null;
}

export interface RoleRow {
  name: string;
  occurrenceCount: number;
  totalVacancies: number;
  earliestDeadline: Date | null;
  closesWithinWeek: boolean;
}

export async function getJobsControlCenter(): Promise<{
  stats: ControlCenterStats;
  deadlineBuckets: DeadlineBucket[];
  topOrgs: TopOrg[];
  jobs: JobRow[];
  roles: RoleRow[];
}> {
  if (!hasDb()) {
    return {
      stats: { activeRecruitments: 0, totalPosts: 0, totalVacancies: 0, orgsHiring: 0, closingThisWeek: 0, closingThisMonth: 0, upcomingCount: 0 },
      deadlineBuckets: [],
      topOrgs: [],
      jobs: [],
      roles: [],
    };
  }
  const db = getDb();

  const [statsRows, bucketRows, orgRows, jobRows, roleRows] = await Promise.all([
    // Headline stats
    db.execute(sql`
      SELECT
        COUNT(DISTINCT r.id)::int AS active_recruitments,
        COUNT(po.id)::int AS total_posts,
        COALESCE(SUM(po.vacancy_total), 0)::int AS total_vacancies,
        COUNT(DISTINCT r.organization_id)::int AS orgs_hiring,
        COUNT(DISTINCT r.id) FILTER (WHERE r.application_end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days')::int AS closing_this_week,
        COUNT(DISTINCT r.id) FILTER (WHERE r.application_end_date BETWEEN NOW() AND NOW() + INTERVAL '30 days')::int AS closing_this_month,
        COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'UPCOMING')::int AS upcoming_count
      FROM public.recruitments r
      JOIN public.posts po ON po.recruitment_id = r.id
      WHERE r.status IN ('ACTIVE','UPCOMING')
        AND private.is_recruitment_publicly_trusted(r.id)
        AND private.is_post_publicly_trusted(po.id)
    `),

    // Deadline buckets (exclude expired)
    db.execute(sql`
      SELECT
        CASE
          WHEN r.application_end_date IS NULL THEN 'No Deadline'
          WHEN r.application_end_date <= NOW() + INTERVAL '3 days' THEN 'Closing in 3 Days'
          WHEN r.application_end_date <= NOW() + INTERVAL '7 days' THEN 'This Week'
          WHEN r.application_end_date <= NOW() + INTERVAL '15 days' THEN 'Next 2 Weeks'
          WHEN r.application_end_date <= NOW() + INTERVAL '30 days' THEN 'This Month'
          ELSE 'Later'
        END AS label,
        COUNT(DISTINCT r.id)::int AS recruitments,
        COALESCE(SUM(po.vacancy_total), 0)::int AS vacancies
      FROM public.recruitments r
      JOIN public.posts po ON po.recruitment_id = r.id
      WHERE r.status IN ('ACTIVE','UPCOMING')
        AND private.is_recruitment_publicly_trusted(r.id)
        AND private.is_post_publicly_trusted(po.id)
        AND (r.application_end_date IS NULL OR r.application_end_date >= NOW())
      GROUP BY 1
      ORDER BY MIN(r.application_end_date) NULLS LAST
    `),

    // Top orgs by vacancy count
    db.execute(sql`
      SELECT
        o.name AS org_name,
        o.slug AS org_slug,
        COUNT(po.id)::int AS post_count,
        COALESCE(SUM(po.vacancy_total), 0)::int AS vacancies,
        MIN(r.application_end_date) AS earliest_deadline
      FROM public.organizations o
      JOIN public.recruitments r ON r.organization_id = o.id
      JOIN public.posts po ON po.recruitment_id = r.id
      WHERE r.status IN ('ACTIVE','UPCOMING')
        AND private.is_recruitment_publicly_trusted(r.id)
        AND private.is_post_publicly_trusted(po.id)
      GROUP BY o.id, o.name, o.slug
      ORDER BY vacancies DESC NULLS LAST
      LIMIT 12
    `),

    // Job list — active + upcoming, non-expired, ordered by deadline
    db.execute(sql`
      SELECT
        r.id AS recruitment_id,
        r.slug AS recruitment_slug,
        r.name AS recruitment_name,
        o.name AS org_name,
        r.status,
        r.application_end_date,
        r.application_start_date,
        COALESCE(r.total_vacancies, SUM(po.vacancy_total)::int) AS total_vacancies,
        COUNT(po.id)::int AS post_count,
        STRING_AGG(po.name, ' · ' ORDER BY po.vacancy_total DESC NULLS LAST) AS post_names,
        EXTRACT(DAY FROM (r.application_end_date - NOW()))::int AS days_remaining,
        r.location_state_code
      FROM public.recruitments r
      JOIN public.organizations o ON o.id = r.organization_id
      JOIN public.posts po ON po.recruitment_id = r.id
      WHERE r.status IN ('ACTIVE','UPCOMING')
        AND private.is_recruitment_publicly_trusted(r.id)
        AND private.is_post_publicly_trusted(po.id)
        AND (r.application_end_date IS NULL OR r.application_end_date >= NOW())
      GROUP BY r.id, o.name
      ORDER BY r.application_end_date ASC NULLS LAST
      LIMIT 300
    `),

    // Role heatmap — top post names by total vacancies
    db.execute(sql`
      SELECT
        po.name,
        COUNT(po.id)::int AS occurrence_count,
        COALESCE(SUM(po.vacancy_total), 0)::int AS total_vacancies,
        MIN(r.application_end_date) AS earliest_deadline
      FROM public.posts po
      JOIN public.recruitments r ON r.id = po.recruitment_id
      WHERE r.status IN ('ACTIVE','UPCOMING')
        AND private.is_recruitment_publicly_trusted(r.id)
        AND private.is_post_publicly_trusted(po.id)
        AND (r.application_end_date IS NULL OR r.application_end_date >= NOW())
      GROUP BY po.name
      ORDER BY total_vacancies DESC NULLS LAST
      LIMIT 50
    `),
  ]);

  const s = ((statsRows as unknown as Record<string, unknown>[])[0] ?? {}) as Record<string, unknown>;
  const stats: ControlCenterStats = {
    activeRecruitments: Number(s.active_recruitments ?? 0),
    totalPosts: Number(s.total_posts ?? 0),
    totalVacancies: Number(s.total_vacancies ?? 0),
    orgsHiring: Number(s.orgs_hiring ?? 0),
    closingThisWeek: Number(s.closing_this_week ?? 0),
    closingThisMonth: Number(s.closing_this_month ?? 0),
    upcomingCount: Number(s.upcoming_count ?? 0),
  };

  const urgencyMap: Record<string, DeadlineBucket["urgency"]> = {
    "Closing in 3 Days": "critical",
    "This Week": "high",
    "Next 2 Weeks": "medium",
    "This Month": "low",
    "Later": "none",
    "No Deadline": "none",
  };
  const deadlineBuckets: DeadlineBucket[] = (bucketRows as unknown as Record<string, unknown>[]).map((r) => ({
    label: String(r.label),
    recruitments: Number(r.recruitments),
    vacancies: Number(r.vacancies),
    urgency: urgencyMap[String(r.label)] ?? "none",
  }));

  const topOrgs: TopOrg[] = (orgRows as unknown as Record<string, unknown>[]).map((r) => ({
    orgName: String(r.org_name),
    orgSlug: String(r.org_slug),
    postCount: Number(r.post_count),
    vacancies: r.vacancies != null ? Number(r.vacancies) : null,
    earliestDeadline: r.earliest_deadline ? new Date(String(r.earliest_deadline)) : null,
  }));

  const jobs: JobRow[] = (jobRows as unknown as Record<string, unknown>[]).map((r) => ({
    recruitmentId: Number(r.recruitment_id),
    recruitmentSlug: String(r.recruitment_slug),
    recruitmentName: String(r.recruitment_name),
    orgName: String(r.org_name),
    status: String(r.status),
    applicationEndDate: r.application_end_date ? new Date(String(r.application_end_date)) : null,
    applicationStartDate: r.application_start_date ? new Date(String(r.application_start_date)) : null,
    totalVacancies: r.total_vacancies != null ? Number(r.total_vacancies) : null,
    postCount: Number(r.post_count),
    postNames: String(r.post_names ?? ""),
    daysRemaining: r.days_remaining != null ? Number(r.days_remaining) : null,
    locationStateCode: r.location_state_code ? String(r.location_state_code) : null,
  }));

  const roles: RoleRow[] = (roleRows as unknown as Record<string, unknown>[]).map((r) => {
    const earliestDeadline = r.earliest_deadline ? new Date(String(r.earliest_deadline)) : null;
    return {
      name: String(r.name),
      occurrenceCount: Number(r.occurrence_count),
      totalVacancies: Number(r.total_vacancies),
      earliestDeadline,
      closesWithinWeek: earliestDeadline !== null && earliestDeadline.getTime() - Date.now() < 7 * 86_400_000,
    };
  });

  return { stats, deadlineBuckets, topOrgs, jobs, roles };
}

export interface ClosingSoonJob {
  slug: string;
  name: string;
  orgName: string;
  applicationEndDate: Date;
  totalVacancies: number | null;
}

export interface HomepageStats {
  totalVacancies: number;
  activeRecruitments: number;
  closingThisWeek: number;
  orgsHiring: number;
}

export async function getHomepageStats(): Promise<{
  stats: HomepageStats;
  closingSoon: ClosingSoonJob[];
}> {
  if (!hasDb()) {
    return {
      stats: { totalVacancies: 0, activeRecruitments: 0, closingThisWeek: 0, orgsHiring: 0 },
      closingSoon: [],
    };
  }
  const db = getDb();

  const [statsRows, closingRows] = await Promise.all([
    db.execute(sql`
      SELECT
        COALESCE(SUM(po.vacancy_total), 0)::int AS total_vacancies,
        COUNT(DISTINCT r.id)::int AS active_recruitments,
        COUNT(DISTINCT r.id) FILTER (WHERE r.application_end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days')::int AS closing_this_week,
        COUNT(DISTINCT r.organization_id)::int AS orgs_hiring
      FROM public.recruitments r
      JOIN public.posts po ON po.recruitment_id = r.id
      WHERE r.status IN ('ACTIVE','UPCOMING')
        AND private.is_recruitment_publicly_trusted(r.id)
        AND private.is_post_publicly_trusted(po.id)
    `),
    db.execute(sql`
      SELECT
        r.slug,
        r.name,
        o.name AS org_name,
        r.application_end_date,
        COALESCE(r.total_vacancies, SUM(po.vacancy_total)::int) AS total_vacancies
      FROM public.recruitments r
      JOIN public.organizations o ON o.id = r.organization_id
      JOIN public.posts po ON po.recruitment_id = r.id
      WHERE r.status IN ('ACTIVE','UPCOMING')
        AND private.is_recruitment_publicly_trusted(r.id)
        AND private.is_post_publicly_trusted(po.id)
        AND r.application_end_date BETWEEN NOW() AND NOW() + INTERVAL '10 days'
      GROUP BY r.id, r.slug, r.name, r.application_end_date, r.total_vacancies, o.name
      ORDER BY r.application_end_date ASC
      LIMIT 6
    `),
  ]);

  const s = (statsRows as unknown as Record<string, unknown>[])[0] ?? {};
  const stats: HomepageStats = {
    totalVacancies: Number(s.total_vacancies ?? 0),
    activeRecruitments: Number(s.active_recruitments ?? 0),
    closingThisWeek: Number(s.closing_this_week ?? 0),
    orgsHiring: Number(s.orgs_hiring ?? 0),
  };

  const closingSoon: ClosingSoonJob[] = (closingRows as unknown as Record<string, unknown>[]).map((r) => ({
    slug: String(r.slug),
    name: String(r.name),
    orgName: String(r.org_name),
    applicationEndDate: new Date(String(r.application_end_date)),
    totalVacancies: r.total_vacancies != null ? Number(r.total_vacancies) : null,
  }));

  return { stats, closingSoon };
}

// ---------------------------------------------------------------------------
// Daily digest dashboard stats (from raw_notifications staging table)
// ---------------------------------------------------------------------------

export interface DigestCategoryStat {
  category: string;
  count: number;
  vacancies: number;
  withPdf: number;
}

export interface DigestStats {
  digestDate: string;
  total: number;
  totalVacancies: number;
  withPdf: number;
  byCategory: DigestCategoryStat[];
  closingToday: number;
  closingThreeDays: number;
  closingThisWeek: number;
}

export async function getDailyDigestStats(digestDate?: string): Promise<DigestStats | null> {
  if (!hasDb()) return null;
  const db = getDb();

  const dateFilter = digestDate
    ? sql`AND digest_date = ${digestDate}::date`
    : sql`AND digest_date = (SELECT MAX(digest_date) FROM raw_notifications)`;

  const [summaryRows, categoryRows] = await Promise.all([
    db.execute(sql`
      SELECT
        digest_date::text AS digest_date,
        COUNT(*)::int AS total,
        COALESCE(SUM(vacancies), 0)::int AS total_vacancies,
        COUNT(official_pdf_url)::int AS with_pdf,
        COUNT(*) FILTER (WHERE last_date = CURRENT_DATE)::int AS closing_today,
        COUNT(*) FILTER (WHERE last_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 3)::int AS closing_three_days,
        COUNT(*) FILTER (WHERE last_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7)::int AS closing_this_week
      FROM raw_notifications
      WHERE TRUE ${dateFilter}
      GROUP BY digest_date
    `),
    db.execute(sql`
      SELECT
        COALESCE(category, 'Other') AS category,
        COUNT(*)::int AS count,
        COALESCE(SUM(vacancies), 0)::int AS vacancies,
        COUNT(official_pdf_url)::int AS with_pdf
      FROM raw_notifications
      WHERE TRUE ${dateFilter}
      GROUP BY category
      ORDER BY vacancies DESC NULLS LAST
    `),
  ]);

  const summary = (summaryRows as unknown as Record<string, unknown>[])[0];
  if (!summary) return null;

  const byCategory: DigestCategoryStat[] = (categoryRows as unknown as Record<string, unknown>[]).map((r) => ({
    category: String(r.category),
    count: Number(r.count),
    vacancies: Number(r.vacancies),
    withPdf: Number(r.with_pdf),
  }));

  return {
    digestDate: String(summary.digest_date),
    total: Number(summary.total),
    totalVacancies: Number(summary.total_vacancies),
    withPdf: Number(summary.with_pdf),
    byCategory,
    closingToday: Number(summary.closing_today),
    closingThreeDays: Number(summary.closing_three_days),
    closingThisWeek: Number(summary.closing_this_week),
  };
}

export async function getDailyDigestJobs(opts: {
  digestDate?: string;
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  id: number;
  orgShort: string | null;
  orgFull: string | null;
  postName: string | null;
  vacancies: number | null;
  salaryText: string | null;
  feeText: string | null;
  lastDate: string | null;
  officialPdfUrl: string | null;
  applyUrl: string | null;
  sourceUrl: string | null;
  category: string | null;
  states: string[] | null;
  qualificationText: string | null;
  promotedRecruitmentId: number | null;
  promotedPostId: number | null;
  promotedSlug: string | null;
}[]> {
  if (!hasDb()) return [];
  const db = getDb();

  const dateFilter = opts.digestDate
    ? sql`AND rn.digest_date = ${opts.digestDate}::date`
    : sql`AND rn.digest_date = (SELECT MAX(digest_date) FROM raw_notifications)`;

  const categoryFilter = opts.category ? sql`AND rn.category = ${opts.category}` : sql``;
  const lim = opts.limit ?? 2000;
  const off = opts.offset ?? 0;

  const rows = await db.execute(sql`
    SELECT
      rn.id,
      rn.org_short,
      rn.org_full,
      rn.post_name,
      rn.vacancies,
      rn.salary_text,
      rn.fee_text,
      rn.last_date::text AS last_date,
      rn.official_pdf_url,
      rn.apply_url,
      CASE
        WHEN private.is_aggregator_url(rn.source_url) THEN NULL
        ELSE rn.source_url
      END AS source_url,
      rn.category,
      rn.states,
      rn.qualification_text,
      rn.promoted_recruitment_id,
      rn.promoted_post_id,
      p.slug AS promoted_slug,
      r.slug AS recruitment_slug
    FROM raw_notifications rn
    LEFT JOIN posts p ON p.id = rn.promoted_post_id
    LEFT JOIN recruitments r ON r.id = rn.promoted_recruitment_id
    WHERE TRUE ${dateFilter} ${categoryFilter}
    ORDER BY rn.vacancies DESC NULLS LAST, rn.id
    LIMIT ${lim} OFFSET ${off}
  `);

  return (rows as unknown as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    orgShort: r.org_short != null ? String(r.org_short) : null,
    orgFull: r.org_full != null ? String(r.org_full) : null,
    postName: r.post_name != null ? String(r.post_name) : null,
    vacancies: r.vacancies != null ? Number(r.vacancies) : null,
    salaryText: r.salary_text != null ? String(r.salary_text) : null,
    feeText: r.fee_text != null ? String(r.fee_text) : null,
    lastDate: r.last_date != null ? String(r.last_date) : null,
    officialPdfUrl: r.official_pdf_url != null ? String(r.official_pdf_url) : null,
    applyUrl: r.apply_url != null ? String(r.apply_url) : null,
    sourceUrl: r.source_url != null ? String(r.source_url) : null,
    category: r.category != null ? String(r.category) : null,
    states: Array.isArray(r.states) ? (r.states as string[]) : null,
    qualificationText: r.qualification_text != null ? String(r.qualification_text) : null,
    promotedRecruitmentId: r.promoted_recruitment_id != null ? Number(r.promoted_recruitment_id) : null,
    promotedPostId: r.promoted_post_id != null ? Number(r.promoted_post_id) : null,
    promotedSlug: (r.recruitment_slug && r.promoted_slug)
      ? `/jobs/${r.recruitment_slug}/${r.promoted_slug}`
      : null,
  }));
}

type RawSqlDate = string | Date | null;

/** Row shape of the posts + post_enrichments SELECT in getAllPostsWithEnrichment. */
type PostWithEnrichmentRow = {
  id: number;
  title: string | null;
  name: string | null;
  slug: string;
  organizationName: string | null;
  recruitmentName: string | null;
  recruitmentSlug: string | null;
  description: string | null;
  isLive: boolean;
  postedAt: RawSqlDate;
  updatedAt: RawSqlDate;
  officialSourceUrl: string | null;
  applyPortalUrl: string | null;
  locationCity: string | null;
  locationState: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNote: string | null;
  payScale: string | null;
  payLevel: string | null;
  ageNote: string | null;
  ageRulesByCategory: unknown;
  education: unknown;
  experience: unknown;
  selectionProcess: unknown;
  vacanciesTotal: number | null;
  vacanciesByCategory: unknown;
  feeNote: string | null;
  applicationClosingDate: RawSqlDate;
  examDate: RawSqlDate;
  resultDate: RawSqlDate;
  appointmentDate: RawSqlDate;
  sourceVerificationStatus: string | null;
  extractionConfidence: number | null;
  dataGaps: unknown;
  documentsRequired: unknown;
  benefits: unknown;
  duties: unknown;
  responsibilities: unknown;
  eligibilityPathways: unknown;
  notificationDate: RawSqlDate;
  applicationOpenDate: RawSqlDate;
  admitCardDate: RawSqlDate;
  interviewScheduleDate: RawSqlDate;
  parsedSkills: unknown;
};

/**
 * Fetch all posts with enrichment data for comprehensive reporting
 * Returns paginated results with all enrichment details
 */
export async function getAllPostsWithEnrichment(limit: number = 100, offset: number = 0) {
  if (!hasDb()) return [];

  const db = getDb();

  const results = await db.execute<PostWithEnrichmentRow>(sql`
    SELECT
      p.id,
      COALESCE(p.title, p.name) as title,
      p.name,
      p.slug,
      p."organizationName",
      p."recruitmentName",
      p."recruitmentSlug",
      p.description,
      p."isLive",
      p."postedAt",
      p."updatedAt",
      p."officialSourceUrl",
      p."applyPortalUrl",
      p.location_city as "locationCity",
      p.location_state as "locationState",
      e."salaryMin",
      e."salaryMax",
      e."salaryNote",
      e."payScale",
      e."payLevel",
      e."ageNote",
      e."ageRulesByCategory",
      e.education,
      e.experience,
      e."selectionProcess",
      e."vacanciesTotal",
      e."vacanciesByCategory",
      e."feeNote",
      e."applicationClosingDate",
      e."examDate",
      e."resultDate",
      e."appointmentDate",
      e."sourceVerificationStatus",
      e."extractionConfidence",
      e."dataGaps",
      e."documentsRequired",
      e.benefits,
      e.duties,
      e.responsibilities,
      e."eligibilityPathways",
      e."notificationDate",
      e."applicationOpenDate",
      e."admitCardDate",
      e."interviewScheduleDate",
      e."parsed_skills" as "parsedSkills"
    FROM public.posts p
    JOIN public.recruitments r ON r.id = p.recruitment_id
    LEFT JOIN public.post_enrichments e ON p.id = e.post_id
    WHERE p."isLive" = true
      AND private.is_post_publicly_trusted(p.id)
    ORDER BY
      CASE WHEN e.post_id IS NOT NULL THEN 0 ELSE 1 END ASC,
      e."extractionConfidence" DESC NULLS LAST,
      p."postedAt" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  // Audit: log any non-string enrichment shapes for database profiling
  const malformedRows: Array<{ postId: number; postSlug: string; shape: Record<string, string> }> = [];
  for (const row of results || []) {
    if (row.education && typeof row.education !== 'string') {
      malformedRows.push({
        postId: row.id,
        postSlug: row.slug,
        shape: auditEnrichmentShape({ education: row.education }),
      });
    }
  }
  if (malformedRows.length > 0) {
    console.warn(
      `[getAllPostsWithEnrichment] Malformed enrichment on ${malformedRows.length} rows:`,
      malformedRows.slice(0, 3).map(r => `${r.postSlug} → education:${r.shape['education']}`)
    );
  }

  return (results || []).map((row) => ({
    id: row.id,
    title: row.title, // already COALESCE(title, name) from SQL
    name: row.name,
    slug: row.slug,
    organizationName: row.organizationName,
    recruitmentName: row.recruitmentName,
    recruitmentSlug: row.recruitmentSlug,
    description: row.description,
    isLive: row.isLive,
    postedAt: row.postedAt,
    updatedAt: row.updatedAt,
    officialSourceUrl: row.officialSourceUrl,
    applyPortalUrl: row.applyPortalUrl,
    locationCity: row.locationCity,
    locationState: row.locationState,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    salaryNote: row.salaryNote,
    payScale: row.payScale,
    payLevel: row.payLevel,
    ageNote: row.ageNote,
    ageRulesByCategory: row.ageRulesByCategory,
    education: normalizeEducation(row.education),
    experience: normalizeExperience(row.experience),
    selectionProcess: normalizeSelectionProcess(row.selectionProcess),
    vacanciesTotal: row.vacanciesTotal,
    vacanciesByCategory: row.vacanciesByCategory,
    feeNote: row.feeNote,
    applicationClosingDate: row.applicationClosingDate ? new Date(row.applicationClosingDate) : null,
    examDate: row.examDate ? new Date(row.examDate) : null,
    resultDate: row.resultDate ? new Date(row.resultDate) : null,
    appointmentDate: row.appointmentDate ? new Date(row.appointmentDate) : null,
    sourceVerificationStatus: row.sourceVerificationStatus,
    extractionConfidence: row.extractionConfidence,
    dataGaps: row.dataGaps,
    documentsRequired: row.documentsRequired,
    benefits: row.benefits,
    duties: row.duties,
    responsibilities: row.responsibilities,
    eligibilityPathways: row.eligibilityPathways,
    notificationDate: row.notificationDate ? new Date(row.notificationDate) : null,
    applicationOpenDate: row.applicationOpenDate ? new Date(row.applicationOpenDate) : null,
    admitCardDate: row.admitCardDate ? new Date(row.admitCardDate) : null,
    interviewScheduleDate: row.interviewScheduleDate ? new Date(row.interviewScheduleDate) : null,
    parsedSkills: row.parsedSkills,
  }));
}

/**
 * Get total count of posts for pagination
 */
export async function getPostsCount() {
  if (!hasDb()) return 0;

  const db = getDb();
  const result = await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int as count
    FROM public.posts p
    JOIN public.recruitments r ON r.id = p.recruitment_id
    WHERE p."isLive" = true
      AND private.is_post_publicly_trusted(p.id)
  `);

  return (result?.[0]?.count) || 0;
}

/**
 * Get enrichment statistics across all live posts
 */
export async function getEnrichmentStats() {
  if (!hasDb()) return {
    totalPosts: 0,
    withSalary: 0,
    withVacancies: 0,
    withExamDate: 0,
    enrichedVerified: 0,
    enrichedPending: 0,
    notEnriched: 0,
    avgConfidence: 0,
  };

  const db = getDb();
  const result = await db.execute<Record<string, number | undefined>>(sql`
    SELECT
      COUNT(*)::int as "totalPosts",
      COUNT(CASE WHEN "salaryMin" IS NOT NULL OR "salaryMax" IS NOT NULL THEN 1 END)::int as "withSalary",
      COUNT(CASE WHEN "vacanciesTotal" IS NOT NULL THEN 1 END)::int as "withVacancies",
      COUNT(CASE WHEN "examDate" IS NOT NULL THEN 1 END)::int as "withExamDate",
      COUNT(CASE WHEN e."sourceVerificationStatus" = 'VERIFIED' THEN 1 END)::int as "enrichedVerified",
      COUNT(CASE WHEN e."sourceVerificationStatus" = 'PENDING' THEN 1 END)::int as "enrichedPending",
      COUNT(CASE WHEN e.post_id IS NULL THEN 1 END)::int as "notEnriched",
      COALESCE(ROUND(AVG(CASE WHEN e."extractionConfidence" IS NOT NULL THEN e."extractionConfidence" ELSE 0 END))::int, 0) as "avgConfidence"
    FROM public.posts p
    JOIN public.recruitments r ON r.id = p.recruitment_id
    LEFT JOIN public.post_enrichments e ON p.id = e.post_id
    WHERE p."isLive" = true
      AND private.is_post_publicly_trusted(p.id)
  `);

  const stats = result?.[0];
  return {
    totalPosts: stats?.totalPosts || stats?.[`"totalPosts"`] || 0,
    withSalary: stats?.withSalary || stats?.[`"withSalary"`] || 0,
    withVacancies: stats?.withVacancies || stats?.[`"withVacancies"`] || 0,
    withExamDate: stats?.withExamDate || stats?.[`"withExamDate"`] || 0,
    enrichedVerified: stats?.enrichedVerified || stats?.[`"enrichedVerified"`] || 0,
    enrichedPending: stats?.enrichedPending || stats?.[`"enrichedPending"`] || 0,
    notEnriched: stats?.notEnriched || stats?.[`"notEnriched"`] || 0,
    avgConfidence: stats?.avgConfidence || stats?.[`"avgConfidence"`] || 0,
  };
}

/** Row shape of the filtered posts SELECT in listPostsEnhanced. */
type EnhancedPostRow = {
  id: number;
  title: string | null;
  slug: string;
  description: string | null;
  isLive: boolean;
  postedAt: RawSqlDate;
  updatedAt: RawSqlDate;
  organizationName: string | null;
  recruitmentName: string | null;
  recruitmentSlug: string | null;
  officialSourceUrl: string | null;
  applyPortalUrl: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryNote: string | null;
  ageNote: string | null;
  education: unknown;
  experience: unknown;
  selectionProcess: unknown;
  vacanciesTotal: number | null;
  feeNote: string | null;
  applicationClosingDate: RawSqlDate;
  examDate: RawSqlDate;
  locationStateCode: string | null;
  employmentType: string | null;
  recruitment_status: string | null;
};

/**
 * Get filtered posts with dynamic filtering support
 * Used by /jobs page with sidebar filters
 */
export async function listPostsEnhanced(opts?: {
  limit?: number;
  offset?: number;
  location?: string;
  employment?: string;
  experience?: string;
  salary?: string;
  deadline?: string;
  stage?: string;
  search?: string;
}) {
  if (!hasDb()) return [];
  const db = getDb();
  const limit = Math.min(opts?.limit ?? 30, 100);
  const offset = Math.max(0, opts?.offset ?? 0);

  try {
    // Map city names to state codes
    const locationMap: Record<string, string> = {
      bangalore: "IN-KA",
      delhi: "IN-DL",
      hyderabad: "IN-TG",
      mumbai: "IN-MH",
      pune: "IN-MH",
    };

    const stateCode = opts?.location
      ? locationMap[opts.location.toLowerCase()]
      : null;

    // Parse salary range from format like "25-50" (meaning 25K-50K)
    let salaryMinPaise: number | null = null;
    let salaryMaxPaise: number | null = null;
    if (opts?.salary) {
      const [minStr, maxStr] = opts.salary.split("-");
      if (minStr && maxStr) {
        salaryMinPaise = parseInt(minStr) * 100 * 1000; // Convert K to paise
        salaryMaxPaise = parseInt(maxStr) * 100 * 1000;
      }
    }

    const results = await db.execute<EnhancedPostRow>(sql`
      SELECT
        p.id,
        p.title,
        p.slug,
        p.description,
        p."isLive",
        p."postedAt",
        p."updatedAt",
        p."organizationName",
        p."recruitmentName",
        p."recruitmentSlug",
        p."officialSourceUrl",
        p."applyPortalUrl",
        e."salaryMin",
        e."salaryMax",
        e."salaryNote",
        e."ageNote",
        e.education,
        e.experience,
        e."selectionProcess",
        e."vacanciesTotal",
        e."feeNote",
        e."applicationClosingDate",
        e."examDate",
        r."locationStateCode",
        r."employmentType",
        r.status as recruitment_status
      FROM public.posts p
      LEFT JOIN public.post_enrichments e ON p.id = e.post_id
      LEFT JOIN public.recruitments r ON p."recruitmentId" = r.id
      WHERE p."isLive" = true
        AND private.is_post_publicly_trusted(p.id)
        ${stateCode ? sql`AND r."locationStateCode" = ${stateCode}` : sql``}
        ${opts?.employment ? sql`AND LOWER(r."employmentType") = LOWER(${opts.employment})` : sql``}
        ${salaryMinPaise !== null ? sql`AND e."salaryMax" >= ${salaryMinPaise}` : sql``}
        ${salaryMaxPaise !== null ? sql`AND e."salaryMin" <= ${salaryMaxPaise}` : sql``}
        ${opts?.stage ? sql`AND r.status = ${opts.stage}` : sql``}
        ${opts?.search ? sql`AND (LOWER(p.title) LIKE LOWER(${`%${opts.search}%`}) OR LOWER(p.description) LIKE LOWER(${`%${opts.search}%`}))` : sql``}
      ORDER BY p."postedAt" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    return (results || []).map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      organizationName: row.organizationName,
      recruitmentName: row.recruitmentName,
      recruitmentSlug: row.recruitmentSlug,
      description: row.description,
      isLive: row.isLive,
      postedAt: row.postedAt,
      updatedAt: row.updatedAt,
      officialSourceUrl: row.officialSourceUrl,
      applyPortalUrl: row.applyPortalUrl,
      salaryMin: row.salaryMin ? Math.round(row.salaryMin / 100000) : null, // Convert paise to rupees
      salaryMax: row.salaryMax ? Math.round(row.salaryMax / 100000) : null,
      salaryNote: row.salaryNote,
      ageNote: row.ageNote,
      education: normalizeEducation(row.education),
      experience: normalizeExperience(row.experience),
      selectionProcess: normalizeSelectionProcess(row.selectionProcess),
      vacanciesTotal: row.vacanciesTotal,
      feeNote: row.feeNote,
      applicationClosingDate: row.applicationClosingDate ? new Date(row.applicationClosingDate) : null,
      examDate: row.examDate ? new Date(row.examDate) : null,
    }));
  } catch (error) {
    console.error("Error fetching enhanced posts:", error);
    return [];
  }
}


/** Request-scoped memoization for metadata/page lookups of the same posting. */
export const getPostingBySlugCached = cache(getPostingBySlug);

// ---------------------------------------------------------------------------
// Qualification hub queries
// ---------------------------------------------------------------------------

export interface QualificationPostRow {
  postId: number;
  postName: string | null;
  postSlug: string | null;
  vacancyTotal: number | null;
  recruitmentSlug: string | null;
  applicationEndDate: Date | null;
  orgName: string | null;
}

/**
 * List live government posts whose name matches a POSIX ERE pattern.
 * Used by /qualifications/[slug] hub pages.
 */
export async function listLivePostsByQualification(
  pattern: string,
  opts?: { limit?: number; offset?: number },
): Promise<QualificationPostRow[]> {
  if (!hasDb()) return [];
  const db = getDb();
  const limit = Math.min(opts?.limit ?? 50, 200);
  const offset = Math.max(0, opts?.offset ?? 0);

  return db
    .select({
      postId: posts.id,
      postName: posts.name,
      postSlug: posts.slug,
      vacancyTotal: posts.vacancyTotal,
      recruitmentSlug: recruitments.slug,
      applicationEndDate: plausibleRecruitmentDeadlineSql(recruitments.applicationEndDate),
      orgName: organizations.name,
    })
    .from(posts)
    .innerJoin(recruitments, eq(recruitments.id, posts.recruitmentId))
    .innerJoin(organizations, eq(organizations.id, recruitments.organizationId))
    .where(
      and(
        livePostCondition,
        sql`${posts.name} ~* ${pattern}`,
      ),
    )
    .orderBy(
      sql`COALESCE(${posts.vacancyTotal}, 0) DESC`,
      plausibleRecruitmentDeadlineSql(recruitments.applicationEndDate),
    )
    .limit(limit)
    .offset(offset);
}

/** Count of live posts matching a qualification pattern. */
export async function countLivePostsByQualification(
  pattern: string,
): Promise<number> {
  if (!hasDb()) return 0;
  const db = getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(posts)
    .innerJoin(recruitments, eq(recruitments.id, posts.recruitmentId))
    .innerJoin(organizations, eq(organizations.id, recruitments.organizationId))
    .where(
      and(
        livePostCondition,
        sql`${posts.name} ~* ${pattern}`,
      ),
    );
  return rows[0]?.count ?? 0;
}

/**
 * Counts for multiple qualification hubs in parallel — used for homepage tiles.
 * Not cached at module level since patterns change; caller may cache.
 */
export async function countLivePostsByAllQualifications(
  qualifications: Array<{ slug: string; namePattern: string }>,
): Promise<Record<string, number>> {
  if (!hasDb()) return {};
  const db = getDb();
  const out: Record<string, number> = {};
  await Promise.all(
    qualifications.map(async (q) => {
      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(posts)
        .innerJoin(recruitments, eq(recruitments.id, posts.recruitmentId))
        .innerJoin(organizations, eq(organizations.id, recruitments.organizationId))
        .where(
          and(
            livePostCondition,
            sql`${posts.name} ~* ${q.namePattern}`,
          ),
        );
      out[q.slug] = rows[0]?.count ?? 0;
    }),
  );
  return out;
}
