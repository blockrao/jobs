/**
 * Search & Discovery Queries
 *
 * Implements full-text search and urgency-based filtering/sorting:
 * - Full-text search on title, organization, position, eligibility, location
 * - Filter by announcement freshness (ANNOUNCED_TODAY, THIS_WEEK, THIS_MONTH, OLDER)
 * - Filter by closing urgency (LAST_DATE_TODAY, CLOSING_TOMORROW, THIS_WEEK, SOON, NO_DEADLINE, EXPIRED)
 * - Sort by: relevance (ts_rank), newest (created_at), closing_soonest (days_to_closing), most_urgent (urgency_score)
 * - Discovery sections: urgent_opportunities, closing_this_week, newly_announced
 *
 * P1 #11-12: Search as first-class feature + strong job filters
 */

import { getDbV2 } from "@/db";
import { detectLanguage, normalizeHinglishPhonetics } from "@/lib/query-engine/language-detector";
import { extractFilters } from "@/lib/query-engine/filter-extractor";

export interface SearchFilters {
  query?: string;
  announcementState?: "ANNOUNCED_TODAY" | "ANNOUNCED_THIS_WEEK" | "ANNOUNCED_THIS_MONTH" | "OLDER";
  closingState?: "LAST_DATE_TODAY" | "CLOSING_TOMORROW" | "CLOSING_THIS_WEEK" | "CLOSING_SOON" | "NO_DEADLINE" | "EXPIRED";
  organizationId?: number;
  locationRegion?: string;
  sortBy?: "relevance" | "newest" | "closing_soonest" | "most_urgent";
  limit?: number;
  offset?: number;
  language?: "english" | "hindi" | "hinglish";
}

export interface SearchResult {
  id: number;
  slug: string;
  title: string;
  organizationName: string;
  locationRegion: string | null;
  locationCity: string | null;
  eligibility: string | null;
  totalVacancies: number | null;
  validThrough: Date | null;
  createdAt: Date;
  announcementState: string | null;
  closingState: string | null;
  urgencyScore: number | null;
  daysToClosing: number | null;
  urgencyBadge: string;
  priorityLevel: string;
}

/**
 * Full-text search for job postings
 * Supports both English (FTS) and Hindi (filter-based)
 * Searches across title, organization, position, eligibility, and location
 */
export async function searchPostings(filters: SearchFilters): Promise<SearchResult[]> {
  const db = getDbV2();
  if (!db) return [];

  const {
    query,
    announcementState,
    closingState,
    organizationId,
    locationRegion,
    sortBy = "relevance",
    limit = 50,
    offset = 0,
  } = filters;

  // Detect language if not specified
  let language = filters.language;
  if (!language && query) {
    const detected = detectLanguage(query);
    language = detected.detected as "english" | "hindi" | "hinglish";
  }

  // For Hindi queries, extract filters and use filter-based search
  if (language === "hindi" || language === "hinglish") {
    return await searchPostingsHindi(
      query || "",
      announcementState,
      closingState,
      organizationId,
      locationRegion,
      sortBy,
      limit,
      offset
    );
  }

  // English FTS (original implementation)
  return await searchPostingsEnglish(
    query,
    announcementState,
    closingState,
    organizationId,
    locationRegion,
    sortBy,
    limit,
    offset
  );
}

/**
 * English full-text search using PostgreSQL FTS
 */
