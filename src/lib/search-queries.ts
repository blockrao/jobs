/**
 * Search & Discovery Queries
 *
 * SEARCH-002 (ledger A-084). What a text search does:
 * - Matches the title, the subject (organization, recruitment, post and
 *   position names) and the body (eligibility, location, description) of a
 *   posting through postings.search_text, a weighted vector (title highest).
 * - Each word matches as itself, as a known abbreviation's phrase
 *   (SEARCH-001), as the start of a longer word ("supervis" finds
 *   "supervisor"), or as part of the title or organization name.
 * - Every word must match. When nothing matches every word, the postings that
 *   match the most words are returned instead and marked "partial".
 * - Postings past their last date are found by a text search and listed after
 *   the open ones, marked closed. Browsing without a text query still shows
 *   open postings only (A-067 listing rule, unchanged).
 * - Filter by announcement freshness and closing urgency; sort by relevance,
 *   newest, closing soonest or most urgent.
 * - Discovery sections: urgent opportunities, closing this week, newly announced.
 *
 * Rows are returned in the camelCase shape of SearchResult; the database's
 * snake_case names never reach the page.
 */

import { getDbV2 } from "@/db";
import { detectLanguage, normalizeHinglishPhonetics } from "@/lib/query-engine/language-detector";
import { extractFilters } from "@/lib/query-engine/filter-extractor";
import { analyzeQuery, latinizeKnownAbbreviations, type QueryTerm } from "@/lib/search-aliases";
import type { SearchFilters, SearchResult } from "@/lib/search-types";

export type { SearchFilters, SearchResult } from "@/lib/search-types";

/** A posting the public may see at all. */
const PUBLIC_GATE =
  "p.review_status = 'APPROVED' AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')";

/**
 * Closed = flagged expired, or past its last date. Same day rule as the listing
 * guard in queries.ts (A-067): the last date itself still counts (UTC day) and
 * an unknown date is not closed.
 */
const IS_CLOSED =
  "(p.is_expired IS TRUE OR (p.valid_through IS NOT NULL AND p.valid_through < now()::date))";

const FROM_POSTINGS = `
    FROM postings p
    LEFT JOIN organizations o ON o.id = p.organization_id
    LEFT JOIN recruitments r ON r.id = p.inferred_recruitment_id`;

/** Columns of one result row. days_to_closing is computed now, not read from the daily-refreshed column. */
const RESULT_COLUMNS = `
      p.id,
      p.slug,
      r.slug AS recruitment_slug,
      p.title,
      o.name AS organization_name,
      p.location_region,
      p.location_city,
      p.eligibility,
      p.total_vacancies,
      p.valid_through,
      p.created_at,
      p.announcement_state,
      p.closing_state,
      p.urgency_score,
      (p.valid_through::date - CURRENT_DATE) AS days_to_closing,
      ${IS_CLOSED} AS is_closed,
      CASE
        WHEN ${IS_CLOSED} THEN 'Closed'
        WHEN p.announcement_state = 'ANNOUNCED_TODAY' THEN 'Hot'
        WHEN p.closing_state IN ('LAST_DATE_TODAY', 'CLOSING_TOMORROW') THEN 'Urgent'
        WHEN p.closing_state = 'CLOSING_THIS_WEEK' THEN 'This Week'
        WHEN p.announcement_state = 'ANNOUNCED_THIS_WEEK' THEN 'Fresh'
        ELSE 'Open'
      END AS urgency_badge,
      CASE
        WHEN ${IS_CLOSED} THEN 'NORMAL'
        WHEN p.announcement_state = 'ANNOUNCED_TODAY' AND p.days_to_closing <= 7 THEN 'CRITICAL'
        WHEN p.announcement_state = 'ANNOUNCED_TODAY' THEN 'HOT'
        WHEN p.closing_state IN ('LAST_DATE_TODAY', 'CLOSING_TOMORROW') THEN 'URGENT'
        WHEN p.closing_state = 'CLOSING_THIS_WEEK' THEN 'HIGH'
        WHEN p.announcement_state = 'ANNOUNCED_THIS_WEEK' THEN 'MEDIUM'
        ELSE 'NORMAL'
      END AS priority_level`;

type Row = Record<string, unknown>;
type SqlParam = string | number | string[];

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Timestamp -> ISO 8601 string. The database client hands timestamps back as
 * Postgres text ("2026-10-08 18:29:59+00"), which not every browser can parse;
 * the page always receives ISO.
 */
function toIsoOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  const text = String(value).trim();
  const m = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d+)?(?:([+-]\d{2})(?::?(\d{2}))?|Z)?$/);
  const iso = m
    ? `${m[1]}T${m[2]}${m[3] ? m[3].slice(0, 4) : ""}${m[4] ? `${m[4]}:${m[5] ?? "00"}` : "Z"}`
    : text;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Database row (snake_case) -> SearchResult (camelCase). */
