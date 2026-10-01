import { getDb } from "../index";
import { exams, recruitments, posts, positions, commissions } from "../schema";
import { eq } from "drizzle-orm";

/**
 * Get exam by slug
 *
 * Includes the commission details (e.g. SSC, UPSC) — the body that conducts
 * the exam. There's no `exams.organizationId`: an exam isn't owned by one
 * recruiting organization, it's reused across many organizations' separate
 * recruitments (see getExamRelatedRecruitments). The commission is the
 * exam's real, singular parent.
 */
export async function getExamBySlug(slug: string) {
  const db = getDb();
  const result = await db
    .select({
      exam: exams,
      commission: commissions,
    })
    .from(exams)
    .innerJoin(commissions, eq(exams.commissionId, commissions.id))
    .where(eq(exams.slug, slug))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get all positions that this exam recruits for
 * Returns distinct positions across all recruitments using this exam
 */
export async function getExamRelatedPositions(examId: number) {
  const db = getDb();

  const result = await db
    .selectDistinct({
      position: positions,
    })
    .from(positions)
    .innerJoin(posts, eq(positions.id, posts.positionId))
    .innerJoin(recruitments, eq(posts.recruitmentId, recruitments.id))
    .where(eq(recruitments.examId, examId));

  return result.map((r) => r.position);
}

/**
 * Get all recruitments (campaigns) that use this exam
 * Ordered by year descending
 */
export async function getExamRelatedRecruitments(examId: number) {
  const db = getDb();

  const result = await db
    .select({
      recruitment: recruitments,
    })
    .from(recruitments)
    .where(eq(recruitments.examId, examId));

  return result.map((r) => r.recruitment);
}

/**
 * Get all recruitments for this exam with their posts and positions
 */
export async function getExamRecruitmentDetails(examId: number) {
  const db = getDb();

  const result = await db
    .select({
      recruitment: recruitments,
      post: posts,
      position: positions,
    })
    .from(recruitments)
    .leftJoin(posts, eq(recruitments.id, posts.recruitmentId))
    .leftJoin(positions, eq(posts.positionId, positions.id))
    .where(eq(recruitments.examId, examId));

  // Group recruitments and their posts
  const recruitmentsMap = new Map();
  for (const row of result) {
    if (!recruitmentsMap.has(row.recruitment.id)) {
      recruitmentsMap.set(row.recruitment.id, {
        ...row.recruitment,
        posts: [],
      });
    }
    if (row.post && row.position) {
      recruitmentsMap.get(row.recruitment.id).posts.push({
        post: row.post,
        position: row.position,
      });
    }
  }

  return Array.from(recruitmentsMap.values());
}
