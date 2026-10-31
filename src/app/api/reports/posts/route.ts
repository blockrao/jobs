/**
 * Protected API endpoint for the internal JobOye enrichment report.
 * GET /api/reports/posts?limit=50&offset=0
 *
 * This is an operations dashboard, not a public discovery endpoint. The
 * authorization check lives at the API boundary because API routes are not
 * covered by the page proxy.
 */
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminSessionToken } from "@/lib/admin-token";
import { getAllPostsWithEnrichment, getPostsCount, getEnrichmentStats } from "@/lib/queries";

const COOKIE_NAME = "admin_session";

async function requireAdmin() {
  const token = await adminSessionToken();
  const store = await cookies();
  return Boolean(token && store.get(COOKIE_NAME)?.value === token);
}

export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!process.env.DATABASE_URL) {
      console.error("[reports/posts] DATABASE_URL is not configured");
      return NextResponse.json({ error: "Report service unavailable" }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const requestedOffset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 50;
    const offset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0;

    const [posts, totalCount, stats] = await Promise.all([
      getAllPostsWithEnrichment(limit, offset),
      getPostsCount(),
      getEnrichmentStats(),
    ]);

    const toIso = (value: unknown) => value instanceof Date ? value.toISOString() : value;
    const serializedPosts = posts.map((post) => ({
      ...post,
      postedAt: toIso(post.postedAt),
      updatedAt: toIso(post.updatedAt),
      applicationClosingDate: toIso(post.applicationClosingDate),
      examDate: toIso(post.examDate),
      resultDate: toIso(post.resultDate),
      appointmentDate: toIso(post.appointmentDate),
    }));

    return NextResponse.json({
      posts: serializedPosts,
      totalCount,
      limit,
      offset,
      stats,
    });
  } catch (error) {
    console.error("[reports/posts] Internal report query failed:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Unable to load report data" }, { status: 500 });
  }
}
