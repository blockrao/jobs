/**
 * API endpoint for job postings report data
 * GET /api/reports/posts?limit=50&offset=0
 */

import { NextResponse } from 'next/server';
import { getAllPostsWithEnrichment, getPostsCount } from '@/lib/queries';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);
    
    const posts = await getAllPostsWithEnrichment(limit, offset);
    const totalCount = await getPostsCount();

    // Convert Date objects to ISO strings for JSON serialization
    const serializedPosts = posts.map(post => ({
      ...post,
      postedAt: post.postedAt instanceof Date ? post.postedAt.toISOString() : post.postedAt,
      updatedAt: post.updatedAt instanceof Date ? post.updatedAt.toISOString() : post.updatedAt,
      applicationClosingDate: post.applicationClosingDate instanceof Date
        ? post.applicationClosingDate.toISOString()
        : post.applicationClosingDate,
      examDate: post.examDate instanceof Date ? post.examDate.toISOString() : post.examDate,
    }));

    return NextResponse.json({
      posts: serializedPosts,
      totalCount,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching posts report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts data' },
      { status: 500 }
    );
  }
}
