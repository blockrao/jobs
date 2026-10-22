import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/alerts/subscribe
 * Subscribe a user to job alerts for a specific recruitment
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

    // TODO: Implement alert subscription logic
    // For now, we'll just return a success response
    // In production, this would:
    // 1. Store the subscription in the database
    // 2. Send a confirmation email
    // 3. Integrate with email service (SendGrid, Mailgun, etc.)

    console.log(`Alert subscription: ${email} for ${recruitmentSlug}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Successfully subscribed to job alerts',
        recruitment: recruitmentName,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Alert subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    );
  }
}
