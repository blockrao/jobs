import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  articleCategories,
  articles,
  categories,
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

// Exam type detection from title
export function detectExamType(title: string): string | null {
  const examPatterns: Record<string, RegExp> = {
    ssc: /(SSC|SSC-C|SSSC)/i,
    upsc: /(UPSC|IAS|IPS|IFS)/i,
    banking: /(IBPS|SBI|RBI|Banking)/i,
    railways: /(RRB|Railways|Railway)/i,
    state: /(TPSC|GPSC|MPSC|BPSC|OPSC|UKSSSC|PSSSB|CGL|SSC State)/i,
    teaching: /(CTET|STET|Teaching|Teacher|Anganwadi)/i,
    defence: /(NDA|CDS|Defence|Military|Army)/i,
  };

  for (const [type, pattern] of Object.entries(examPatterns)) {
    if (pattern.test(title)) return type;
  }
  return null;
}

export async function getPostingsByExamType(examType: string) {
  if (!hasDb()) return [];
  const db = getDb();

  // Get all approved postings and filter by exam type in-app
  const allPostings = await db.query.postings.findMany({
    where: eq(postings.reviewStatus, "APPROVED"),
    with: { organization: true },
    orderBy: [desc(postings.datePosted)],
    limit: 100,
  });

  return allPostings.filter(
    (p) => detectExamType(p.title)?.toLowerCase() === examType.toLowerCase()
  );
}

export const EXAM_TYPES = [
  { slug: "ssc", label: "SSC (Staff Selection Commission)", color: "#3b82f6" },
  { slug: "upsc", label: "UPSC (Civil Services)", color: "#8b5cf6" },
  { slug: "banking", label: "Banking & Finance", color: "#ec4899" },
  { slug: "railways", label: "Railways (RRB)", color: "#f59e0b" },
  { slug: "state", label: "State Exams", color: "#10b981" },
  { slug: "teaching", label: "Teaching & Education", color: "#06b6d4" },
  { slug: "defence", label: "Defence & Military", color: "#ef4444" },
];
