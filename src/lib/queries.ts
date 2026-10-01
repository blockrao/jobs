import { and, desc, eq, ilike, inArray, isNotNull, isNull, or } from "drizzle-orm";
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
  return posting ?? null;
}

export async function listPostings(opts?: {
  kind?: "GOVERNMENT" | "PRIVATE";
  categorySlug?: string;
  search?: string;
  limit?: number;
}) {
  if (!hasDb()) return [];
  const db = getDb();
  const limit = opts?.limit ?? 30;

  const conditions: any[] = [eq(postings.reviewStatus, "APPROVED")];
  if (opts?.kind) conditions.push(eq(postings.kind, opts.kind));
  if (opts?.search) {
    conditions.push(
      or(
        ilike(postings.title, `%${opts.search}%`),
        ilike(postings.description, `%${opts.search}%`),
      ),
    );
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
    orderBy: [desc(postings.datePosted)],
    limit,
  });
}

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
      eq(postings.reviewStatus, "APPROVED")
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
      .filter((p) => p.reviewStatus === "APPROVED"),
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
    .select({ slug: postings.slug, updatedAt: postings.updatedAt })
    .from(postings)
    .where(eq(postings.reviewStatus, "APPROVED"))
    .orderBy(postings.id)
    .offset(offset)
    .limit(limit);
}

export async function getAllArticleSlugsForSitemap() {
  if (!hasDb()) return [];
  const db = getDb();
  return db
    .select({ slug: articles.slug, updatedAt: articles.updatedAt })
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
  return db.select({ slug: organizations.slug }).from(organizations);
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
      eq(postings.reviewStatus, "APPROVED")
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
      eq(postings.reviewStatus, "APPROVED")
    ),
    with: { organization: true, exam: { with: { commission: true } } },
    orderBy: [desc(postings.datePosted)],
    limit: 200,
  });
}
