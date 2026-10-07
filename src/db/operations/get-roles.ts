import { getDb } from "../index";
import { posts, recruitments, organizations } from "../schema";
import { and, eq, ilike, or, desc, sql } from "drizzle-orm";
import type { RoleDefinition } from "@/lib/roles";
import { roleAliases } from "@/lib/roles";
import { hasDb } from "@/lib/queries";

export interface RolePost {
  postId: number;
  postName: string;
  postSlug: string;
  vacancyTotal: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  payLevel: Record<string, unknown> | null;
  recruitmentId: number;
  recruitmentName: string;
  recruitmentSlug: string;
  recruitmentYear: number;
  recruitmentStatus: string;
  applicationEndDate: Date | null;
  notificationUrl: string | null;
  organizationId: number;
  organizationName: string;
  organizationSlug: string;
  /** State name from organizations.state — only present for GOVERNMENT_STATE orgs */
  organizationState: string | null;
}

export interface RoleStats {
  totalVacancies: number;
  activeRecruitments: number;
  totalRecruitments: number;
}

/**
 * Fetch all posts matching a role definition, joining recruitment and
 * organization. Returns rows sorted by recruitment year descending, then
 * application end date descending so active/recent appear first.
 *
 * Matching is case-insensitive against all aliases registered for the role.
 */
export async function getPostsForRole(role: RoleDefinition): Promise<RolePost[]> {
  if (!hasDb()) return [];
  const db = getDb();

  const aliases = roleAliases(role);
  // Build OR clause: posts.name ILIKE any alias
  const nameMatches = aliases.map((alias) => ilike(posts.name, alias));

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
    })
    .from(posts)
    .innerJoin(recruitments, eq(recruitments.id, posts.recruitmentId))
    .innerJoin(organizations, eq(organizations.id, recruitments.organizationId))
    .where(or(...nameMatches))
    .orderBy(desc(recruitments.year), desc(recruitments.applicationEndDate));

  return rows as RolePost[];
}

/**
 * Aggregate stats for a role: total vacancies, active recruitment count,
 * total recruitment count.
 */
export async function getRoleStats(role: RoleDefinition): Promise<RoleStats> {
  if (!hasDb()) return { totalVacancies: 0, activeRecruitments: 0, totalRecruitments: 0 };
  const db = getDb();

  const aliases = roleAliases(role);
  const nameMatches = aliases.map((alias) => ilike(posts.name, alias));

  const result = await db
    .select({
      totalVacancies: sql<number>`COALESCE(SUM(${posts.vacancyTotal}), 0)::int`,
      totalRecruitments: sql<number>`COUNT(DISTINCT ${recruitments.id})::int`,
      activeRecruitments: sql<number>`COUNT(DISTINCT CASE WHEN ${recruitments.status} = 'ACTIVE' THEN ${recruitments.id} END)::int`,
    })
    .from(posts)
    .innerJoin(recruitments, eq(recruitments.id, posts.recruitmentId))
    .where(or(...nameMatches));

  const row = result[0];
  return {
    totalVacancies: Number(row?.totalVacancies ?? 0),
    activeRecruitments: Number(row?.activeRecruitments ?? 0),
    totalRecruitments: Number(row?.totalRecruitments ?? 0),
  };
}