async function searchPostingsEnglish(
  query: string | undefined,
  announcementState: string | undefined,
  closingState: string | undefined,
  organizationId: number | undefined,
  locationRegion: string | undefined,
  sortBy: string = "relevance",
  limit: number = 50,
  offset: number = 0
): Promise<SearchResult[]> {
  const db = getDbV2();
  if (!db) return [];

  const params: any[] = [];
  if (query) params.push(query);
  if (announcementState) params.push(announcementState);
  if (closingState) params.push(closingState);
  if (organizationId) params.push(organizationId);
  if (locationRegion) params.push(locationRegion);

  const sqlQuery = `
    SELECT
      p.id,
      p.slug,
      p.title,
      o.name as organization_name,
      p.location_region,
      p.location_city,
      p.eligibility,
      p.total_vacancies,
      p.valid_through,
      p.created_at,
      p.announcement_state,
      p.closing_state,
      p.urgency_score,
      p.days_to_closing,
      CASE
        WHEN p.announcement_state = 'ANNOUNCED_TODAY' THEN 'Hot'
        WHEN p.closing_state IN ('LAST_DATE_TODAY', 'CLOSING_TOMORROW') THEN 'Urgent'
        WHEN p.closing_state = 'CLOSING_THIS_WEEK' THEN 'This Week'
        WHEN p.announcement_state = 'ANNOUNCED_THIS_WEEK' THEN 'Fresh'
        ELSE 'Open'
      END as urgency_badge,
      CASE
        WHEN p.announcement_state = 'ANNOUNCED_TODAY' AND p.days_to_closing <= 7 THEN 'CRITICAL'
        WHEN p.announcement_state = 'ANNOUNCED_TODAY' THEN 'HOT'
        WHEN p.closing_state IN ('LAST_DATE_TODAY', 'CLOSING_TOMORROW') THEN 'URGENT'
        WHEN p.closing_state = 'CLOSING_THIS_WEEK' THEN 'HIGH'
        WHEN p.announcement_state = 'ANNOUNCED_THIS_WEEK' THEN 'MEDIUM'
        ELSE 'NORMAL'
      END as priority_level
    FROM postings p
    LEFT JOIN organizations o ON o.id = p.organization_id
    WHERE p.review_status = 'APPROVED'
      AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')
      AND p.is_expired = FALSE
      ${query ? `AND p.search_text @@ plainto_tsquery('english', $1)` : ""}
      ${announcementState ? `AND p.announcement_state = $${query ? 2 : 1}` : ""}
      ${closingState ? `AND p.closing_state = $${query ? 3 : announcementState ? 2 : 1}` : ""}
      ${organizationId ? `AND p.organization_id = $${query ? 4 : announcementState ? 3 : closingState ? 2 : 1}` : ""}
      ${locationRegion ? `AND p.location_region = $${query ? 5 : announcementState ? 4 : closingState ? 3 : organizationId ? 2 : 1}` : ""}
    ORDER BY
      ${
        sortBy === "relevance" && query
          ? "ts_rank(p.search_text, plainto_tsquery('english', $1)) DESC"
          : sortBy === "closing_soonest"
            ? "p.days_to_closing ASC NULLS LAST"
            : sortBy === "most_urgent"
              ? "p.urgency_score DESC"
              : "p.created_at DESC"
      }
    LIMIT ${limit} OFFSET ${offset}
  `;

  try {
    const results = await (db.$client as any)(sqlQuery, params);
    return results as SearchResult[];
  } catch (error) {
    console.error("Search query error:", error);
    return [];
  }
}

/**
 * Hindi search using filter-based approach
 * Extracts exams, locations, qualifications from Hindi query
 * Uses these to filter postings instead of FTS
 */
async function searchPostingsHindi(
  query: string,
  announcementState: string | undefined,
  closingState: string | undefined,
  organizationId: number | undefined,
  locationRegion: string | undefined,
  sortBy: string = "relevance",
  limit: number = 50,
  offset: number = 0
): Promise<SearchResult[]> {
  const db = getDbV2();
  if (!db) return [];

  // Normalize Hindi/Hinglish query
  let normalizedQuery = query.toLowerCase();
  if (normalizedQuery.match(/[a-z]/i)) {
    // Contains Latin characters - apply Hinglish normalization
    normalizedQuery = normalizeHinglishPhonetics(normalizedQuery);
  }

  // Extract filters from Hindi query
  const extracted = extractFilters(query, normalizedQuery);

  // Build WHERE conditions based on extracted filters
  const conditions: string[] = [
    "p.review_status = 'APPROVED'",
    "p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')",
    "p.is_expired = FALSE",
  ];

  const params: any[] = [];
  let paramCount = 1;

  // Add exam filters (match against exam names in postings via exam_ids)
  if (extracted.exams.length > 0) {
    const examNames = extracted.exams.map((e) => e.name).join("|");
    conditions.push(`p.title ILIKE ANY($${paramCount})`);
    params.push(extracted.exams.map((e) => `%${e.name}%`));
    paramCount++;
  }

  // Add location filters
  if (extracted.states.length > 0 || locationRegion) {
    const states = extracted.states.map((s) => s.name);
    if (locationRegion) states.push(locationRegion);
    conditions.push(`p.location_region = ANY($${paramCount})`);
    params.push(states);
    paramCount++;
  }

  // Add qualification filters
  if (extracted.qualifications.length > 0) {
    conditions.push(
      `p.eligibility ILIKE ANY($${paramCount})`
    );
    params.push(
      extracted.qualifications.map((q) => `%${q.name}%`)
    );
    paramCount++;
  }

  // Add announcement state filter
  if (announcementState) {
    conditions.push(`p.announcement_state = $${paramCount}`);
    params.push(announcementState);
    paramCount++;
  }

  // Add closing state filter
  if (closingState) {
    conditions.push(`p.closing_state = $${paramCount}`);
    params.push(closingState);
    paramCount++;
  }

  // Add organization filter
  if (organizationId) {
    conditions.push(`p.organization_id = $${paramCount}`);
    params.push(organizationId);
    paramCount++;
  }

  // Build SQL query
  const sqlQuery = `
    SELECT
      p.id,
      p.slug,
      p.title,
      o.name as organization_name,
      p.location_region,
      p.location_city,
      p.eligibility,
      p.total_vacancies,
      p.valid_through,
      p.created_at,
      p.announcement_state,
      p.closing_state,
      p.urgency_score,
      p.days_to_closing,
      CASE
        WHEN p.announcement_state = 'ANNOUNCED_TODAY' THEN 'Hot'
        WHEN p.closing_state IN ('LAST_DATE_TODAY', 'CLOSING_TOMORROW') THEN 'Urgent'
        WHEN p.closing_state = 'CLOSING_THIS_WEEK' THEN 'This Week'
        WHEN p.announcement_state = 'ANNOUNCED_THIS_WEEK' THEN 'Fresh'
        ELSE 'Open'
      END as urgency_badge,
      CASE
        WHEN p.announcement_state = 'ANNOUNCED_TODAY' AND p.days_to_closing <= 7 THEN 'CRITICAL'
        WHEN p.announcement_state = 'ANNOUNCED_TODAY' THEN 'HOT'
        WHEN p.closing_state IN ('LAST_DATE_TODAY', 'CLOSING_TOMORROW') THEN 'URGENT'
        WHEN p.closing_state = 'CLOSING_THIS_WEEK' THEN 'HIGH'
        WHEN p.announcement_state = 'ANNOUNCED_THIS_WEEK' THEN 'MEDIUM'
        ELSE 'NORMAL'
      END as priority_level
    FROM postings p
    LEFT JOIN organizations o ON o.id = p.organization_id
    WHERE ${conditions.join(" AND ")}
    ORDER BY
      ${
        sortBy === "relevance"
          ? "p.urgency_score DESC, p.created_at DESC"
          : sortBy === "closing_soonest"
            ? "p.days_to_closing ASC NULLS LAST"
            : sortBy === "most_urgent"
              ? "p.urgency_score DESC"
              : "p.created_at DESC"
      }
    LIMIT ${limit} OFFSET ${offset}
  `;

  try {
    const results = await (db.$client as any)(sqlQuery, params);
    return results as SearchResult[];
  } catch (error) {
    console.error("Hindi search query error:", error);
    return [];
  }
}

