import { getDb } from "@/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const db = getDb();

    // Find posts that are missing key relationships or are orphaned
    const unlinkedPosts = await db.execute<any>(sql`
      SELECT
        p.id,
        p.slug,
        p.title,
        p.recruitment_id,
        p.position_id,
        r.slug as recruitment_slug,
        r.name as recruitment_name,
        pos.slug as position_slug,
        pos.name as position_name,
        CASE
          WHEN p.recruitment_id IS NULL THEN 'no_recruitment'
          WHEN p.position_id IS NULL THEN 'no_position'
          WHEN r.slug IS NULL THEN 'orphaned_recruitment'
          WHEN pos.slug IS NULL THEN 'orphaned_position'
          ELSE 'linked'
        END as link_status
      FROM posts p
      LEFT JOIN recruitments r ON p.recruitment_id = r.id
      LEFT JOIN positions pos ON p.position_id = pos.id
      WHERE p."isLive" = true
        AND (
          p.recruitment_id IS NULL
          OR p.position_id IS NULL
          OR r.slug IS NULL
          OR pos.slug IS NULL
        )
      ORDER BY p.id DESC
    `);

    const summary = {
      total_unlinked: unlinkedPosts.length,
      by_status: {},
      posts: unlinkedPosts,
    };

    // Count by status
    unlinkedPosts.forEach((post: any) => {
      const status = post.link_status;
      if (!summary.by_status[status]) {
        summary.by_status[status] = 0;
      }
      summary.by_status[status]++;
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[audit-unlinked] Error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
