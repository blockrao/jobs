/**
 * Cron Route: Update Recruitment Lifecycle
 * Triggered: Hourly via Vercel Cron
 *
 * Refreshes recruitment statuses and cascades expiration to postings:
 * - Marks recruitments as ARCHIVED when application closed + no active exam
 * - Marks postings as expired with reason
 * - Updates last_verified_at timestamps
 *
 * P0 #10: Expired-job handling automation
 */

import { NextRequest, NextResponse } from "next/server";
import { getDbV2 } from "@/db";

export async function POST(request: NextRequest) {
  // Fail closed (SEC-001): no configured secret means no access. There is
  // deliberately no fallback value.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const db = getDbV2();
    if (!db) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 }
      );
    }

    // Call the refresh function via raw SQL
    const result = await db.execute(`
      SELECT * FROM refresh_recruitment_lifecycle();
    `);

    const lifecycle = result[0] || {
      expired_postings: 0,
      archived_recruitments: 0,
      last_refreshed: new Date(),
    };

    return NextResponse.json({
      success: true,
      message: "Recruitment lifecycle updated",
      results: {
        expired_postings: lifecycle.expired_postings,
        archived_recruitments: lifecycle.archived_recruitments,
        last_refreshed: lifecycle.last_refreshed,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Lifecycle refresh error:", error);
    return NextResponse.json(
      {
        error: "Failed to update lifecycle",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Vercel cron configuration (vercel.json):
 *
 * Add to crons array:
 * {
 *   "path": "/api/cron/update-recruitment-lifecycle",
 *   "schedule": "0 every 4 hours"
 * }
 *
 * Actual cron: 0 asterisk-slash-4 asterisk asterisk asterisk
 * (Every 4 hours at minute 0)
 */
