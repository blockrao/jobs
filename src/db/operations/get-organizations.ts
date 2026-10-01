import { getDb } from "../index";
import { organizations, recruitments, exams, posts, positions } from "../schema-v2";
import { eq } from "drizzle-orm";

/**
 * Get organization by slug
 * Returns the full organization object with roles
 */
export async function getOrganizationBySlug(slug: string) {
  const db = getDb();
  const result = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get all recruitments (campaigns) for this organization
 * Includes exam details if applicable
 */
export async function getOrganizationRecruitments(organizationId: number) {
  const db = getDb();

  const result = await db
    .select({
      recruitment: recruitments,
      exam: exams,
    })
    .from(recruitments)
    .leftJoin(exams, eq(recruitments.examId, exams.id))
    .where(eq(recruitments.organizationId, organizationId));

  return result;
}

/**
 * Get all exams conducted by this organization
 * Only relevant if organization is an EXAM_AUTHORITY
 */
export async function getOrganizationExams(organizationId: number) {
  const db = getDb();

  const result = await db
    .select()
    .from(exams)
    .where(eq(exams.organizationId, organizationId));

  return result;
}

/**
 * Get all positions recruited by this organization
 * Includes position details and recruitment info
 */
export async function getOrganizationPositions(organizationId: number) {
  const db = getDb();

  const result = await db
    .selectDistinct({
      position: positions,
    })
    .from(positions)
    .innerJoin(posts, eq(positions.id, posts.positionId))
    .innerJoin(recruitments, eq(posts.recruitmentId, recruitments.id))
    .where(eq(recruitments.organizationId, organizationId));

  return result.map((r) => r.position);
}

/**
 * Get recruitment statistics for this organization
 * Useful for dashboard/analytics
 */
export async function getOrganizationStats(organizationId: number) {
  const db = getDb();

  const recruitmentsCount = await db
    .select()
    .from(recruitments)
    .where(eq(recruitments.organizationId, organizationId));

  const examsCount = await db
    .select()
    .from(exams)
    .where(eq(exams.organizationId, organizationId));

  const positionsCount = await db
    .selectDistinct({ id: positions.id })
    .from(positions)
    .innerJoin(posts, eq(positions.id, posts.positionId))
    .innerJoin(recruitments, eq(posts.recruitmentId, recruitments.id))
    .where(eq(recruitments.organizationId, organizationId));

  return {
    recruitmentCount: recruitmentsCount.length,
    examCount: examsCount.length,
    positionCount: positionsCount.length,
  };
}
