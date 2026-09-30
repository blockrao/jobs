"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  articles,
  categories,
  organizations,
  postingArticles,
  postingUpdates,
  postings,
} from "@/db/schema";
import { adminSessionToken, checkAdminPassword } from "@/lib/admin-token";
import { detectExamType } from "@/lib/queries";

const COOKIE_NAME = "admin_session";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function num(formData: FormData, key: string) {
  const v = str(formData, key);
  return v ? Number(v) : null;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!(await checkAdminPassword(password))) {
    redirect("/admin/login?error=1");
  }
  const token = (await adminSessionToken())!;
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/admin");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  redirect("/admin/login");
}

export async function createOrganization(formData: FormData) {
  const db = getDb();
  const name = str(formData, "name");
  if (!name) return;
  const slug = str(formData, "slug") ?? slugify(name);
  await db.insert(organizations).values({
    name,
    slug,
    sector: (str(formData, "sector") as never) ?? "PRIVATE",
    state: str(formData, "state") ?? undefined,
    websiteUrl: str(formData, "websiteUrl") ?? undefined,
    description: str(formData, "description") ?? undefined,
  });
  revalidatePath("/admin");
}

export async function createCategory(formData: FormData) {
  const db = getDb();
  const name = str(formData, "name");
  if (!name) return;
  const slug = str(formData, "slug") ?? slugify(name);
  await db.insert(categories).values({
    name,
    slug,
    description: str(formData, "description") ?? undefined,
  });
  revalidatePath("/admin");
  revalidatePath("/categories");
}

export async function createPosting(formData: FormData) {
  const db = getDb();
  const title = str(formData, "title");
  const organizationId = num(formData, "organizationId");
  const description = str(formData, "description");
  if (!title || !organizationId || !description) return;

  const slugBase = str(formData, "slug") ?? slugify(title);
  const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

  const [row] = await db
    .insert(postings)
    .values({
      title,
      slug,
      organizationId,
      description,
      kind: (str(formData, "kind") as never) ?? "GOVERNMENT",
      currentStage: (str(formData, "currentStage") as never) ?? "NOTIFICATION_OUT",
      eligibility: str(formData, "eligibility") ?? undefined,
      totalVacancies: num(formData, "totalVacancies") ?? undefined,
      ageLimitMin: num(formData, "ageLimitMin") ?? undefined,
      ageLimitMax: num(formData, "ageLimitMax") ?? undefined,
      applicationFeeGeneral: num(formData, "applicationFeeGeneral") ?? undefined,
      applicationFeeReserved: num(formData, "applicationFeeReserved") ?? undefined,
      salaryMin: num(formData, "salaryMin") ?? undefined,
      salaryMax: num(formData, "salaryMax") ?? undefined,
      locationCity: str(formData, "locationCity") ?? undefined,
      locationRegion: str(formData, "locationRegion") ?? undefined,
      officialNotificationUrl: str(formData, "officialNotificationUrl") ?? undefined,
      applyUrl: str(formData, "applyUrl") ?? undefined,
      validThrough: str(formData, "validThrough")
        ? new Date(str(formData, "validThrough")!)
        : undefined,
      examDate: str(formData, "examDate")
        ? new Date(str(formData, "examDate")!)
        : undefined,
    })
    .returning({ id: postings.id });

  revalidatePath("/admin");
  revalidatePath("/jobs");
  revalidatePath("/");
  redirect(`/admin/postings/${row.id}`);
}

export async function updatePostingStage(postingId: number, formData: FormData) {
  const db = getDb();
  const stage = str(formData, "stage");
  if (!stage) return;
  const [posting] = await db
    .update(postings)
    .set({ currentStage: stage as never, updatedAt: new Date() })
    .where(eq(postings.id, postingId))
    .returning({ slug: postings.slug });

  await db.insert(postingUpdates).values({
    postingId,
    stage: stage as never,
    title: str(formData, "updateTitle") ?? `Status updated`,
    description: str(formData, "updateDescription") ?? undefined,
    linkUrl: str(formData, "updateLink") ?? undefined,
    eventDate: str(formData, "eventDate")
      ? new Date(str(formData, "eventDate")!)
      : new Date(),
  });

  revalidatePath("/admin");
  if (posting) revalidatePath(`/jobs/${posting.slug}`);
  revalidatePath("/jobs");
  revalidatePath("/");
}

