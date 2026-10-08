/**
 * Slug generation for recruitments using semantic, sequential format:
 * {org-slug}-{year}-{2-digit-sequential-number}
 *
 * Examples: upsc-2026-01, sbi-2026-03, ibps-2026-02
 */

import { eq, and } from "drizzle-orm";
import type { getDb } from "../db";
import { recruitments, organizations } from "../db/schema";

type Db = ReturnType<typeof getDb>;

/**
 * Generate a semantic, sequential slug for a new recruitment.
 * Format: {org-slug}-{year}-{2-digit-sequential-number}
 *
 * This ensures:
 * - Human-readable slugs (users can understand what year/which recruitment)
 * - Uniqueness within organization-year scope
 * - Professional appearance for a government jobs site
 */
export async function generateSequentialSlug(
  db: Db,
  organizationId: number,
  year: number,
): Promise<string | null> {
  // Get the organization slug
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!org) return null;

  // Count existing recruitments for this org-year combo
  const existing = await db.query.recruitments.findMany({
    where: and(
      eq(recruitments.organizationId, organizationId),
      eq(recruitments.year, year),
    ),
  });

  // Next sequence number (1-indexed, padded to 2 digits: 01, 02, ..., 99)
  const nextSequence = existing.length + 1;
  const sequencePadded = String(nextSequence).padStart(2, "0");

  return `${org.slug}-${year}-${sequencePadded}`;
}

/**
 * Verify that a slug matches the new sequential format.
 * Pattern: {org-slug}-{year}-{2-digit-number}
 * Example: upsc-2026-01
 */
export function isSequentialSlug(slug: string): boolean {
  return /^[a-z0-9]+-\d{4}-\d{2}$/.test(slug);
}

/**
 * Parse a sequential slug into its components.
 * Returns null if slug doesn't match the format.
 */
export function parseSequentialSlug(slug: string): {
  orgSlug: string;
  year: number;
  sequence: number;
} | null {
  const match = slug.match(/^([a-z0-9]+)-(\d{4})-(\d{2})$/);
  if (!match) return null;

  return {
    orgSlug: match[1],
    year: parseInt(match[2], 10),
    sequence: parseInt(match[3], 10),
  };
}
