/**
 * Search & Discovery Queries
 *
 * SEARCH-003 (ledger A-086). The unit of search is the recruitment, with its
 * live posts; one result per recruitment.
 *
 * - In scope: every recruitment that has at least one live post, plus every
 *   recruitment with an approved, published posting (those have no posts yet).
 *   A recruitment needs no posting row to be found.
 * - Matched text: recruitments.search_text, a weighted vector of the
 *   recruitment name, organization, live post titles, and the text of its
 *   approved posting (eligibility, location, description). A row whose stored
 *   vector is still NULL is computed on the fly.
 * - Each word matches as itself, as a known abbreviation's phrase
 *   (SEARCH-001), as the start of a longer word, or as part of the recruitment
 *   name or organization name.
 * - Every word must match. When nothing matches every word, the recruitments
 *   that match the most words are returned instead and marked "partial".
 * - A result lists the posts whose title matched, each linked to its Post
 *   page. A recruitment with exactly one live post links straight to it.
 * - Recruitments past their last date are found by a text search and listed
 *   after the open ones, marked closed. Browsing without a text query shows
 *   open recruitments only (A-067 listing rule).
 * - Facts shown on a card come from the recruitment and, when it has one, its
 *   approved posting. Text of an unapproved posting is never read.
 *
 * Rows are returned in the camelCase shape of SearchResult.
 */

import { getDbV2 } from "@/db";
import { detectLanguage, normalizeHinglishPhonetics } from "@/lib/query-engine/language-detector";
import { extractFilters } from "@/lib/query-engine/filter-extractor";
import { analyzeQuery, latinizeKnownAbbreviations, type QueryTerm } from "@/lib/search-aliases";
import type { MatchingPost, SearchFilters, SearchResult } from "@/lib/search-types";

export type { MatchingPost, SearchFilters, SearchResult } from "@/lib/search-types";

/** A posting the public may see at all. */
const PUBLIC_POSTING =
  "p.review_status = 'APPROVED' AND p.publishing_status IN ('AUTOMATED_VALIDATION_PASS', 'PUBLISHED')";

/**
 * "jobs": one row per recruitment in scope, with the facts a card needs.
 *
 * - p is the recruitment's approved posting (the open one first, then newest).
 * - last_date: the posting's last date, else the recruitment's.
 * - is_closed: flagged expired, or past the last date. Same day rule as the
 *   listing guard (A-067): the last date itself still counts (UTC day) and an
 *   unknown date is not closed.
 * - The announcement and closing states are computed now by the same database
 *   functions the daily refresh uses, so they are never a day stale.
 */
const JOBS_CTE = `
    jobs AS (
      SELECT
        b.*,
        (b.posting_expired IS TRUE OR (b.last_date IS NOT NULL AND b.last_date < now()::date)) AS is_closed,
        (b.last_date::date - CURRENT_DATE) AS days_to_closing,
        get_announcement_state(b.announced_at)::text AS announcement_state,
        get_closing_state(b.last_date::date)::text AS closing_state,
        calculate_urgency_score(b.announced_at, b.last_date::date)::int AS urgency_score
      FROM (
        SELECT
          r.id,
          r.slug,
          r.name AS title,
          r.organization_id,
          o.name AS organization_name,
          COALESCE(r.search_text, build_recruitment_search_text(r)) AS search_vector,
          p.title AS posting_title,
          p.location_region,
          p.location_city,
          p.eligibility,
          COALESCE(r.total_vacancies, p.total_vacancies) AS total_vacancies,
          p.is_expired AS posting_expired,
          COALESCE(p.valid_through, r.application_end_date) AS last_date,
          COALESCE(p.created_at, r.created_at) AS announced_at,
          lp.live_posts,
          lp.only_post_slug
        FROM recruitments r
        LEFT JOIN organizations o ON o.id = r.organization_id
        LEFT JOIN LATERAL (
          SELECT p.title, p.location_region, p.location_city, p.eligibility, p.total_vacancies,
                 p.is_expired, p.valid_through, p.created_at, p.id
          FROM postings p
          WHERE p.inferred_recruitment_id = r.id
            AND ${PUBLIC_POSTING}
          ORDER BY (p.is_expired IS TRUE) ASC, p.created_at DESC, p.id DESC
          LIMIT 1
        ) p ON TRUE
        LEFT JOIN LATERAL (
          SELECT count(*)::int AS live_posts, min(po.slug) AS only_post_slug
          FROM posts po
          WHERE po.recruitment_id = r.id AND po."isLive"
        ) lp ON TRUE
        WHERE lp.live_posts > 0 OR p.id IS NOT NULL
      ) b
    )`;

