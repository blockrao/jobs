/**
 * Get semantically grouped related posts for a leaf page
 * Groups: organization, location, role
 */

import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export interface RelatedPost {
  id: string | number;
  title: string;
  slug: string;
  recruitment_slug: string;
  status?: string;
  application_end_date?: Date | string | null;
}

export interface RelatedPostsGrouped {
  byOrganization: RelatedPost[];
  byLocation: RelatedPost[];
  byRole: RelatedPost[];
}

export async function getRelatedPostsGrouped(
  recruitmentId: string,
  currentPostSlug: string,
  currentPostTitle: string,
  currentOrgId?: string,
  currentLocation?: string,
  limit: number = 3
): Promise<RelatedPostsGrouped> {
  const db = getDb();

  // Group 1: Same organization (3 posts)
  let byOrgData: RelatedPost[] = [];
  if (currentOrgId) {
    try {
      const byOrgResult = await db.execute(sql`
        SELECT p.id, p.title, p.slug, r.slug as recruitment_slug,
               r.status, r.application_end_date
        FROM posts p
        JOIN recruitments r ON r.id = p.recruitment_id
        WHERE r.organization_id = ${currentOrgId}
          AND p.recruitment_id != ${recruitmentId}
          AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
          AND (
            COALESCE(r.source_discovery_origin, '') <> 'AGGREGATOR_DISCOVERED'
            OR (
              r.verification_status = 'VERIFIED'
              AND r.official_link_source = 'MANUAL_VERIFIED'
              AND r.metadata -> 'source_provenance' -> 'authority_review' ->> 'status' = 'VERIFIED'
              AND r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' = 'VERIFIED'
              AND r.application_end_date IS NOT NULL
            )
          )
        ORDER BY r.application_end_date DESC NULLS LAST, r.id DESC
        LIMIT ${limit}
      `);
      byOrgData = (Array.isArray(byOrgResult) ? byOrgResult : []) as RelatedPost[];
    } catch (e) {
      byOrgData = [];
    }
  }

  // Group 2: Same location (3 posts)
  let byLocationData: RelatedPost[] = [];
  if (currentLocation) {
    try {
      const byLocationResult = await db.execute(sql`
        SELECT p.id, p.title, p.slug, r.slug as recruitment_slug,
               r.status, r.application_end_date
        FROM posts p
        JOIN recruitments r ON r.id = p.recruitment_id
        WHERE p.location_state = ${currentLocation}
          AND p.recruitment_id != ${recruitmentId}
          AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
          AND (
            COALESCE(r.source_discovery_origin, '') <> 'AGGREGATOR_DISCOVERED'
            OR (
              r.verification_status = 'VERIFIED'
              AND r.official_link_source = 'MANUAL_VERIFIED'
              AND r.metadata -> 'source_provenance' -> 'authority_review' ->> 'status' = 'VERIFIED'
              AND r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' = 'VERIFIED'
              AND r.application_end_date IS NOT NULL
            )
          )
        ORDER BY r.application_end_date DESC NULLS LAST, r.id DESC
        LIMIT ${limit}
      `);
      byLocationData = (Array.isArray(byLocationResult) ? byLocationResult : []) as RelatedPost[];
    } catch (e) {
      byLocationData = [];
    }
  }

  // Group 3: Similar role (infer from post title keyword matching)
  // Extract first 1-2 words from title as role keyword (e.g., "SSC CGL", "UPSC CAPF")
  let byRoleData: RelatedPost[] = [];
  const roleKeywords = currentPostTitle
    .split(/\s+/)
    .slice(0, 2)
    .join(" ")
    .toLowerCase();

  if (roleKeywords.length > 2) {
    try {
      const byRoleResult = await db.execute(sql`
        SELECT p.id, p.title, p.slug, r.slug as recruitment_slug,
               r.status, r.application_end_date
        FROM posts p
        JOIN recruitments r ON r.id = p.recruitment_id
        WHERE LOWER(p.title) LIKE ${`%${roleKeywords}%`}
          AND p.recruitment_id != ${recruitmentId}
          AND r.verification_status IS DISTINCT FROM 'QUARANTINED'
          AND (
            COALESCE(r.source_discovery_origin, '') <> 'AGGREGATOR_DISCOVERED'
            OR (
              r.verification_status = 'VERIFIED'
              AND r.official_link_source = 'MANUAL_VERIFIED'
              AND r.metadata -> 'source_provenance' -> 'authority_review' ->> 'status' = 'VERIFIED'
              AND r.metadata -> 'source_provenance' -> 'fact_review' ->> 'status' = 'VERIFIED'
              AND r.application_end_date IS NOT NULL
            )
          )
        ORDER BY r.application_end_date DESC NULLS LAST, r.id DESC
        LIMIT ${limit}
      `);
      byRoleData = (Array.isArray(byRoleResult) ? byRoleResult : []) as RelatedPost[];
    } catch (e) {
      byRoleData = [];
    }
  }

  return {
    byOrganization: byOrgData,
    byLocation: byLocationData,
    byRole: byRoleData,
  };
}
