'use server';

import { cache } from "react";
import { getDb } from "@/db";
import { sql } from "drizzle-orm";
import { getHub } from "@/data/hubs-metadata";

/**
 * A live recruitment shown on a hub page. Every item links to the canonical
 * recruitment page /jobs/{recruitment_slug}.
 *
 * Source: the canonical `recruitments` table (not the legacy `postings`
 * table, whose slugs no longer resolve). Only open recruitments are listed:
 * application end date today or later, never quarantined.
 */
export interface HubJob {
  id: number;
  title: string;
  organization: string | null;
  vacancies: number | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  last_date: Date | null;
  recruitment_slug: string;
}

// Hub metadata uses short state keys; map them to the names stored on records.
const STATE_NAMES: Record<string, string> = {
  UP: "Uttar Pradesh",
  TamilNadu: "Tamil Nadu",
  MP: "Madhya Pradesh",
};

export const getHubJobs = cache(async (slug: string, limit: number = 15): Promise<HubJob[]> => {
  const hub = getHub(slug);
  if (!hub) return [];

  try {
    const db = getDb();
    if (!db) return [];

    const f = (hub.filters ?? {}) as Record<string, unknown>;
    const like = (v: unknown) => `%${String(v)}%`;
    let filter = sql`TRUE`;

    if (hub.category === "exam" && f.exam) {
      filter = sql`r.name ILIKE ${like(f.exam)}`;
    } else if (hub.category === "state" && f.state) {
      const state = STATE_NAMES[String(f.state)] ?? String(f.state);
      filter = sql`(r.job_location ILIKE ${like(state)} OR o.state ILIKE ${like(state)})`;
    } else if (hub.category === "department" && f.department) {
      filter = sql`(r.name ILIKE ${like(f.department)} OR o.name ILIKE ${like(f.department)})`;
    } else if (hub.category === "qualification" && f.qualification) {
      filter = sql`r.eligibility_criteria ILIKE ${like(f.qualification)}`;
    } else if (hub.category === "salary" && (f.salaryMin || f.salaryMax)) {
      const min = Number(f.salaryMin ?? 0);
      const max = Number(f.salaryMax ?? 100000000);
      filter = sql`EXISTS (SELECT 1 FROM posts p WHERE p.recruitment_id = r.id AND p.salary_max >= ${min} AND p.salary_min <= ${max})`;
    }

    const rows = await db.execute(sql`
      SELECT r.id,
             r.name AS title,
             o.name AS organization,
             r.total_vacancies AS vacancies,
             r.job_location AS location,
             (SELECT MIN(p.salary_min) FROM posts p WHERE p.recruitment_id = r.id) AS salary_min,
             (SELECT MAX(p.salary_max) FROM posts p WHERE p.recruitment_id = r.id) AS salary_max,
             r.application_end_date AS last_date,
             r.slug AS recruitment_slug
        FROM recruitments r
        LEFT JOIN organizations o ON o.id = r.organization_id
       WHERE r.application_end_date >= date_trunc('day', now())
         AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
         AND ${filter}
       ORDER BY r.application_end_date ASC
       LIMIT ${limit}
    `);
    const list = (Array.isArray(rows) ? rows : (rows as { rows?: unknown[] }).rows ?? []) as Array<Record<string, unknown>>;
    return list.map((r) => ({
      id: Number(r.id),
      title: String(r.title),
      organization: (r.organization as string | null) ?? null,
      vacancies: r.vacancies == null ? null : Number(r.vacancies),
      location: (r.location as string | null) ?? null,
      salary_min: r.salary_min == null ? null : Number(r.salary_min),
      salary_max: r.salary_max == null ? null : Number(r.salary_max),
      last_date: r.last_date ? new Date(r.last_date as string) : null,
      recruitment_slug: String(r.recruitment_slug),
    }));
  } catch (error) {
    console.warn(`Failed to fetch jobs for hub ${slug}:`, error);
    return [];
  }
});
