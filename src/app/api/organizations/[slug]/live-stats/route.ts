import { NextRequest, NextResponse } from "next/server";
import { db as database } from "@/db";
import { organizations, recruitments, posts } from "@/db/schema";
import { eq, and, inArray, count } from "drizzle-orm";

/**
 * GET /api/organizations/[slug]/live-stats
 *
 * Returns real-time job statistics for an organization:
 * - Open position count
 * - Active recruitment count
 * - Next application deadline
 * - Last update timestamp
 *
 * Data freshness: Real-time (no cache)
 * Cache header: Cache-Control: no-store (always fresh)
 *
 * Used by: LiveJobsWidget component
 */

interface LiveStats {
  openPositions: number;
  activeRecruitments: number;
  nextDeadline?: string;
  daysUntilDeadline?: number;
  lastUpdated: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Get organization
    const org = await database.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Count all posts for this organization (across active recruitments)
    const postsCount = await database
      .select({ count: count() })
      .from(posts)
      .innerJoin(recruitments, eq(posts.recruitmentId, recruitments.id))
      .where(
        and(
          eq(recruitments.organizationId, org.id),
          inArray(recruitments.status, ["UPCOMING", "ACTIVE", "CLOSED"])
        )
      );

    const openPositions = postsCount[0]?.count || 0;

    // Get active recruitments (UPCOMING or ACTIVE status)
    const activeRecruitmentsData = await database
      .select({
        id: recruitments.id,
        applicationEndDate: recruitments.applicationEndDate,
      })
      .from(recruitments)
      .where(
        and(
          eq(recruitments.organizationId, org.id),
          inArray(recruitments.status, ["UPCOMING", "ACTIVE"])
        )
      )
      .orderBy(recruitments.applicationEndDate);

    const activeRecruitments = activeRecruitmentsData.length;

    // Get next deadline
    let nextDeadline: string | undefined;
    let daysUntilDeadline: number | undefined;

    if (activeRecruitmentsData.length > 0 && activeRecruitmentsData[0].applicationEndDate) {
      nextDeadline = activeRecruitmentsData[0].applicationEndDate.toISOString();
      const now = new Date();
      const deadline = new Date(activeRecruitmentsData[0].applicationEndDate);
      const timeDiff = deadline.getTime() - now.getTime();
      daysUntilDeadline = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    }

    const stats: LiveStats = {
      openPositions,
      activeRecruitments,
      nextDeadline,
      daysUntilDeadline,
      lastUpdated: new Date().toISOString(),
    };

    // Return with no-store cache header (always fresh)
    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "no-store, must-revalidate",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching organization live stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization stats" },
      { status: 500 }
    );
  }
}
