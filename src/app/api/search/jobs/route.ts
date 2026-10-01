/**
 * API Route: Search Jobs
 *
 * Unified search endpoint supporting:
 * - Full-text search (query parameter)
 * - Announcement freshness filtering
 * - Closing urgency filtering
 * - Organization filtering
 * - Location filtering
 * - Multiple sort options
 * - Pagination (limit/offset)
 *
 * P1 #11-12: Search as first-class feature + strong job filters
 *
 * Query Parameters:
 * - q: Full-text search query (searches title, org, position, eligibility, location)
 * - announcement: ANNOUNCED_TODAY | ANNOUNCED_THIS_WEEK | ANNOUNCED_THIS_MONTH | OLDER
 * - closing: LAST_DATE_TODAY | CLOSING_TOMORROW | CLOSING_THIS_WEEK | CLOSING_SOON | NO_DEADLINE | EXPIRED
 * - org: Organization ID (numeric)
 * - location: Location region/city filter
 * - sort: relevance (default if query present) | newest | closing_soonest | most_urgent
 * - limit: Results per page (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  searchPostings,
  getUrgentOpportunities,
  getClosingThisWeek,
  getNewlyAnnounced,
  SearchFilters,
} from "@/lib/search-queries";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const query = searchParams.get("q")?.trim();
    const announcementState = searchParams.get("announcement") as
      | "ANNOUNCED_TODAY"
      | "ANNOUNCED_THIS_WEEK"
      | "ANNOUNCED_THIS_MONTH"
      | "OLDER"
      | null;
    const closingState = searchParams.get("closing") as
      | "LAST_DATE_TODAY"
      | "CLOSING_TOMORROW"
      | "CLOSING_THIS_WEEK"
      | "CLOSING_SOON"
      | "NO_DEADLINE"
      | "EXPIRED"
      | null;
    const organizationIdStr = searchParams.get("org");
    const locationRegion = searchParams.get("location")?.trim();
    const sortBy = (searchParams.get("sort") as
      | "relevance"
      | "newest"
      | "closing_soonest"
      | "most_urgent"
      | null) || "relevance";

    // Parse pagination
    let limit = 50;
    let offset = 0;

    const limitStr = searchParams.get("limit");
    if (limitStr) {
      const parsed = parseInt(limitStr, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
        limit = parsed;
      }
    }

    const offsetStr = searchParams.get("offset");
    if (offsetStr) {
      const parsed = parseInt(offsetStr, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        offset = parsed;
      }
    }

    // Parse organizationId
    let organizationId: number | undefined;
    if (organizationIdStr) {
      const parsed = parseInt(organizationIdStr, 10);
      if (!isNaN(parsed) && parsed > 0) {
        organizationId = parsed;
      }
    }

    // Build search filters
    const filters: SearchFilters = {
      query: query || undefined,
      announcementState: announcementState || undefined,
      closingState: closingState || undefined,
      organizationId,
      locationRegion: locationRegion || undefined,
      sortBy,
      limit,
      offset,
    };

    // Execute search
    const results = await searchPostings(filters);

    // Build response with pagination metadata
    const response = {
      success: true,
      data: results,
      pagination: {
        limit,
        offset,
        count: results.length,
        hasMore: results.length === limit, // Next page exists if we got full page
      },
      filters: {
        query: query || null,
        announcementState: announcementState || null,
        closingState: closingState || null,
        organizationId: organizationId || null,
        locationRegion: locationRegion || null,
        sortBy,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for discovery sections
 * Returns urgent opportunities, closing this week, and newly announced in one request
 * Useful for homepage or dashboard widgets
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const limitStr = body.limit || "50";
    const limit = Math.min(Math.max(parseInt(limitStr, 10) || 50, 1), 100);

    const [urgentOpportunities, closingThisWeek, newlyAnnounced] =
      await Promise.all([
        getUrgentOpportunities(limit),
        getClosingThisWeek(limit),
        getNewlyAnnounced(limit),
      ]);

    const response = {
      success: true,
      discovery: {
        urgentOpportunities: {
          label: "Urgent Opportunities",
          description: "Announced today or closing today/tomorrow",
          count: urgentOpportunities.length,
          results: urgentOpportunities,
        },
        closingThisWeek: {
          label: "Closing This Week",
          description: "Application deadlines within 7 days",
          count: closingThisWeek.length,
          results: closingThisWeek,
        },
        newlyAnnounced: {
          label: "Newly Announced",
          description: "Just posted or announced this week",
          count: newlyAnnounced.length,
          results: newlyAnnounced,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Discovery error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Discovery failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
