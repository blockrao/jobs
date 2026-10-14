/**
 * API endpoint for job postings report data
 * GET /api/reports/posts?limit=50&offset=0
 */

import { NextResponse } from 'next/server';
import { getAllPostsWithEnrichment, getPostsCount, getEnrichmentStats } from '@/lib/queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const posts = await getAllPostsWithEnrichment(limit, offset);
    const totalCount = await getPostsCount();
    const stats = await getEnrichmentStats();

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
    console.error('Error fetching posts report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts data' },
      { status: 500 }
    );
  }
}
