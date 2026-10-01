import { getDb } from "../index";
import { positions, posts, recruitments, exams, qualifications, postings } from "../schema-v2";
import { eq } from "drizzle-orm";

/**
 * Get position by slug
 * Returns the full position object with career path details
 */
export async function getPositionBySlug(slug: string) {
  const db = getDb();
  const result = await db
    .select()
    .from(positions)
    .where(eq(positions.slug, slug))
    .limit(1);

  return result.length > 0 ? result[0] : null;
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
