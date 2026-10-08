import { getDb } from "../index";
import { positions, posts, recruitments, exams, qualifications, postings, organizations } from "../schema";
import { eq, desc, sql } from "drizzle-orm";
import { hasDb } from "@/lib/queries";
import type { RolePost } from "./get-roles";

/**
 * Get position by slug
 * Returns the full position object with career path details
 */
export async function getPositionBySlug(slug: string) {
  if (!hasDb()) return null;
  const db = getDb();
  const result = await db
    .select()
    .from(positions)
    .where(eq(positions.slug, slug))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get enriched posts for a position (for role hub pages)
 * Returns posts in the same RolePost format as getPostsForRole
 */
export async function getPostsForPosition(positionId: number): Promise<RolePost[]> {
  if (!hasDb()) return [];
  const db = getDb();

  const rows = await db
    .select({
      postId: posts.id,
      postName: posts.name,
      postSlug: posts.slug,
      vacancyTotal: posts.vacancyTotal,
      salaryMin: posts.salaryMin,
      salaryMax: posts.salaryMax,
      payLevel: posts.payLevel,
      recruitmentId: recruitments.id,
      recruitmentName: recruitments.name,
      recruitmentSlug: recruitments.slug,
      recruitmentYear: recruitments.year,
      recruitmentStatus: recruitments.status,
      applicationEndDate: recruitments.applicationEndDate,
      notificationUrl: recruitments.notificationUrl,
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
      organizationState: organizations.state,
      enrichmentFeeNote: recruitments.feeNote,
      enrichmentSelectionProcess: recruitments.selectionProcess,
      enrichmentAgeNote: recruitments.ageNote,
      enrichmentApplyUrl: recruitments.applyUrl,
    })
    .from(posts)
    .innerJoin(recruitments, eq(recruitments.id, posts.recruitmentId))
    .innerJoin(organizations, eq(organizations.id, recruitments.organizationId))
    .where(eq(posts.positionId, positionId))
    .orderBy(desc(recruitments.year), desc(recruitments.applicationEndDate));

  return rows as RolePost[];
}

/**
 * Get stats for a position (active/total vacancies and recruitments)
 */
export async function getPositionStats(positionId: number) {
  if (!hasDb()) return { totalVacancies: 0, activeRecruitments: 0, totalRecruitments: 0 };
  const db = getDb();

  const result = await db
    .select({
      totalVacancies: sql<number>`COALESCE(SUM(${posts.vacancyTotal}), 0)::int`,
      totalRecruitments: sql<number>`COUNT(DISTINCT ${recruitments.id})::int`,
      activeRecruitments: sql<number>`COUNT(DISTINCT CASE WHEN ${recruitments.status} = 'ACTIVE' THEN ${recruitments.id} END)::int`,
    })
    .from(posts)
    .innerJoin(recruitments, eq(recruitments.id, posts.recruitmentId))
    .where(eq(posts.positionId, positionId));

  // Fallback if query fails
  if (!result || result.length === 0) {
    return { totalVacancies: 0, activeRecruitments: 0, totalRecruitments: 0 };
  }

  const row = result[0];
  return {
    totalVacancies: Number(row?.totalVacancies ?? 0),
    activeRecruitments: Number(row?.activeRecruitments ?? 0),
    totalRecruitments: Number(row?.totalRecruitments ?? 0),
  };
}

/**
 * Get all posts that link to this position
 * Includes recruitment and eligibility details
 */
export async function getPositionPosts(positionId: number) {
  const db = getDb();

  const result = await db
    .select({
      post: posts,
      recruitment: recruitments,
    })
    .from(posts)
    .innerJoin(recruitments, eq(posts.recruitmentId, recruitments.id))
    .where(eq(posts.positionId, positionId));

  return result;
}

/**
 * Get all postings (scraped data instances) linked to this position
 * Ordered by creation date, most recent first
 */
export async function getPositionPostings(positionId: number, limit: number = 50) {
  const db = getDb();

  const result = await db
    .select({
      posting: postings,
      post: posts,
      recruitment: recruitments,
    })
    .from(postings)
    .innerJoin(posts, eq(postings.inferredPostId, posts.id))
    .innerJoin(recruitments, eq(posts.recruitmentId, recruitments.id))
    .where(eq(posts.positionId, positionId))
    .limit(limit);

  return result;
}

/**
 * Get all exams that recruit for this position
 * Includes organization details
 */
export async function getPositionRelatedExams(positionId: number) {
  const db = getDb();

  const result = await db
    .selectDistinct({
      exam: exams,
    })
    .from(exams)
    .innerJoin(recruitments, eq(exams.id, recruitments.examId))
    .innerJoin(posts, eq(recruitments.id, posts.recruitmentId))
    .where(eq(posts.positionId, positionId));

  return result.map((r) => r.exam);
}

/**
 * Get all recruitments (campaigns) that have this position
 * Ordered by status and date
 */
export async function getPositionRelatedRecruitments(positionId: number) {
  const db = getDb();

  const result = await db
    .selectDistinct({
      recruitment: recruitments,
    })
    .from(recruitments)
    .innerJoin(posts, eq(recruitments.id, posts.recruitmentId))
    .where(eq(posts.positionId, positionId));

  return result.map((r) => r.recruitment);
}

/**
 * Get typical qualification for this position
 */
export async function getPositionQualification(positionId: number) {
  const db = getDb();
  const position = await db
    .select()
    .from(positions)
    .where(eq(positions.id, positionId))
    .limit(1);

  if (!position || position.length === 0 || !position[0].typicalQualificationId) {
    return null;
  }

  const qual = await db
    .select()
    .from(qualifications)
    .where(eq(qualifications.id, position[0].typicalQualificationId))
    .limit(1);

  return qual.length > 0 ? qual[0] : null;
}
