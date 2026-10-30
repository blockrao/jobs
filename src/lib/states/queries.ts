import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { deriveLifecycle, type Lifecycle } from "@/lib/lifecycle";
import { recruitmentIsLiveSql } from "@/db/operations/recruitment-lifecycle-sql";

/**
 * State hub queries — canonical recruitments only (2026-10-20).
 *
 * A recruitment belongs to a state hub through recruitments.location_state_code
 * (ISO 3166-2:IN, set from explicit evidence in the notification). Quarantined
 * recruitments are excluded and "current" is derived with the shared lifecycle
 * rule, never a stored flag. The legacy `postings` table is not read.
 */

/** ISO 3166-2:IN → state hub slug. Old codes (IN-CT, IN-OR, IN-UT) are kept for data that still uses them. */
const CODE_TO_SLUG: Record<string, string> = {
  "IN-AP": "andhra-pradesh",
  "IN-AR": "arunachal-pradesh",
  "IN-AS": "assam",
  "IN-BR": "bihar",
  "IN-CG": "chhattisgarh",
  "IN-CT": "chhattisgarh",
  "IN-GA": "goa",
  "IN-GJ": "gujarat",
  "IN-HR": "haryana",
  "IN-HP": "himachal-pradesh",
  "IN-JK": "jammu-kashmir",
  "IN-JH": "jharkhand",
  "IN-KA": "karnataka",
  "IN-KL": "kerala",
  "IN-MP": "madhya-pradesh",
  "IN-MH": "maharashtra",
  "IN-MN": "manipur",
  "IN-ML": "meghalaya",
  "IN-MZ": "mizoram",
  "IN-NL": "nagaland",
  "IN-OD": "odisha",
  "IN-OR": "odisha",
  "IN-PB": "punjab",
  "IN-RJ": "rajasthan",
  "IN-SK": "sikkim",
  "IN-TN": "tamil-nadu",
  "IN-TS": "telangana",
  "IN-TG": "telangana",
  "IN-TR": "tripura",
  "IN-UP": "uttar-pradesh",
  "IN-UK": "uttarakhand",
  "IN-UT": "uttarakhand",
  "IN-WB": "west-bengal",
  "IN-AN": "andaman-nicobar",
  "IN-CH": "chandigarh",
  "IN-DH": "dadra-nagar-haveli-daman-diu",
  "IN-DN": "dadra-nagar-haveli-daman-diu",
  "IN-DD": "dadra-nagar-haveli-daman-diu",
  "IN-DL": "delhi",
  "IN-LA": "ladakh",
  "IN-LD": "lakshadweep",
  "IN-PY": "puducherry",
};

const SLUG_TO_CODES: Record<string, string[]> = {};
for (const [code, slug] of Object.entries(CODE_TO_SLUG)) (SLUG_TO_CODES[slug] ??= []).push(code);

export function stateSlugForCode(code: string | null | undefined): string | null {
  return code ? CODE_TO_SLUG[code.toUpperCase()] ?? null : null;
}

export interface StateRecruitment {
  id: number;
  slug: string;
  name: string;
  orgName: string;
  orgSlug: string;
  totalVacancies: number | null;
  postCount: number;
  notificationDate: Date | null;
  applicationEndDate: Date | null;
  lifecycle: Lifecycle;
}

type Row = {
  id: number; slug: string; name: string; status: string;
  org_name: string; org_slug: string; total_vacancies: number | null; post_count: number;
  notification_date: Date | string | null; application_end_date: Date | string | null;
};

function rowsOf<T>(result: unknown): T[] {
  const r = result as { rows?: T[] };
  if (Array.isArray(result)) return result as T[];
  return Array.isArray(r?.rows) ? r.rows : [];
}

function toDate(v: Date | string | null): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** Current (live) recruitments placed in a state, soonest deadline first. */
export async function listStateJobs(slug: string, limit = 100): Promise<StateRecruitment[]> {
  const db = getDb();
  if (!db) return [];
  const codes = SLUG_TO_CODES[slug];
  if (!codes?.length) return [];
  const result = await db.execute(sql`
    SELECT r.id, r.slug, r.name, r.status, r.total_vacancies, r.notification_date, r.application_end_date,
           o.name AS org_name, o.slug AS org_slug,
           (SELECT count(*)::int FROM posts p WHERE p.recruitment_id = r.id) AS post_count
    FROM recruitments r
    JOIN organizations o ON o.id = r.organization_id
    WHERE r.location_state_code IN (
      ${sql.join(codes.map((code) => sql`${code}`), sql`, `)}
    )
      AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
      AND ${recruitmentIsLiveSql(sql`r.status`, sql`r.application_end_date`)}
    ORDER BY r.application_end_date ASC NULLS LAST, r.notification_date DESC NULLS LAST
    LIMIT ${limit * 2}
  `);
  const now = new Date();
  return rowsOf<Row>(result)
    .map((r) => {
      const lifecycle = deriveLifecycle(r.status, r.application_end_date, now);
      return ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      orgName: r.org_name,
      orgSlug: r.org_slug,
      totalVacancies: r.total_vacancies,
      postCount: r.post_count ?? 0,
      notificationDate: toDate(r.notification_date),
      applicationEndDate: lifecycle.deadline,
      lifecycle,
    });
    })
    .filter((r) => r.lifecycle.isLive)
    .slice(0, limit);
}

/** Current recruitments per state slug (slugs with none are absent). */
export async function countCurrentByState(): Promise<Record<string, number>> {
  const db = getDb();
  if (!db) return {};
  const result = await db.execute(sql`
    SELECT r.location_state_code AS code, count(*)::int AS n
    FROM recruitments r
    WHERE r.location_state_code IS NOT NULL
      AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
      AND ${recruitmentIsLiveSql(sql`r.status`, sql`r.application_end_date`)}
    GROUP BY r.location_state_code
  `);
  const out: Record<string, number> = {};
  for (const row of rowsOf<{ code: string; n: number }>(result)) {
    const slug = stateSlugForCode(row.code);
    if (slug) out[slug] = (out[slug] ?? 0) + row.n;
  }
  return out;
}