/** Columns every result row carries; "s" is a row of the jobs CTE (plus scoring). */
const RESULT_COLUMNS = `
      s.id,
      s.slug,
      s.title,
      s.organization_name,
      s.location_region,
      s.location_city,
      s.eligibility,
      s.total_vacancies,
      s.last_date,
      s.announced_at,
      s.announcement_state,
      s.closing_state,
      s.urgency_score,
      s.days_to_closing,
      s.is_closed,
      s.live_posts,
      s.only_post_slug,
      CASE
        WHEN s.is_closed THEN 'Closed'
        WHEN s.announcement_state = 'ANNOUNCED_TODAY' THEN 'Hot'
        WHEN s.closing_state IN ('LAST_DATE_TODAY', 'CLOSING_TOMORROW') THEN 'Urgent'
        WHEN s.closing_state = 'CLOSING_THIS_WEEK' THEN 'This Week'
        WHEN s.announcement_state = 'ANNOUNCED_THIS_WEEK' THEN 'Fresh'
        ELSE 'Open'
      END AS urgency_badge,
      CASE
        WHEN s.is_closed THEN 'NORMAL'
        WHEN s.announcement_state = 'ANNOUNCED_TODAY' AND s.days_to_closing <= 7 THEN 'CRITICAL'
        WHEN s.announcement_state = 'ANNOUNCED_TODAY' THEN 'HOT'
        WHEN s.closing_state IN ('LAST_DATE_TODAY', 'CLOSING_TOMORROW') THEN 'URGENT'
        WHEN s.closing_state = 'CLOSING_THIS_WEEK' THEN 'HIGH'
        WHEN s.announcement_state = 'ANNOUNCED_THIS_WEEK' THEN 'MEDIUM'
        ELSE 'NORMAL'
      END AS priority_level`;

type Row = Record<string, unknown>;
type SqlParam = string | number | string[];

/** How many matching posts a result lists; the rest are counted. */
const MAX_MATCHING_POSTS = 3;

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

function parseMatchingPosts(value: unknown, recruitmentSlug: string): MatchingPost[] {
  let list: unknown = value;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list
    .filter((x): x is { title: unknown; slug: unknown } => Boolean(x) && typeof x === "object")
    .filter((x) => x.title && x.slug)
    .map((x) => ({ title: String(x.title), href: `/jobs/${recruitmentSlug}/${String(x.slug)}` }));
}