function mapRow(row: Row): SearchResult {
  const slug = String(row.slug);
  const recruitmentSlug = row.recruitment_slug ? String(row.recruitment_slug) : null;
  return {
    id: Number(row.id),
    slug,
    recruitmentSlug,
    href: `/jobs/${recruitmentSlug ?? slug}`,
    title: String(row.title ?? ""),
    organizationName: row.organization_name ? String(row.organization_name) : null,
    locationRegion: row.location_region ? String(row.location_region) : null,
    locationCity: row.location_city ? String(row.location_city) : null,
    eligibility: row.eligibility ? String(row.eligibility) : null,
    totalVacancies: toNumberOrNull(row.total_vacancies),
    validThrough: toIsoOrNull(row.valid_through),
    createdAt: toIsoOrNull(row.created_at) ?? "",
    announcementState: row.announcement_state ? String(row.announcement_state) : null,
    closingState: row.closing_state ? String(row.closing_state) : null,
    urgencyScore: toNumberOrNull(row.urgency_score),
    daysToClosing: toNumberOrNull(row.days_to_closing),
    isClosed: row.is_closed === true,
    urgencyBadge: String(row.urgency_badge ?? "Open"),
    priorityLevel: String(row.priority_level ?? "NORMAL"),
    matchQuality: row.partial_match === true ? "partial" : "full",
  };
}

async function runQuery(sqlText: string, params: SqlParam[]): Promise<Row[]> {
  const db = getDbV2();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await (db.$client as any).unsafe(sqlText, params)) as Row[];
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/**
 * The stop words of PostgreSQL's 'english' text search configuration. They are
 * never in search_text, so requiring one would reject every posting; a query
 * word on this list is not required to match.
 */
const STOP_WORDS = new Set(
  (
    "i me my myself we our ours ourselves you your yours yourself yourselves he him his himself " +
    "she her hers herself it its itself they them their theirs themselves what which who whom this " +
    "that these those am is are was were be been being have has had having do does did doing a an " +
    "the and but if or because as until while of at by for with about against between into through " +
    "during before after above below to from up down in out on off over under again further then " +
    "once here there when where why how all any both each few more most other some such no nor not " +
    "only own same so than too very s t can will just don should now"
  ).split(" ")
);

/** Shortest word matched as the start of a longer word ("eng" -> "engineer"). */
const MIN_PREFIX_LENGTH = 3;
/** Shortest word matched as part of the title or organization name. Shorter ones ("po", "je") would match inside unrelated words. */
const MIN_SUBSTRING_LENGTH = 4;

const WORD_ONLY = /^[\p{L}\p{N}]+$/u;

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

interface TextMatch {
  /** One boolean SQL expression per required word. */
  termClauses: string[];
  /** Relevance of a row: weighted full-text rank plus title bonuses. */
  rankSql: string;
}

/**
 * SQL for the text part of a search. Returns null when the query has no
 * searchable word.
 */
function buildTextMatch(query: string, add: (v: SqlParam) => string): TextMatch | null {
  const all = analyzeQuery(query);
  if (all.length === 0) return null;
  const meaningful = all.filter((t) => !STOP_WORDS.has(t.word));
  const terms: QueryTerm[] = meaningful.length > 0 ? meaningful : all;

  const termClauses: string[] = [];
  const tsQueries: string[] = [];
  const titleBonuses: string[] = [];

  for (const term of terms) {
    const tsParts = [`plainto_tsquery('english', ${add(term.word)})`];
    if (term.expansion) tsParts.push(`plainto_tsquery('english', ${add(term.expansion)})`);
    if (WORD_ONLY.test(term.word) && term.word.length >= MIN_PREFIX_LENGTH) {
      tsParts.push(`to_tsquery('english', ${add(`${term.word}:*`)})`);
    }
    const tsQuery = `(${tsParts.join(" || ")})`;
    tsQueries.push(tsQuery);

    const alternatives = [`p.search_text @@ ${tsQuery}`];
    if (term.word.length >= MIN_SUBSTRING_LENGTH) {
      const like = add(`%${escapeLike(term.word)}%`);
      alternatives.push(`p.title ILIKE ${like}`, `o.name ILIKE ${like}`);
      titleBonuses.push(`CASE WHEN p.title ILIKE ${like} THEN 0.5 ELSE 0 END`);
    }
    termClauses.push(`(${alternatives.join(" OR ")})`);
  }

  const rankParts = [`COALESCE(ts_rank(p.search_text, ${tsQueries.join(" || ")}), 0)`, ...titleBonuses];
  const phrase = query.trim().replace(/\s+/g, " ");
  if (phrase.length >= MIN_SUBSTRING_LENGTH) {
    rankParts.push(`CASE WHEN p.title ILIKE ${add(`%${escapeLike(phrase)}%`)} THEN 2 ELSE 0 END`);
  }

  return { termClauses, rankSql: rankParts.join(" + ") };
}

