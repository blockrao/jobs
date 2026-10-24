import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/alerts/subscribe
 *
 * DEPRECATED: This endpoint does not work.
 *
 * Job alert subscriptions are not yet implemented. Requests to this
 * endpoint are logged but not processed. Users will not receive any emails.
 *
 * This endpoint will be removed in a future version.
 * Do not rely on it for any functionality.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, recruitmentSlug, recruitmentName } = body;

    // Validate email
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Validate recruitment info
    if (!recruitmentSlug || !recruitmentName) {
      return NextResponse.json(
        { error: 'Missing recruitment information' },
        { status: 400 }
      );
    }

    // Log the request for debugging purposes only
    // No data is saved, no email is sent
    console.log(`[DEPRECATED] Alert subscription attempt: ${email} for ${recruitmentSlug}`);

    // Honest response: This feature is not implemented
    return NextResponse.json(
      {
        success: false,
        message: 'Job alert subscriptions are not yet implemented. This feature is coming soon.',
        recruitment: recruitmentName,
      },
      { status: 501 }  // 501 Not Implemented
    );
  } catch (error) {
    console.error('Alert subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    );
  }
}