/** Database row (snake_case) -> SearchResult (camelCase). */
function mapRow(row: Row): SearchResult {
  const slug = String(row.slug);
  const postCount = toNumberOrNull(row.live_posts) ?? 0;
  const matchingPosts = parseMatchingPosts(row.matching_posts, slug);
  return {
    id: Number(row.id),
    slug,
    recruitmentSlug: slug,
    // The recruitment hub is always the canonical landing page (URL contract 2026-10-20).
    href: `/jobs/${slug}`,
    title: String(row.title ?? ""),
    organizationName: row.organization_name ? String(row.organization_name) : null,
    locationRegion: row.location_region ? String(row.location_region) : null,
    locationCity: row.location_city ? String(row.location_city) : null,
    eligibility: row.eligibility ? String(row.eligibility) : null,
    totalVacancies: toNumberOrNull(row.total_vacancies),
    validThrough: toIsoOrNull(row.last_date),
    createdAt: toIsoOrNull(row.announced_at) ?? "",
    announcementState: row.announcement_state ? String(row.announcement_state) : null,
    closingState: row.closing_state ? String(row.closing_state) : null,
    urgencyScore: toNumberOrNull(row.urgency_score),
    daysToClosing: toNumberOrNull(row.days_to_closing),
    isClosed: row.is_closed === true,
    urgencyBadge: String(row.urgency_badge ?? "Open"),
    priorityLevel: String(row.priority_level ?? "NORMAL"),
    matchQuality: row.partial_match === true ? "partial" : "full",
    postCount,
    matchingPosts,
    matchingPostCount: Math.max(toNumberOrNull(row.matching_post_count) ?? 0, matchingPosts.length),
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
 * never in a search vector, so requiring one would reject every row; a query
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
/** Shortest word matched as part of a name. Shorter ones ("po", "je") would match inside unrelated words. */
const MIN_SUBSTRING_LENGTH = 4;

const WORD_ONLY = /^[\p{L}\p{N}]+$/u;

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** One required query word, as SQL fragments whose placeholders are already bound. */
interface BoundTerm {
  /** tsquery expression: the word, its abbreviation phrase, its prefix form. */
  tsQuery: string;
  /** ILIKE pattern placeholder, or null for a word too short to match as a substring. */
  like: string | null;
}

interface TextMatch {
  terms: BoundTerm[];
  /** ILIKE pattern placeholder for the whole phrase, or null when too short. */
  phraseLike: string | null;
}

/**
 * Bind the words of a query. Returns null when the query has no searchable
 * word (only punctuation).
 */
function bindQuery(query: string, add: (v: SqlParam) => string): TextMatch | null {
  const all = analyzeQuery(query);
  if (all.length === 0) return null;
  const meaningful = all.filter((t) => !STOP_WORDS.has(t.word));
  const words: QueryTerm[] = meaningful.length > 0 ? meaningful : all;

  const terms = words.map((term): BoundTerm => {
    const tsParts = [`plainto_tsquery('english', ${add(term.word)})`];
    if (term.expansion) tsParts.push(`plainto_tsquery('english', ${add(term.expansion)})`);
    if (WORD_ONLY.test(term.word) && term.word.length >= MIN_PREFIX_LENGTH) {
      tsParts.push(`to_tsquery('english', ${add(`${term.word}:*`)})`);
    }
    return {
      tsQuery: `(${tsParts.join(" || ")})`,
      like: term.word.length >= MIN_SUBSTRING_LENGTH ? add(`%${escapeLike(term.word)}%`) : null,
    };
  });

  const phrase = query.trim().replace(/\s+/g, " ");
  return {
    terms,
    phraseLike: phrase.length >= MIN_SUBSTRING_LENGTH ? add(`%${escapeLike(phrase)}%`) : null,
  };
}

/** Does a recruitment (alias j, a row of jobs) match this word? */
function jobTermClause(term: BoundTerm): string {
  const alternatives = [`j.search_vector @@ ${term.tsQuery}`];
  if (term.like) {
    alternatives.push(
      `j.title ILIKE ${term.like}`,
      `j.posting_title ILIKE ${term.like}`,
      `j.organization_name ILIKE ${term.like}`
    );
  }
  return `COALESCE((${alternatives.join(" OR ")}), FALSE)`;
}

/** Does a post title (alias po) match this word? */
function postTermClause(term: BoundTerm): string {
  const alternatives = [`to_tsvector('english', COALESCE(po.title, '')) @@ ${term.tsQuery}`];
  if (term.like) alternatives.push(`po.title ILIKE ${term.like}`);
  return `(${alternatives.join(" OR ")})`;
}

/** Relevance of a recruitment: weighted full-text rank plus name bonuses. */
function jobRankSql(text: TextMatch): string {
  const parts = [`COALESCE(ts_rank(j.search_vector, ${text.terms.map((t) => t.tsQuery).join(" || ")}), 0)`];
  for (const term of text.terms) {
    if (term.like) parts.push(`CASE WHEN j.title ILIKE ${term.like} THEN 0.5 ELSE 0 END`);
  }
  if (text.phraseLike) parts.push(`CASE WHEN j.title ILIKE ${text.phraseLike} THEN 2 ELSE 0 END`);
  return parts.join(" + ");
}

/**
 * Search jobs.
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
 * English search: weighted full-text search with prefix and name matching
 * (see the file header).
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

  const text = query ? bindQuery(query, add) : null;
  // Something was typed but it holds no searchable word (only punctuation):
  // that is "no results", not "browse everything".
  if (query && !text) return [];
  const termCount = text ? text.terms.length : 0;
  const jobClauses = text ? text.terms.map(jobTermClause) : [];

  const conditions: string[] = [];

  // Which recruitments are in scope by lifecycle:
  // - the "Expired" closing filter asks for closed ones;
  // - any other closing filter describes an open one;
  // - a text search finds open and closed (closed listed last);
  // - browsing without a text query shows open ones only.
  if (closingState === "EXPIRED") {
    conditions.push("j.is_closed");
  } else if (closingState) {
    conditions.push("NOT j.is_closed", `j.closing_state = ${add(closingState)}`);
  } else if (!text) {
    conditions.push("NOT j.is_closed");
  }

  if (announcementState) conditions.push(`j.announcement_state = ${add(announcementState)}`);
  if (organizationId) conditions.push(`j.organization_id = ${add(organizationId)}`);
  if (locationRegion) conditions.push(`j.location_region = ${add(locationRegion)}`);
  if (text) conditions.push(`(${jobClauses.join(" OR ")})`);

  const matchedTermsSql = text ? jobClauses.map((c) => `(CASE WHEN ${c} THEN 1 ELSE 0 END)`).join(" + ") : "0";

  const orderBy =
    sortBy === "closing_soonest"
      ? "s.is_closed ASC, s.days_to_closing ASC NULLS LAST, s.id DESC"
      : sortBy === "most_urgent"
        ? "s.is_closed ASC, s.urgency_score DESC NULLS LAST, s.id DESC"
        : sortBy === "relevance" && text
          ? "s.is_closed ASC, s.rank DESC, s.announced_at DESC, s.id DESC"
          : "s.is_closed ASC, s.announced_at DESC, s.id DESC";

  // Posts of the recruitment whose title matched a word: the best
  // MAX_MATCHING_POSTS, and how many matched in all. Computed only for the
  // rows of the returned page.
  const postClauses = text ? text.terms.map(postTermClause) : [];
  const matchingPostsJoin = text
    ? `LEFT JOIN LATERAL (
        SELECT
          json_agg(json_build_object('title', x.title, 'slug', x.slug) ORDER BY x.rn) FILTER (WHERE x.rn <= ${MAX_MATCHING_POSTS}) AS matching_posts,
          count(*)::int AS matching_post_count
        FROM (
          SELECT po.title, po.slug,
                 row_number() OVER (ORDER BY (${postClauses.map((c) => `(CASE WHEN ${c} THEN 1 ELSE 0 END)`).join(" + ")}) DESC, po.id) AS rn
          FROM posts po
          WHERE po.recruitment_id = t.id AND po."isLive"
            AND (${postClauses.join(" OR ")})
        ) x
      ) mp ON TRUE`
    : "LEFT JOIN LATERAL (SELECT NULL::json AS matching_posts, 0 AS matching_post_count) mp ON TRUE";

  // "scored" holds every recruitment that matches at least one word. "page"
  // keeps the best match level reached: all words when any recruitment matches
  // all of them, otherwise the closest ones (partial_match).
  const sqlQuery = `
    WITH ${JOBS_CTE},
    scored AS (
      SELECT j.*,
        ${matchedTermsSql} AS matched_terms,
        ${text ? jobRankSql(text) : "0"} AS rank
      FROM jobs j
      ${conditions.length > 0 ? `WHERE ${conditions.join("\n        AND ")}` : ""}
    ),
    page AS (
      SELECT${RESULT_COLUMNS},
        (s.matched_terms < ${termCount}) AS partial_match,
        row_number() OVER (ORDER BY ${orderBy}) AS position
      FROM scored s
      WHERE s.matched_terms = (SELECT max(matched_terms) FROM scored)
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${offset}
    )
    SELECT t.*, mp.matching_posts, mp.matching_post_count
    FROM page t
    ${matchingPostsJoin}
    ORDER BY t.position
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
 * Uses these to filter open recruitments instead of FTS
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

  // Open recruitments only: this path matches by extracted filters, not by text.
  const conditions: string[] = ["NOT s.is_closed"];

  // Exam filters (match against exam names in the recruitment name)
  if (extracted.exams.length > 0) {
    conditions.push(`s.title ILIKE ANY(${add(extracted.exams.map((e) => `%${e.name}%`))})`);
  }

  // Location filters
  if (extracted.states.length > 0 || locationRegion) {
    const states = extracted.states.map((st) => st.name);
    if (locationRegion) states.push(locationRegion);
    conditions.push(`s.location_region = ANY(${add(states)})`);
  }

  // Qualification filters
  if (extracted.qualifications.length > 0) {
    conditions.push(`s.eligibility ILIKE ANY(${add(extracted.qualifications.map((q) => `%${q.name}%`))})`);
  }

  if (announcementState) conditions.push(`s.announcement_state = ${add(announcementState)}`);
  if (closingState) conditions.push(`s.closing_state = ${add(closingState)}`);
  if (organizationId) conditions.push(`s.organization_id = ${add(organizationId)}`);

  const orderBy =
    sortBy === "closing_soonest"
      ? "s.days_to_closing ASC NULLS LAST, s.id DESC"
      : sortBy === "newest"
        ? "s.announced_at DESC, s.id DESC"
        : sortBy === "most_urgent"
          ? "s.urgency_score DESC NULLS LAST, s.id DESC"
          : "s.urgency_score DESC NULLS LAST, s.announced_at DESC, s.id DESC";

  const sqlQuery = `
    WITH ${JOBS_CTE}
    SELECT${RESULT_COLUMNS}
    FROM jobs s
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
 * One discovery section: open recruitments matching `condition`.
 * A failure returns an empty section (these are widgets, not the search itself).
 */
async function discoverySection(condition: string, orderBy: string, limit: number, label: string): Promise<SearchResult[]> {
  const sqlQuery = `
    WITH ${JOBS_CTE}
    SELECT${RESULT_COLUMNS}
    FROM jobs s
    WHERE NOT s.is_closed
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
    "s.announcement_state = 'ANNOUNCED_TODAY' OR s.closing_state IN ('LAST_DATE_TODAY', 'CLOSING_TOMORROW')",
    "s.urgency_score DESC NULLS LAST, s.announced_at DESC, s.id DESC",
    limit,
    "Urgent opportunities"
  );
}

/**
 * Get recruitments closing this week
 * Sorted by days to closing (soonest first)
 */
export async function getClosingThisWeek(limit = 50): Promise<SearchResult[]> {
  return discoverySection(
    "s.closing_state = 'CLOSING_THIS_WEEK'",
    "s.days_to_closing ASC NULLS LAST, s.announced_at DESC, s.id DESC",
    limit,
    "Closing this week"
  );
}

/**
 * Get newly announced recruitments
 * Announced today or this week, newest first
 */
export async function getNewlyAnnounced(limit = 50): Promise<SearchResult[]> {
  return discoverySection(
    "s.announcement_state IN ('ANNOUNCED_TODAY', 'ANNOUNCED_THIS_WEEK')",
    "s.announced_at DESC, s.id DESC",
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
    const suggestions: Array<{ suggestion: string }> = await db.$client.unsafe(
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

    return suggestions.map((row) => row.suggestion);
  } catch (error) {
    console.error("Search suggestions query error:", error);
    return [];
  }
}
