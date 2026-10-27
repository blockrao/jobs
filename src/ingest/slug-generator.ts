/**
 * Canonical slug generation for recruitments.
 *
 * New recruitments use readable, descriptive slugs. Existing sequential
 * org{id}-{year}-{sequence} slugs remain valid for legacy rows and are not
 * rewritten by this helper.
 */
import { and, eq } from "drizzle-orm";
import type { getDb } from "../db";
import { recruitments } from "../db/schema";

type Db = ReturnType<typeof getDb>;

export const RECRUITMENT_SLUG_RE = /^org(\d+)-(\d{4})-(\d{4})$/;

export function buildRecruitmentSlug(organizationId: number, year: number, sequence: number): string {
  return `org${organizationId}-${year}-${String(sequence).padStart(4, "0")}`;
}

/** Next free slug for an organization + year, using the same rule as the DB trigger. */
export async function generateSequentialSlug(
  db: Db,
  organizationId: number,
  year: number,
): Promise<string> {
  const existing = await db
    .select({ slug: recruitments.slug })
    .from(recruitments)
    .where(and(eq(recruitments.organizationId, organizationId), eq(recruitments.year, year)));

  let maxSeq = 0;
  for (const { slug } of existing) {
    const m = /-(\d{4})$/.exec(slug ?? "");
    if (m) maxSeq = Math.max(maxSeq, Number(m[1]));
  }
  return buildRecruitmentSlug(organizationId, year, maxSeq + 1);
}

/** True when the slug matches the live recruitment slug format. */
export function isSequentialSlug(slug: string): boolean {
  return RECRUITMENT_SLUG_RE.test(slug);
}

/** Parse a recruitment slug into its parts, or null when it is not in the live format. */
export function parseSequentialSlug(slug: string): {
  organizationId: number;
  year: number;
  sequence: number;
} | null {
  const m = RECRUITMENT_SLUG_RE.exec(slug);
  if (!m) return null;
  return { organizationId: Number(m[1]), year: Number(m[2]), sequence: Number(m[3]) };
}
