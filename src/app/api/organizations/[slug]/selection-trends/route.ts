import { NextRequest, NextResponse } from "next/server";
import { getDbV2 } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSelectionTrends } from "@/lib/organization-intelligence";

/**
 * GET /api/organizations/[slug]/selection-trends
 *
 * Returns historical selection data (5-year history)
 * - Years, vacancies, selections, success rates, cutoff marks
 * Cache: 1 hour
 * Used by: SelectionTrends widget
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const db = getDbV2();

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const trends = await getSelectionTrends(org.id);

    return NextResponse.json(trends, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching selection trends:", error);
    return NextResponse.json(
      { error: "Failed to fetch selection trends" },
      { status: 500 }
    );
  }
}
