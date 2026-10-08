/**
 * API endpoint to check if a recruitment slug should be redirected.
 * Used by middleware.ts to perform SEO-preserving 301 redirects.
 *
 * Request: POST /api/recruitment-redirects/check
 * Body: { oldSlug: string }
 * Response: { newSlug?: string } or 404 if not found
 */

import { getDb } from "@/db";
import { recruitment_slug_redirects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { oldSlug } = await request.json();

    if (!oldSlug || typeof oldSlug !== "string") {
      return NextResponse.json(
        { error: "Invalid oldSlug parameter" },
        { status: 400 },
      );
    }

    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      console.warn("DATABASE_URL not configured, recruitment redirects unavailable");
      return NextResponse.json({}, { status: 404 });
    }

    const db = getDb();
    const redirect = await db.query.recruitment_slug_redirects.findFirst({
      where: eq(recruitment_slug_redirects.old_slug, oldSlug),
    });

    if (!redirect) {
      return NextResponse.json({}, { status: 404 });
    }

    return NextResponse.json({ newSlug: redirect.new_slug });
  } catch (error) {
    console.error("Error checking recruitment redirect:", error);
    // Return 404 instead of 500 so middleware can continue
    return NextResponse.json({}, { status: 404 });
  }
}

// Disable caching for this route (redirect mappings could change)
export const revalidate = 0;
