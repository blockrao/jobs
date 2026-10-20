import { NextRequest, NextResponse } from "next/server";
import { getDbV2 } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getRecruitmentCalendar } from "@/lib/organization-intelligence";

/**
 * GET /api/organizations/[slug]/recruitment-calendar
 *
 * Returns recruitment cycle history + prediction for next cycle
 * Cache: 1 hour
 * Used by: RecruitmentCalendar widget
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

    const calendar = await getRecruitmentCalendar(org.id);

    return NextResponse.json(calendar, {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching recruitment calendar:", error);
    return NextResponse.json(
      { error: "Failed to fetch recruitment calendar" },
      { status: 500 }
    );
  }
}
