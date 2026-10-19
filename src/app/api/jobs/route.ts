/**
 * API Route: List All Jobs
 *
 * Returns all active jobs as JSON. Supports pagination and basic filtering.
 * Phase 1 P0: Simple, fast JSON API for AEO (Answer Engine Optimization)
 *
 * Query Parameters:
 * - limit: Results per page (default 50, max 100)
 * - offset: Pagination offset (default 0)
 * - location: Filter by location (case-insensitive substring match)
 * - exam: Filter by exam_name (case-insensitive substring match)
 * - organization: Filter by organization (case-insensitive substring match)
 *
 * Example:
 * GET /api/jobs
 * GET /api/jobs?limit=10&offset=0
 * GET /api/jobs?location=Delhi&limit=20
 * GET /api/jobs?exam=SSC
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(request: NextRequest) {
  try {
    // Rate limiting: 100 requests per minute per IP
    const clientIp = getClientIp(request);
    const rateLimitResult = rateLimit(clientIp, 100, 60000);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          message: "Too many requests. Please try again in a moment.",
          retryAfter: Math.ceil(
            (rateLimitResult.resetTime - Date.now()) / 1000
          ),
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

    // Parse filters
    const locationFilter = searchParams.get("location")?.trim().toLowerCase();
    const examFilter = searchParams.get("exam")?.trim().toLowerCase();
    const organizationFilter = searchParams.get("organization")?.trim().toLowerCase();

    // Build query
    let query = supabase
      .from("jobs")
      .select("*", { count: "exact" })
      .eq("is_active", true)
      .order("posted_date", { ascending: false });

    // Apply filters if provided
    if (locationFilter) {
      query = query.ilike("location", `%${locationFilter}%`);
    }
    if (examFilter) {
      query = query.ilike("exam_name", `%${examFilter}%`);
    }
    if (organizationFilter) {
      query = query.ilike("organization", `%${organizationFilter}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: jobs, count, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Database query failed",
          message: "Unable to fetch jobs. Please try again later.",
        },
        { status: 500 }
      );
    }

    // Build response
    const response = {
      success: true,
      data: jobs || [],
      pagination: {
        limit,
        offset,
        count: jobs?.length || 0,
        total: count || 0,
        hasMore: (offset + (jobs?.length || 0)) < (count || 0),
      },
      filters: {
        location: locationFilter || null,
        exam: examFilter || null,
        organization: organizationFilter || null,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "An unexpected error occurred. Please try again later.",
      },
      { status: 500 }
    );
  }
}
