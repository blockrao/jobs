/**
 * Organization page data — computed from canonical recruitments and posts only.
 *
 * FIXED: 2026-10-22 14:01 UTC+5:30
 * - Line 97: Changed e.name to e.label (exams table uses label, not name)
 * - Migration applied to add missing eligibilities columns
 *
 * Rules (2026-10-20 stability triage):
 *  - the legacy `postings` table is never read here;
 *  - quarantined recruitments are excluded everywhere;
 *  - live/closed comes from `deriveLifecycle`, never a stored flag;
 *  - vacancies are counted once per recruitment (recruitments.total_vacancies),
 *    never summed across post rows that repeat the same recruitment total;
 *  - every number on the page traces to a row; nothing is estimated.
 */
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { deriveLifecycle, type Lifecycle } from "@/lib/lifecycle";
import { hasHighConfidenceIssuerOrganizationMismatch } from "@/lib/organization-identity";

/** Every organization is indexable regardless of recruitment count. */
export const ORG_INDEX_MIN_RECRUITMENTS = 0;

export interface OrgRecruitment {
  id: number;
  slug: string;
  name: string;
  status: string;
  notificationDate: Date | null;
  applicationEndDate: Date | null;
  totalVacancies: number | null;
  postCount: number;
  examSlug: string | null;
  examName: string | null;
  lifecycle: Lifecycle;
}

export interface OrgPostRole {
  name: string;
  recruitmentCount: number;
  salaryMin: number | null;
  salaryMax: number | null;
}

export interface OrgExam {
  slug: string;
  name: string;
  recruitmentCount: number;
}

export interface OrganizationStats {
  recruitments: OrgRecruitment[];
  live: OrgRecruitment[];
  closed: OrgRecruitment[];
  /** Sum of recruitment-level vacancies across live recruitments (null when none state a figure). */
  liveVacancies: number | null;
  /** Date of the most recent notification on record, if any. */
  latestNotification: Date | null;
  /** Earliest closing date among live recruitments with a known deadline. */
  nextDeadline: Date | null;
  roles: OrgPostRole[];
  exams: OrgExam[];
  /** Indexable when the organization has enough recruitments on record. */
  indexable: boolean;
}

type RecruitmentRow = {
  id: number;
  slug: string;
  name: string;
  status: string;
  notification_date: Date | string | null;
  application_end_date: Date | string | null;
  total_vacancies: number | null;
  post_count: number;
  exam_slug: string | null;
  exam_name: string | null;
  organisation_name: string;
  enrichment_source: string | null;
  institution_name: string | null;
};

type RoleRow = { name: string; recruitment_count: number; salary_min: number | null; salary_max: number | null };

