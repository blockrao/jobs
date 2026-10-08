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
import { posts, recruitments, positions, postAgeRules, selectionProcesses, recruitmentFees } from "@/db/schema";
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
    where: and(eq(postings.slug, slug), or(eq(postings.reviewStatus, "APPROVED"), eq(postings.reviewStatus, "PENDING"))),
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

  // Fallback: fetch recruitment directly when posting has inferred_recruitment_id
  // but no inferred_post_id (e.g. older postings linked before the posts table existed).
  if (!canonicalRecruitment && posting.inferredRecruitmentId) {
    try {
      canonicalRecruitment = await db.query.recruitments.findFirst({
        where: eq(recruitments.id, posting.inferredRecruitmentId),
      });
    } catch (e) {
      console.warn("Could not fetch fallback recruitment:", e);
    }
  }

  // Semantic gate (SEM-001): a value that does not mean what its field means is not displayed.
  const gated = applySemanticGate(posting);

  // Normalise postNames: the DB column is typed string[] but older ingest
  // records stored objects { name, count } instead of plain strings.
  // Every consumer (structured-data, page metadata, gate) expects strings.
  const rawPostNames: unknown = (gated as any).postNames;
  const normalizedPostNames: string[] = Array.isArray(rawPostNames)
    ? rawPostNames.map((entry: unknown) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof (entry as any).name === "string") return (entry as any).name;
        return String(entry ?? "");
      }).filter(Boolean)
    : [];

  return {
    ...gated,
    postNames: normalizedPostNames,
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
const notPastLastDate = sql`(${postings.validThrough} IS NULL OR ${postings.validThrough} >= now()::date)`;

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
    where: eq(recruitments.slug, recruitmentSlug),
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
    } as any,
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
    where: eq(posts.recruitmentId, recruitmentId),
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
      isLive: sql<boolean>`
        (${recruitments.status} IN ('ACTIVE', 'UPCOMING')
         AND (${recruitments.applicationEndDate} IS NULL
              OR ${recruitments.applicationEndDate} > NOW()))
      `,
    })
    .from(posts)
    .innerJoin(recruitments, eq(recruitments.id, posts.recruitmentId))
    .orderBy(posts.id);
  return rows;
}

export async function getRecruitmentSlugsForSitemap() {
  if (!hasDb()) return [];
  const db = getDb();
  // All recruitments with a slug are included in the sitemap.
  // is_live drives changeFrequency and priority.
  const rows = await db
    .select({
      slug: recruitments.slug,
      updatedAt: recruitments.updatedAt,
      isLive: sql<boolean>`
        (${recruitments.status} IN ('ACTIVE', 'UPCOMING')
         AND (${recruitments.applicationEndDate} IS NULL
              OR ${recruitments.applicationEndDate} > NOW()))
      `,
    })
    .from(recruitments)
    .where(sql`${recruitments.slug} IS NOT NULL`)
    .orderBy(recruitments.id);
  return rows;
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

  const roles: RoleRow[] = (roleRows as unknown as Record<string, unknown>[]).map((r) => ({
    name: String(r.name),
    occurrenceCount: Number(r.occurrence_count),
    totalVacancies: Number(r.total_vacancies),
    earliestDeadline: r.earliest_deadline ? new Date(String(r.earliest_deadline)) : null,
  }));

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

/**
 * Fetch all posts with enrichment data for comprehensive reporting
 * Returns paginated results with all enrichment details
 */
export async function getAllPostsWithEnrichment(limit: number = 100, offset: number = 0) {
  if (!hasDb()) return [];

  const db = getDb();

  const results = await db.execute<any>(sql`
    SELECT
      p.id,
      p.title,
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
      COALESCE(e."salaryMin", NULL) as "salaryMin",
      COALESCE(e."salaryMax", NULL) as "salaryMax",
      e."salaryNote",
      e."ageNote",
      e.education,
      e.experience,
      e."selectionProcess",
      e."vacanciesTotal",
      e."feeNote",
      e."applicationClosingDate",
      e."examDate"
    FROM public.posts p
    LEFT JOIN public.post_enrichments e ON p.id = e.post_id
    WHERE p."isLive" = true
    ORDER BY p."postedAt" DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  return (results || []).map((row: any) => ({
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
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    salaryNote: row.salaryNote,
    ageNote: row.ageNote,
    education: row.education,
    experience: row.experience,
    selectionProcess: row.selectionProcess,
    vacanciesTotal: row.vacanciesTotal,
    feeNote: row.feeNote,
    applicationClosingDate: row.applicationClosingDate ? new Date(row.applicationClosingDate) : null,
    examDate: row.examDate ? new Date(row.examDate) : null,
  }));
}

/**
 * Get total count of posts for pagination
 */
export async function getPostsCount() {
  if (!hasDb()) return 0;

  const db = getDb();
  const result = await db.execute<any>(sql`
    SELECT COUNT(*)::int as count FROM posts WHERE "isLive" = true
  `);

  return (result?.[0]?.count) || 0;
}

/**
 * Get enrichment statistics across all live posts
 */
export async function getEnrichmentStats() {
  if (!hasDb()) return { totalPosts: 0, withSalary: 0, withVacancies: 0, withExamDate: 0 };

  const db = getDb();
  const result = await db.execute<any>(sql`
    SELECT
      COUNT(*)::int as "totalPosts",
      COUNT(CASE WHEN "salaryMin" IS NOT NULL OR "salaryMax" IS NOT NULL THEN 1 END)::int as "withSalary",
      COUNT(CASE WHEN "vacanciesTotal" IS NOT NULL THEN 1 END)::int as "withVacancies",
      COUNT(CASE WHEN "examDate" IS NOT NULL THEN 1 END)::int as "withExamDate"
    FROM (
      SELECT
        e."salaryMin",
        e."salaryMax",
        e."vacanciesTotal",
        e."examDate"
      FROM public.posts p
      LEFT JOIN public.post_enrichments e ON p.id = e.post_id
      WHERE p."isLive" = true
    ) results
  `);

  const stats = result?.[0];
  return {
    totalPosts: stats?.totalPosts || stats?.[`"totalPosts"`] || 0,
    withSalary: stats?.withSalary || stats?.[`"withSalary"`] || 0,
    withVacancies: stats?.withVacancies || stats?.[`"withVacancies"`] || 0,
    withExamDate: stats?.withExamDate || stats?.[`"withExamDate"`] || 0,
  };
}

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

    const results = await db.execute<any>(sql`
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

    return (results || []).map((row: any) => ({
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
      education: row.education,
      experience: row.experience,
      selectionProcess: row.selectionProcess,
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