/**
 * Get urgent opportunities
 * Announced today OR closing today/tomorrow
 */
export async function getUrgentOpportunities(limit = 50): Promise<SearchResult[]> {
  const db = getDbV2();
  if (!db) return [];

  try {
    const results = await (db.$client as any)(
      `SELECT * FROM urgent_opportunities LIMIT $1`,
      [limit]
    );
    return results as SearchResult[];
  } catch (error) {
    console.error("Urgent opportunities query error:", error);
    return [];
  }
}

/**
 * Get postings closing this week
 * Sorted by days_to_closing (soonest first)
 */
export async function getClosingThisWeek(limit = 50): Promise<SearchResult[]> {
  const db = getDbV2();
  if (!db) return [];

  try {
    const results = await (db.$client as any)(
      `SELECT * FROM closing_this_week LIMIT $1`,
      [limit]
    );
    return results as SearchResult[];
  } catch (error) {
    console.error("Closing this week query error:", error);
    return [];
  }
}

/**
 * Get newly announced postings
 * Announced today or this week, sorted by created_at DESC
 */
export async function getNewlyAnnounced(limit = 50): Promise<SearchResult[]> {
  const db = getDbV2();
  if (!db) return [];

  try {
    const results = await (db.$client as any)(
      `SELECT * FROM newly_announced LIMIT $1`,
      [limit]
    );
    return results as SearchResult[];
  } catch (error) {
    console.error("Newly announced query error:", error);
    return [];
  }
}

/**
 * Get search suggestions for autocomplete
 * Returns unique organization names and position names matching prefix
 */
export async function getSearchSuggestions(prefix: string, limit = 10): Promise<string[]> {
  const db = getDbV2();
  if (!db) return [];

  try {
    const suggestions = await (db.$client as any)(
      `
        SELECT DISTINCT suggestion FROM (
          SELECT o.name as suggestion
          FROM postings p
          LEFT JOIN organizations o ON o.id = p.organization_id
          WHERE p.review_status = 'APPROVED'
            AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')
            AND p.is_expired = FALSE
            AND o.name ILIKE $1
          UNION
          SELECT pos.name as suggestion
          FROM postings p
          LEFT JOIN posts pos_rel ON pos_rel.id = p.inferred_post_id
          LEFT JOIN positions pos ON pos.id = pos_rel.position_id
          WHERE p.review_status = 'APPROVED'
            AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')
            AND p.is_expired = FALSE
            AND pos.name ILIKE $1
        ) suggestions
        LIMIT $2
      `,
      [`${prefix}%`, limit]
    );

    return suggestions.map((row: any) => row.suggestion);
  } catch (error) {
    console.error("Search suggestions query error:", error);
    return [];
  }
}
