import { and, desc, eq, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
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
import { posts, recruitments, positions } from "@/db/schema";
import { applySemanticGate } from "@/lib/semantic-fields";

// Before DATABASE_URL is configured, every query degrades to an empty
// result instead of throwing. This lets the site build and deploy (with
// empty states) and light up automatically once the DB is connected.
export function hasDb() {
  return Boolean(process.env.DATABASE_URL);
}

export async function getPostingBySlug(slug: string) {
  if (!hasDb()) return null;
  const db = getDb();
  const posting = await db.query.postings.findFirst({
    where: and(eq(postings.slug, slug), eq(postings.reviewStatus, "APPROVED")),
    with: {
      organization: true,
      exam: true,
      updates: true,
      postingCategories: { with: { category: true } },
      postingArticles: { with: { article: true } },
    },
  });

  if (!posting) return null;

  // Fetch v2 Post and Recruitment for canonical links if available
  let canonicalPost: any = null;
  let canonicalRecruitment: any = null;
  let canonicalPosition: any = null;

  if (posting.inferredPostId) {
    try {
      canonicalPost = await db.query.posts.findFirst({
        where: eq(posts.id, posting.inferredPostId),
        with: {
          recruitment: true,
          position: true,
        },
      });
      if (canonicalPost) {
        canonicalRecruitment = canonicalPost.recruitment;
        canonicalPosition = canonicalPost.position;
      }
    } catch (e) {
      console.warn("Could not fetch canonical links:", e);
    }
  }

  // Semantic gate (SEM-001): a value that does not mean what its field means is not displayed.
  return {
    ...applySemanticGate(posting),
    canonicalPost,
    canonicalRecruitment,
    canonicalPosition,
  } as any;
}

/**
 * A posting whose last date has passed must not be offered, even if the lifecycle
 * job has not yet set `is_expired` (A-067). The last date itself still counts
 * (UTC day, the same rule promotion uses); an unknown last date is not excluded.
 * This guard is independent of the lifecycle cron and of the stored flag.
 */
const notPastLastDate = sql`(${postings.validThrough} IS NULL OR ${postings.validThrough} >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')`;

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
  const conditions: any[] = [eq(postings.reviewStatus, "APPROVED"), sql`${postings.isExpired} IS NOT TRUE`, notPastLastDate];
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
const currentOnly = [sql`${postings.isExpired} IS NOT TRUE`, notPastLastDate];

export async function getOrganizationBySlug(slug: string) {
  if (!hasDb()) return null;
  const db = getDb();
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
  });
  if (!org) return null;
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

  const postingLinks = await db.query.postingCategories.findMany({
    where: eq(postingCategories.categoryId, category.id),
    with: { posting: { with: { organization: true } } },
  });
  const articleLinks = await db.query.articleCategories.findMany({
    where: eq(articleCategories.categoryId, category.id),
    with: { article: true },
  });

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
      postingArticles: { with: { posting: true } },
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
  return db
    .select({
      slug: postings.slug,
      updatedAt: postings.updatedAt,
      contentChangedAt: postings.contentChangedAt,
      // Carried through so the sitemap can emit a hi alternate only for
      // postings that actually have translated content — see
      // src/app/[locale]/jobs/[slug]/page.tsx.
      titleHi: postings.titleHi,
    })
    .from(postings)
    // Sitemap = Tier A and B (all approved, non-expired postings with content).
    // Tier C (non-job, duplicate, expired) are excluded.
    // An expired posting leaves the sitemap even if its stored tier hasn't
    // been recomputed yet (the lifecycle job sets is_expired separately).
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
  return db.select({ slug: organizations.slug, nameHi: organizations.nameHi }).from(organizations);
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
    with: { organization: true, exam: { with: { commission: true } } },
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
