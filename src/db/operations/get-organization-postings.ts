import { getDb } from "../index";
import { postings, postingUpdates } from "../schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Get all ACTIVE postings for an organization
 * Used to populate the organization hub page with live data
 */
export async function getOrganizationPostings(organizationId: number) {
  const db = getDb();

  const result = await db
    .select()
    .from(postings)
    .where(
      and(
        eq(postings.organizationId, organizationId),
        eq(postings.reviewStatus, "APPROVED"),
      )
    )
    .orderBy(desc(postings.datePosted));

  return result;
}

/**
 * Get salary stats for an organization
 * Returns min, max, and count of postings with salary data
 */
export async function getOrganizationSalaryStats(organizationId: number) {
  const db = getDb();

  const result = await db
    .select({
      minSalary: sql<number>`MIN(${postings.salaryMin})`,
      maxSalary: sql<number>`MAX(${postings.salaryMax})`,
      avgMinSalary: sql<number>`AVG(${postings.salaryMin})`,
      avgMaxSalary: sql<number>`AVG(${postings.salaryMax})`,
      count: sql<number>`COUNT(*)`,
    })
    .from(postings)
    .where(
      and(
        eq(postings.organizationId, organizationId),
        eq(postings.reviewStatus, "APPROVED"),
      )
    );

  return result[0] || { minSalary: null, maxSalary: null, avgMinSalary: null, avgMaxSalary: null, count: 0 };
}

/**
 * Get geographic distribution of postings
 * Returns count of positions by state/city
 */
export async function getOrganizationGeographicDistribution(organizationId: number) {
  const db = getDb();

  const result = await db
    .select({
      state: postings.locationRegion,
      city: postings.locationCity,
      count: sql<number>`COUNT(*)`,
    })
    .from(postings)
    .where(
      and(
        eq(postings.organizationId, organizationId),
        eq(postings.reviewStatus, "APPROVED"),
      )
    )
    .groupBy(postings.locationRegion, postings.locationCity)
    .orderBy(desc(sql<number>`COUNT(*)`));

  return result;
}

/**
 * Get vacancy stats for an organization
 * Returns total vacancies and count of postings
 */
export async function getOrganizationVacancyStats(organizationId: number) {
  const db = getDb();

  const result = await db
    .select({
      totalVacancies: sql<number>`COALESCE(SUM(${postings.totalVacancies}), 0)`,
      postingCount: sql<number>`COUNT(*)`,
      avgVacanciesPerPosting: sql<number>`AVG(${postings.totalVacancies})`,
    })
    .from(postings)
    .where(
      and(
        eq(postings.organizationId, organizationId),
        eq(postings.reviewStatus, "APPROVED"),
      )
    );

  return result[0] || { totalVacancies: 0, postingCount: 0, avgVacanciesPerPosting: 0 };
}

/**
 * Get timeline/lifecycle data for postings
 * Returns unique stages and their dates
 */
export async function getOrganizationTimelineData(organizationId: number) {
  const db = getDb();

  const result = await db
    .select({
      stage: postingUpdates.stage,
      title: postingUpdates.title,
      eventDate: postingUpdates.eventDate,
      description: postingUpdates.description,
    })
    .from(postingUpdates)
    .innerJoin(postings, eq(postingUpdates.postingId, postings.id))
    .where(
      and(
        eq(postings.organizationId, organizationId),
        eq(postings.reviewStatus, "APPROVED"),
      )
    )
    .orderBy(postingUpdates.eventDate);

  return result;
}

/**
 * Get distinct role names for an organization
 * Used to populate the "Qualification by Role" section
 */
export async function getOrganizationRoles(organizationId: number) {
  const db = getDb();

  const result = await db
    .selectDistinct({ postName: postings.postNames })
    .from(postings)
    .where(
      and(
        eq(postings.organizationId, organizationId),
        eq(postings.reviewStatus, "APPROVED"),
      )
    );

  // Flatten the jsonb array and deduplicate
  const roles = new Set<string>();
  result.forEach((r) => {
    if (Array.isArray(r.postName)) {
      r.postName.forEach((name) => {
        if (name) roles.add(name);
      });
    }
  });

  return Array.from(roles).sort();
}