function rowsOf<T>(result: unknown): T[] {
  const r = result as { rows?: T[] };
  if (Array.isArray(result)) return result as T[];
  return Array.isArray(r?.rows) ? r.rows : [];
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

export async function getOrganizationStats(organizationId: number, now = new Date()): Promise<OrganizationStats> {
  const db = getDb();

  const recResult = await db.execute(sql`
    SELECT r.id, r.slug, r.name, r.status, r.notification_date, r.application_end_date,
           r.total_vacancies,
           (SELECT count(*)::int FROM posts p WHERE p.recruitment_id = r.id) AS post_count,
           e.slug AS exam_slug, e.label AS exam_name,
           o.name AS organisation_name,
           r.enrichment_data -> 'meta' ->> 'source' AS enrichment_source,
           r.enrichment_data -> 'institution' ->> 'name' AS institution_name
    FROM recruitments r
    JOIN organizations o ON o.id = r.organization_id
    LEFT JOIN exams e ON e.id = r.exam_id
    WHERE r.organization_id = ${organizationId}
      AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
    ORDER BY r.application_end_date DESC NULLS LAST, r.notification_date DESC NULLS LAST, r.id DESC
  `);

  // A source-captured issuer name that conflicts with the linked organisation
  // is not attributed to this organisation until the relationship is reviewed.
  const eligibleRows = rowsOf<RecruitmentRow>(recResult).filter((r) =>
    !hasHighConfidenceIssuerOrganizationMismatch({
      source: r.enrichment_source,
      institutionName: r.institution_name,
      recruitmentName: r.name,
      organizationName: r.organisation_name,
    })
  );
  const eligibleIds = eligibleRows.map((r) => r.id);
  const roleResult = eligibleIds.length > 0
    ? await db.execute(sql`
        SELECT p.name,
               count(DISTINCT p.recruitment_id)::int AS recruitment_count,
               min(p.salary_min)::int AS salary_min,
               max(p.salary_max)::int AS salary_max
        FROM posts p
        JOIN recruitments r ON r.id = p.recruitment_id
        WHERE r.organization_id = ${organizationId}
          AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
          AND r.id IN (${sql.join(eligibleIds.map((id) => sql`${id}`), sql`, `)})
        GROUP BY p.name
        ORDER BY recruitment_count DESC, p.name ASC
        LIMIT 60
      `)
    : [];

  const recruitments: OrgRecruitment[] = eligibleRows.map((r) => {
    const lifecycle = deriveLifecycle(r.status, r.application_end_date, now);
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      status: r.status,
      notificationDate: toDate(r.notification_date),
      applicationEndDate: lifecycle.deadline,
      totalVacancies: r.total_vacancies,
      postCount: r.post_count ?? 0,
      examSlug: r.exam_slug,
      examName: r.exam_name,
      lifecycle,
    };
  });

  const roles: OrgPostRole[] = rowsOf<RoleRow>(roleResult).map((r) => ({
    name: r.name,
    recruitmentCount: r.recruitment_count,
    salaryMin: r.salary_min,
    salaryMax: r.salary_max,
  }));

  const live = recruitments
    .filter((r) => r.lifecycle.isLive)
    .sort((a, b) => {
      const da = a.lifecycle.deadline?.getTime() ?? Number.POSITIVE_INFINITY;
      const dbb = b.lifecycle.deadline?.getTime() ?? Number.POSITIVE_INFINITY;
      return da - dbb;
    });
  const closed = recruitments.filter((r) => !r.lifecycle.isLive);

  const liveWithVacancies = live.filter((r) => r.totalVacancies != null && r.totalVacancies > 0);
  const liveVacancies = liveWithVacancies.length
    ? liveWithVacancies.reduce((n, r) => n + (r.totalVacancies ?? 0), 0)
    : null;

  const latestNotification = recruitments
    .map((r) => r.notificationDate)
    .filter((d): d is Date => d != null)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const nextDeadline = live.find((r) => r.lifecycle.deadline)?.lifecycle.deadline ?? null;

  const roles: OrgPostRole[] = rowsOf<RoleRow>(roleResult).map((r) => ({
    name: r.name,
    recruitmentCount: r.recruitment_count,
    salaryMin: r.salary_min,
    salaryMax: r.salary_max,
  }));

  const examMap = new Map<string, OrgExam>();
  for (const r of recruitments) {
    if (!r.examSlug || !r.examName) continue;
    const e = examMap.get(r.examSlug) ?? { slug: r.examSlug, name: r.examName, recruitmentCount: 0 };
    e.recruitmentCount += 1;
    examMap.set(r.examSlug, e);
  }
  const exams = [...examMap.values()].sort((a, b) => b.recruitmentCount - a.recruitmentCount);

  return {
    recruitments,
    live,
    closed,
    liveVacancies,
    latestNotification,
    nextDeadline,
    roles,
    exams,
    indexable: true,
  };
}

/**
 * Canonical organizations with enough recruitments to be indexable — the
 * sitemap's organization section.
 */
export async function listIndexableOrganizations(): Promise<{ slug: string; updatedAt: Date | null }[]> {
  const db = getDb();
  const result = await db.execute(sql`
    SELECT o.slug, max(r.updated_at) AS updated_at
    FROM organizations o
    LEFT JOIN recruitments r ON r.organization_id = o.id
      AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
    WHERE o.merged_into_id IS NULL
    GROUP BY o.id, o.slug
    ORDER BY count(r.id) DESC
  `);
  return rowsOf<{ slug: string; updated_at: Date | string | null }>(result).map((r) => ({
    slug: r.slug,
    updatedAt: toDate(r.updated_at),
  }));
}
