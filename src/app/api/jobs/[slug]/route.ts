import { NextRequest, NextResponse } from 'next/server';
import { getRecruitmentWithPostsCached } from '@/db/operations/get-recruitments';

/**
 * GET /api/jobs/[slug].json
 * 
 * Returns enrichment data for a recruitment hub page as JSON.
 * Useful for integrations, syndication, external APIs.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    const data = await getRecruitmentWithPostsCached(slug);
    
    if (!data) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const { recruitment } = data;

    return NextResponse.json(
      {
        slug,
        title: recruitment.name,
        organization: recruitment.organizationName,
        enrichment: recruitment.enrichmentData || null,
        metadata: {
          fetched_at: new Date().toISOString(),
          source: 'joboye',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Error in /api/jobs/[slug]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
