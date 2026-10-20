/**
 * Pillar page operations (Phase 2 Tier 1)
 * Fetches organization data + all recruitments + posts for pillar pages
 */

import { getDb } from "@/db";
import { sql, eq } from "drizzle-orm";
import { organizations, recruitments, posts } from "@/db/schema";

export interface PillarData {
  organization: {
    id: number;
    name: string;
    slug: string;
    pillarSlug: string;
    sector?: string;
    description?: string;
    logoUrl?: string;
    websiteUrl?: string;
  };
  recruitmentCount: number;
  postCount: number;
  stats: {
    avgSalaryMin?: number;
    avgSalaryMax?: number;
    hasEnrichedData: number;
  };
}

export interface PillarPostSample {
  id: number | string;
  title: string;
  slug: string;
  recruitmentSlug: string;
  recruitmentName: string;
  status?: string;
  applicationDeadline?: string | null;
  salary?: {
    min?: number | null;
    max?: number | null;
  };
}

/**
 * Get pillar data by slug
 * Includes organization info + recruitment/post counts + salary stats
 */
export async function getPillarBySlug(pillarSlug: string): Promise<PillarData | null> {
  const db = getDb();

  try {
    // Fetch organization with pillar enabled
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.pillarSlug, pillarSlug))
      .limit(1);

    if (!org || org.length === 0) {
      return null;
    }

    const organization = org[0];

    // Count recruitments for this org
    const recruitmentCountResult = await db.execute(sql`
      SELECT COUNT(DISTINCT id) as count
      FROM recruitments
      WHERE organization_id = ${organization.id}
        AND verification_status IS DISTINCT FROM 'QUARANTINED'
    `);

    const recruitmentCount = (recruitmentCountResult as any[])[0]?.count || 0;

    // Count posts for this org
    const postCountResult = await db.execute(sql`
      SELECT COUNT(DISTINCT p.id) as count
      FROM posts p
      JOIN recruitments r ON r.id = p.recruitment_id
      WHERE r.organization_id = ${organization.id}
        AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
    `);

    const postCount = (postCountResult as any[])[0]?.count || 0;

    // Get salary stats (avg min/max from enriched data)
    const salaryStatsResult = await db.execute(sql`
      SELECT
        AVG((p.enrichment->>'salaryMin')::numeric) as avg_salary_min,
        AVG((p.enrichment->>'salaryMax')::numeric) as avg_salary_max,
        COUNT(DISTINCT CASE WHEN p.enrichment IS NOT NULL THEN p.id END) as enriched_count
      FROM posts p
      JOIN recruitments r ON r.id = p.recruitment_id
      WHERE r.organization_id = ${organization.id}
        AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
        AND (p.enrichment->>'salaryMin' IS NOT NULL OR p.enrichment->>'salaryMax' IS NOT NULL)
    `);

    const stats = {
      avgSalaryMin: salaryStatsResult[0]?.avg_salary_min ? parseFloat(salaryStatsResult[0].avg_salary_min) : undefined,
      avgSalaryMax: salaryStatsResult[0]?.avg_salary_max ? parseFloat(salaryStatsResult[0].avg_salary_max) : undefined,
      hasEnrichedData: salaryStatsResult[0]?.enriched_count || 0,
    };

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        pillarSlug: organization.pillarSlug || pillarSlug,
        sector: organization.sector || undefined,
        description: organization.description || undefined,
        logoUrl: organization.logoUrl || undefined,
        websiteUrl: organization.websiteUrl || undefined,
      },
      recruitmentCount,
      postCount,
      stats,
    };
  } catch (e) {
    console.error(`Error fetching pillar ${pillarSlug}:`, e);
    return null;
  }
}

/**
 * Get sample posts for pillar (used in pillar posts grid)
 * Returns top posts by deadline + relevance
 */
export async function getPillarPostSamples(
  organizationId: number,
  limit: number = 12
): Promise<PillarPostSample[]> {
  const db = getDb();

  try {
    const results = await db.execute(sql`
      SELECT
        p.id,
        p.title,
        p.slug,
        r.slug as recruitment_slug,
        r.name as recruitment_name,
        r.status,
        r.application_end_date as application_deadline,
        (p.enrichment->>'salaryMin')::numeric as salary_min,
        (p.enrichment->>'salaryMax')::numeric as salary_max
      FROM posts p
      JOIN recruitments r ON r.id = p.recruitment_id
      WHERE r.organization_id = ${organizationId}
        AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
      ORDER BY
        CASE
          WHEN r.application_end_date IS NULL THEN 1
          WHEN r.application_end_date > NOW() THEN 0
          ELSE 2
        END,
        r.application_end_date DESC NULLS LAST,
        r.id DESC
      LIMIT ${limit}
    `);

    return (results as any[]).map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      recruitmentSlug: row.recruitment_slug,
      recruitmentName: row.recruitment_name,
      status: row.status,
      applicationDeadline: row.application_deadline ? new Date(row.application_deadline).toISOString() : null,
      salary: {
        min: row.salary_min ? parseInt(row.salary_min) : undefined,
        max: row.salary_max ? parseInt(row.salary_max) : undefined,
      },
    }));
  } catch (e) {
    console.error(`Error fetching pillar post samples for org ${organizationId}:`, e);
    return [];
  }
}

/**
 * Get all pillar slugs (for sitemap generation)
 */
export async function getAllPillarSlugs(): Promise<string[]> {
  const db = getDb();

  try {
    const results = await db
      .select({ pillarSlug: organizations.pillarSlug })
      .from(organizations)
      .where(eq(organizations.pillarEnabled, true));

    return results
      .map((r) => r.pillarSlug)
      .filter((slug): slug is string => slug !== null && slug !== undefined);
  } catch (e) {
    console.error("Error fetching all pillar slugs:", e);
    return [];
  }
}

/**
 * Get pillar aggregated FAQ data (for schema generation)
 * Extracts common qualifications, age limits, salary ranges from posts
 */
export async function getPillarFAQData(organizationId: number) {
  const db = getDb();

  try {
    const results = await db.execute(sql`
      SELECT
        -- Salary stats
        MIN((p.enrichment->>'salaryMin')::numeric) as salary_min_overall,
        MAX((p.enrichment->>'salaryMax')::numeric) as salary_max_overall,

        -- Age limits (most common)
        (p.enrichment->>'ageLimit') as age_limit,

        -- Application deadline (soonest active)
        MIN(CASE WHEN r.application_end_date > NOW() THEN r.application_end_date END) as next_deadline,

        -- Recruitment count
        COUNT(DISTINCT r.id) as recruitment_count,
        COUNT(DISTINCT p.id) as post_count
      FROM posts p
      JOIN recruitments r ON r.id = p.recruitment_id
      WHERE r.organization_id = ${organizationId}
        AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
      GROUP BY p.enrichment->>'ageLimit'
      LIMIT 1
    `);

    const data = results[0];
    return {
      minSalary: data?.salary_min_overall ? parseInt(data.salary_min_overall) : undefined,
      maxSalary: data?.salary_max_overall ? parseInt(data.salary_max_overall) : undefined,
      ageLimit: data?.age_limit || undefined,
      nextDeadline: data?.next_deadline ? new Date(data.next_deadline) : undefined,
      recruitmentCount: data?.recruitment_count || 0,
      postCount: data?.post_count || 0,
    };
  } catch (e) {
    console.error(`Error fetching pillar FAQ data for org ${organizationId}:`, e);
    return null;
  }
}