/**
 * Search job postings.
 * English and abbreviation queries use full-text search; Hindi and Hinglish
 * queries use the filter-based path. Throws when the database query fails, so
 * the caller can tell a failure from "no results".
 */
export async function searchPostings(filters: SearchFilters): Promise<SearchResult[]> {
  const {
    query: rawQuery,
    announcementState,
    closingState,
    organizationId,
    locationRegion,
    sortBy = "relevance",
  } = filters;
  const limit = clampInt(filters.limit, 50, 1, 100);
  const offset = clampInt(filters.offset, 0, 0, 1_000_000);

  // A query written only in known Devanagari abbreviations (एसएससी) is searched
  // as its Latin form; any other Hindi query keeps the Hindi filter path.
  const query = rawQuery ? latinizeKnownAbbreviations(rawQuery).trim() : rawQuery;

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
 * English search: weighted full-text search with prefix, title and
 * organization matching (see the file header).
 */
async function searchPostingsEnglish(
  query: string | undefined,
  announcementState: string | undefined,
  closingState: string | undefined,
  organizationId: number | undefined,
  locationRegion: string | undefined,
  sortBy: string,
  limit: number,
  offset: number
): Promise<SearchResult[]> {
  // Placeholders are numbered by a counter so any combination of filters lines up
  // with its parameter.
  const params: SqlParam[] = [];
  const add = (v: SqlParam) => {
    params.push(v);
    return `$${params.length}`;
  };

  const text = query ? buildTextMatch(query, add) : null;
  // Something was typed but it holds no searchable word (only punctuation):
  // that is "no results", not "browse everything".
  if (query && !text) return [];
  const termCount = text ? text.termClauses.length : 0;

  const conditions: string[] = [PUBLIC_GATE];

  // Which postings are in scope by lifecycle:
  // - the "Expired" closing filter asks for closed postings;
  // - any other closing filter describes an open posting;
  // - a text search finds open and closed postings (closed listed last);
  // - browsing without a text query shows open postings only.
  if (closingState === "EXPIRED") {
    conditions.push(IS_CLOSED);
  } else if (closingState) {
    conditions.push(`NOT ${IS_CLOSED}`, `p.closing_state = ${add(closingState)}`);
  } else if (!text) {
    conditions.push(`NOT ${IS_CLOSED}`);
  }

  if (announcementState) conditions.push(`p.announcement_state = ${add(announcementState)}`);
  if (organizationId) conditions.push(`p.organization_id = ${add(organizationId)}`);
  if (locationRegion) conditions.push(`p.location_region = ${add(locationRegion)}`);
  if (text) conditions.push(`(${text.termClauses.join(" OR ")})`);

  const matchedTermsSql = text
    ? text.termClauses.map((c) => `(CASE WHEN ${c} THEN 1 ELSE 0 END)`).join(" + ")
    : "0";

  const orderBy =
    sortBy === "closing_soonest"
      ? "s.is_closed ASC, s.days_to_closing ASC NULLS LAST, s.id DESC"
      : sortBy === "most_urgent"
        ? "s.is_closed ASC, s.urgency_score DESC NULLS LAST, s.id DESC"
        : sortBy === "relevance" && text
          ? "s.is_closed ASC, s.rank DESC, s.created_at DESC, s.id DESC"
          : "s.is_closed ASC, s.created_at DESC, s.id DESC";

  // "scored" holds every posting that matches at least one word. The outer
  // query keeps the best match level reached: all words when any posting
  // matches all of them, otherwise the closest postings (partial_match).
  const sqlQuery = `
    WITH scored AS (
      SELECT${RESULT_COLUMNS},
        ${matchedTermsSql} AS matched_terms,
        ${text ? text.rankSql : "0"} AS rank
      ${FROM_POSTINGS}
      WHERE ${conditions.join("\n        AND ")}
    )
    SELECT s.*, (s.matched_terms < ${termCount}) AS partial_match
    FROM scored s
    WHERE s.matched_terms = (SELECT max(matched_terms) FROM scored)
    ORDER BY ${orderBy}
    LIMIT ${limit} OFFSET ${offset}
  `;

  try {
    return (await runQuery(sqlQuery, params)).map(mapRow);
  } catch (error) {
    console.error("Search query error:", error);
    throw new Error("Search query failed", { cause: error });
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
  sortBy: string,
  limit: number,
  offset: number
): Promise<SearchResult[]> {
  // Normalize Hindi/Hinglish query
  let normalizedQuery = query.toLowerCase();
  if (normalizedQuery.match(/[a-z]/i)) {
    // Contains Latin characters - apply Hinglish normalization
    normalizedQuery = normalizeHinglishPhonetics(normalizedQuery);
  }

  // Extract filters from Hindi query
  const extracted = extractFilters(query, normalizedQuery);

  const params: SqlParam[] = [];
  const add = (v: SqlParam) => {
    params.push(v);
    return `$${params.length}`;
  };

  // Open postings only: this path matches by extracted filters, not by text.
  const conditions: string[] = [PUBLIC_GATE, `NOT ${IS_CLOSED}`];

  // Exam filters (match against exam names in the title)
  if (extracted.exams.length > 0) {
    conditions.push(`p.title ILIKE ANY(${add(extracted.exams.map((e) => `%${e.name}%`))})`);
  }

  // Location filters
  if (extracted.states.length > 0 || locationRegion) {
    const states = extracted.states.map((s) => s.name);
    if (locationRegion) states.push(locationRegion);
    conditions.push(`p.location_region = ANY(${add(states)})`);
  }

  // Qualification filters
  if (extracted.qualifications.length > 0) {
    conditions.push(`p.eligibility ILIKE ANY(${add(extracted.qualifications.map((q) => `%${q.name}%`))})`);
  }

  if (announcementState) conditions.push(`p.announcement_state = ${add(announcementState)}`);
  if (closingState) conditions.push(`p.closing_state = ${add(closingState)}`);
  if (organizationId) conditions.push(`p.organization_id = ${add(organizationId)}`);

  const orderBy =
    sortBy === "closing_soonest"
      ? "days_to_closing ASC NULLS LAST"
      : sortBy === "newest"
        ? "p.created_at DESC"
        : sortBy === "most_urgent"
          ? "p.urgency_score DESC NULLS LAST"
          : "p.urgency_score DESC NULLS LAST, p.created_at DESC";

  const sqlQuery = `
    SELECT${RESULT_COLUMNS}
    ${FROM_POSTINGS}
    WHERE ${conditions.join(" AND ")}
    ORDER BY ${orderBy}
    LIMIT ${limit} OFFSET ${offset}
  `;

  try {
    return (await runQuery(sqlQuery, params)).map(mapRow);
  } catch (error) {
    console.error("Hindi search query error:", error);
    throw new Error("Search query failed", { cause: error });
  }
}

/**
 * One discovery section: open public postings matching `condition`.
 * A failure returns an empty section (these are widgets, not the search itself).
 */
async function discoverySection(condition: string, orderBy: string, limit: number, label: string): Promise<SearchResult[]> {
  const sqlQuery = `
    SELECT${RESULT_COLUMNS}
    ${FROM_POSTINGS}
    WHERE ${PUBLIC_GATE}
      AND NOT ${IS_CLOSED}
      AND (${condition})
    ORDER BY ${orderBy}
    LIMIT ${clampInt(limit, 50, 1, 100)}
  `;
  try {
    return (await runQuery(sqlQuery, [])).map(mapRow);
  } catch (error) {
    console.error(`${label} query error:`, error);
    return [];
  }
}

/**
 * Get urgent opportunities
 * Announced today OR closing today/tomorrow
 */
export async function getUrgentOpportunities(limit = 50): Promise<SearchResult[]> {
  return discoverySection(
    "p.announcement_state = 'ANNOUNCED_TODAY' OR p.closing_state IN ('LAST_DATE_TODAY', 'CLOSING_TOMORROW')",
    "p.urgency_score DESC NULLS LAST, p.created_at DESC",
    limit,
    "Urgent opportunities"
  );
}

/**
 * Get postings closing this week
 * Sorted by days to closing (soonest first)
 */
export async function getClosingThisWeek(limit = 50): Promise<SearchResult[]> {
  return discoverySection(
    "p.closing_state = 'CLOSING_THIS_WEEK'",
    "days_to_closing ASC NULLS LAST, p.created_at DESC",
    limit,
    "Closing this week"
  );
}

/**
 * Get newly announced postings
 * Announced today or this week, sorted by created_at DESC
 */
export async function getNewlyAnnounced(limit = 50): Promise<SearchResult[]> {
  return discoverySection(
    "p.announcement_state IN ('ANNOUNCED_TODAY', 'ANNOUNCED_THIS_WEEK')",
    "p.created_at DESC",
    limit,
    "Newly announced"
  );
}

/**
 * Get search suggestions for autocomplete
 * Returns unique organization names and position names matching prefix
 */
export async function getSearchSuggestions(prefix: string, limit = 10): Promise<string[]> {
  const db = getDbV2();
  if (!db) return [];

  try {
    const suggestions = await (db.$client as any).unsafe(
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
