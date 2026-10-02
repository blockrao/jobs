/**
 * API Route: Search Suggestions (autocomplete)
 *
 * Backs the suggestion dropdown in src/components/JobSearch.tsx. That
 * dropdown's UI and state (suggestions/showSuggestions) already existed,
 * but there was no endpoint to populate them from — getSearchSuggestions()
 * in @/lib/search-queries was fully implemented but never called from
 * anywhere, so the dropdown could never show anything. This route wires
 * the two together.
 *
 * Query Parameters:
 * - q: prefix to match organization/position names against (required,
 *   min 3 chars — matches the component's own >2-char trigger)
 * - limit: max suggestions to return (default 10, max 20)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSearchSuggestions } from "@/lib/search-queries";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimit(clientIp, 100, 60000);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again in a moment.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              (rateLimitResult.resetTime - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const prefix = searchParams.get("q")?.trim() || "";

    if (prefix.length < 3) {
      return NextResponse.json({ success: true, data: [] });
    }

    let limit = 10;
    const limitStr = searchParams.get("limit");
    if (limitStr) {
      const parsed = parseInt(limitStr, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 20) {
        limit = parsed;
      }
    }

    const suggestions = await getSearchSuggestions(prefix, limit);

    return NextResponse.json({ success: true, data: suggestions });
  } catch (error) {
    console.error("Search suggestions error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Suggestions failed",
        message: error instanceof Error ? error.message : "Unknown error",
        data: [],
      },
      { status: 500 }
    );
  }
}
