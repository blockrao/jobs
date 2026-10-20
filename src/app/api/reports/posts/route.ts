/**
 * API endpoint for job postings report data
 * GET /api/reports/posts?limit=50&offset=0
 */

import { NextResponse } from 'next/server';
import { getAllPostsWithEnrichment, getPostsCount, getEnrichmentStats } from '@/lib/queries';

export async function GET(request: Request) {
  try {
    // Check environment configuration
    if (!process.env.DATABASE_URL) {
      console.error('[reports/posts] DATABASE_URL not configured');
      return NextResponse.json(
        {
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing in Vercel settings',
        },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Fetch data with detailed error handling
    let posts, totalCount, stats;
    try {
      posts = await getAllPostsWithEnrichment(limit, offset);
      totalCount = await getPostsCount();
      stats = await getEnrichmentStats();
    } catch (dbErr) {
      console.error('[reports/posts] Database query failed:', dbErr instanceof Error ? dbErr.message : String(dbErr));
      return NextResponse.json(
        {
          error: 'Database query failed',
          details: dbErr instanceof Error ? dbErr.message : 'Unknown database error',
        },
        { status: 500 }
      );
    }

    // Warn if no data is returned
    if (!posts || posts.length === 0) {
      console.warn('[reports/posts] No posts returned (empty result set)');
    }

    // Convert Date objects to ISO strings for JSON serialization
    const toIso = (v: unknown) => v instanceof Date ? v.toISOString() : v;
    const serializedPosts = posts.map(post => ({
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
    console.error('[reports/posts] Unhandled error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
