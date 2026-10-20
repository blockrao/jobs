/**
 * Organization URL resolution — one canonical URL per entity.
 *
 * Resolution order for /organizations/{requested}:
 *   1. exact slug of a live (non-merged) organization → canonical, render
 *   2. exact slug of a merged duplicate            → 301 to the survivor
 *   3. organization_aliases (slug words or acronym) → 301 to the canonical slug
 *   4. nothing                                      → 404
 *
 * There is deliberately no prefix/fuzzy matching: a guess that renders as a
 * self-canonical page creates a second URL for the same entity, which is the
 * duplicate-canonical defect found in the 2026-10-20 audit. Short forms
 * (/organizations/upsc, /sbi) must exist as alias rows, which the merge
 * migration and ingest maintain.
 */
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { organizationAliases, organizations } from "@/db/schema";

export type OrganizationRow = typeof organizations.$inferSelect;

export type ResolvedOrganization =
  | { kind: "canonical"; org: OrganizationRow }
  | { kind: "redirect"; slug: string }
  | { kind: "missing" };

/** Alias rows store lower-cased words separated by single spaces. */
export function normalizeAlias(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function resolveOrganization(requested: string): Promise<ResolvedOrganization> {
  const db = getDb();
  const slug = requested.toLowerCase();

  const exact = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
  if (exact.length > 0) {
    const org = exact[0];
    if (org.mergedIntoId == null) return { kind: "canonical", org };
    const survivor = await followMerge(org.mergedIntoId);
    return survivor ? { kind: "redirect", slug: survivor } : { kind: "missing" };
  }

  const alias = await db
    .select({ organizationId: organizationAliases.organizationId })
    .from(organizationAliases)
    .where(eq(organizationAliases.aliasNormalized, normalizeAlias(slug)))
    .limit(1);
  if (alias.length > 0) {
    const survivor = await followMerge(alias[0].organizationId);
    return survivor ? { kind: "redirect", slug: survivor } : { kind: "missing" };
  }

  return { kind: "missing" };
}

/** Walk merged_into_id to the live row (bounded; merges are expected to be one hop). */
async function followMerge(id: number): Promise<string | null> {
  const db = getDb();
  let current = id;
  for (let hop = 0; hop < 5; hop++) {
    const rows = await db
      .select({ slug: organizations.slug, mergedIntoId: organizations.mergedIntoId })
      .from(organizations)
      .where(eq(organizations.id, current))
      .limit(1);
    if (rows.length === 0) return null;
    if (rows[0].mergedIntoId == null) return rows[0].slug;
    current = rows[0].mergedIntoId;
  }
  return null;
}

/** Canonical (non-merged) organizations only, for listings and the sitemap. */
export const liveOrganizationFilter = sql`${organizations.mergedIntoId} IS NULL`;
