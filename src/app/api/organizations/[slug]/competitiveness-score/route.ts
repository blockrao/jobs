import { NextRequest, NextResponse } from "next/server";
import { getDbV2 } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCompetitivenessScore } from "@/lib/organization-intelligence";

/**
 * GET /api/organizations/[slug]/competitiveness-score
 *
 * Returns difficulty score (0-100) and competition metrics
 * Cache: 1 hour
 * Used by: CompetitivenessIndicator widget
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

    const score = await getCompetitivenessScore(org.id);

    return NextResponse.json(score, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching competitiveness score:", error);
    return NextResponse.json(
      { error: "Failed to fetch competitiveness score" },
      { status: 500 }
    );
  }
}
