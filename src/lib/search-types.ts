/**
 * Types shared by the search queries (server) and the search components
 * (client). Kept free of any server import so a client component can use them
 * without pulling the database client into its bundle.
 */

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

/** A post of the recruitment whose title matched the query. */
export interface MatchingPost {
  title: string;
  /** /jobs/{recruitment-slug}/{post-slug} */
  href: string;
}

/** One search result: a recruitment (SEARCH-003). */
export interface SearchResult {
  /** Recruitment id. */
  id: number;
  /** Recruitment slug. Use `href` for links. */
  slug: string;
  /** Recruitment slug (same as `slug`; kept for existing readers). */
  recruitmentSlug: string | null;
  /**
   * Page for this result: the Post page when the recruitment has exactly one
   * live post, otherwise the recruitment page.
   */
  href: string;
  title: string;
  organizationName: string | null;
  locationRegion: string | null;
  locationCity: string | null;
  eligibility: string | null;
  totalVacancies: number | null;
  /** Last date to apply, ISO 8601. Null when unknown. */
  validThrough: string | null;
  /** ISO 8601. */
  createdAt: string;
  announcementState: string | null;
  closingState: string | null;
  urgencyScore: number | null;
  /** Whole days until the last date, computed at query time. Null when no last date is known. */
  daysToClosing: number | null;
  /** True when the last date has passed or the posting is flagged expired. */
  isClosed: boolean;
  urgencyBadge: string;
  priorityLevel: string;
  /**
   * "full": every search word matched. "partial": nothing matched every word,
   * so these are the closest results. Always "full" without a text query.
   */
  matchQuality: "full" | "partial";
  /** Live posts in this recruitment. */
  postCount: number;
  /** Posts whose title matched the query (at most three), best match first. */
  matchingPosts: MatchingPost[];
  /** How many posts matched in all. */
  matchingPostCount: number;
}
