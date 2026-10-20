import { NextRequest, NextResponse } from "next/server";
import { getDbV2 } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrganizationIntelligence } from "@/lib/organization-intelligence";

/**
 * GET /api/organizations/[slug]/intelligence
 *
 * Returns complete organization intelligence data:
 * - Salary trends
 * - Selection history
 * - Competitiveness score
 * - Recruitment calendar
 *
 * Cache: 1 hour (recompute data hourly for freshness)
 * Used by: All 8 Phase 2C widgets
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const db = getDbV2();

    // Get organization
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Get intelligence data
    const intelligence = await getOrganizationIntelligence(org.id);

    // Return with 1-hour cache
    return NextResponse.json(intelligence, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching organization intelligence:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization intelligence" },
      { status: 500 }
    );
  }
}
