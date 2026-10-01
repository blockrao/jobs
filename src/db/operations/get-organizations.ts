import { getDb } from "../index";
import { organizations, recruitments, exams, posts, positions } from "../schema";
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
 * Get all exams this organization has recruited through.
 *
 * An exam's parent is the commission that conducts it (SSC, UPSC, ...), not
 * the recruiting organization — organizations only connect to exams
 * indirectly, through recruitments. So this is "exams this org has used",
 * not "exams this org owns" (there's no such relationship in the schema).
 */
export async function getOrganizationExams(organizationId: number) {
  const db = getDb();

  const result = await db
    .selectDistinct({ exam: exams })
    .from(exams)
    .innerJoin(recruitments, eq(recruitments.examId, exams.id))
    .where(eq(recruitments.organizationId, organizationId));

  return result.map((r) => r.exam);
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
    .selectDistinct({ id: exams.id })
    .from(exams)
    .innerJoin(recruitments, eq(recruitments.examId, exams.id))
    .where(eq(recruitments.organizationId, organizationId));

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