async function createApprovalNews(postingId: number) {
  const db = getDb();
  const p = await db.query.postings.findFirst({
    where: eq(postings.id, postingId),
    with: { organization: true },
  });

  if (!p) return;
  const examType = detectExamType(p.title);
  const slugBase = p.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

  // Create news article for this posting
  const [newsArticle] = await db
    .insert(articles)
    .values({
      title: `${p.title} — ${p.totalVacancies || "Multiple"} Vacancies Open`,
      slug,
      body: `${p.organization.name} has released ${p.totalVacancies || "multiple"} vacancies for ${p.title}.\n\n**Key Details:**\n- Organization: ${p.organization.name}\n- Positions: ${p.totalVacancies || "See details"}\n- Location: ${p.locationCity || "Multiple"}\n- Salary: ${p.salaryMin && p.salaryMax ? `₹${p.salaryMin}-${p.salaryMax}` : "As per norms"}\n- Apply by: ${p.validThrough ? new Date(p.validThrough).toLocaleDateString("en-IN") : "Check official notification"}\n\n[View Full Details](/jobs/${p.slug})`,
      dek: `${p.totalVacancies || ""} positions open at ${p.organization.name} — apply now`,
      type: examType === "teaching" ? "ADMIT_CARD_GUIDE" : "NEWS",
      authorName: "Job Alerts",
      status: "PUBLISHED",
      publishedAt: new Date(),
    })
    .returning({ id: articles.id });

  // Link article to posting
  if (newsArticle) {
    await db.insert(postingArticles).values({
      postingId,
      articleId: newsArticle.id,
      relationType: "RELATED",
    });
  }
}

async function approvePostingDirect(postingId: number) {
  const db = getDb();
  await db
    .update(postings)
    .set({ reviewStatus: "APPROVED", updatedAt: new Date() })
    .where(eq(postings.id, postingId));

  // Generate news article for this posting
  await createApprovalNews(postingId);

  revalidatePath("/admin");
  revalidatePath("/jobs");
  revalidatePath("/news");
  revalidatePath("/exams");
  revalidatePath("/");
}

async function rejectPostingDirect(postingId: number) {
  const db = getDb();
  await db
    .update(postings)
    .set({ reviewStatus: "REJECTED", updatedAt: new Date() })
    .where(eq(postings.id, postingId));
  revalidatePath("/admin");
  revalidatePath("/jobs");
  revalidatePath("/");
}

export async function approvePosting(formData: FormData) {
  const postingId = num(formData, "postingId");
  if (!postingId) return;
  await approvePostingDirect(postingId);
}

export async function rejectPosting(formData: FormData) {
  const postingId = num(formData, "postingId");
  if (!postingId) return;
  await rejectPostingDirect(postingId);
}

export async function createArticle(formData: FormData) {
  const db = getDb();
  const title = str(formData, "title");
  const body = str(formData, "body");
  if (!title || !body) return;
  const slug = `${str(formData, "slug") ?? slugify(title)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  const [row] = await db
    .insert(articles)
    .values({
      title,
      slug,
      body,
      dek: str(formData, "dek") ?? undefined,
      type: (str(formData, "type") as never) ?? "GUIDE",
      authorName: str(formData, "authorName") ?? undefined,
      status: "PUBLISHED",
      publishedAt: new Date(),
    })
    .returning({ id: articles.id });

  const postingIdRaw = num(formData, "postingId");
  if (postingIdRaw) {
    await db.insert(postingArticles).values({
      postingId: postingIdRaw,
      articleId: row.id,
      relationType: "RELATED",
    });
  }

  revalidatePath("/admin");
  revalidatePath("/articles");
  revalidatePath("/");
  redirect(`/admin/articles`);
}
