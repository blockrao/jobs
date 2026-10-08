/**
 * Middleware for handling recruitment slug redirects.
 *
 * When a recruitment's slug changes (from long descriptive format to
 * enterprise-grade sequential format), this middleware ensures old URLs
 * redirect to new ones with 301 (permanent) status for SEO preservation.
 *
 * Redirect map is stored in recruitment_slug_redirects table.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Pattern: /jobs/{recruitment-slug}/{post-slug} or /jobs/{recruitment-slug}
  // We want to extract the recruitment-slug and check if it needs redirecting
  const jobsMatch = pathname.match(/^\/jobs\/([^\/]+)(?:\/|$)/);

  if (!jobsMatch) {
    return NextResponse.next();
  }

  const recruitmentSlug = jobsMatch[1];

  // Skip if it's already in the new format (optimization to avoid DB lookups)
  // New format: {org-slug}-{year}-{2-digit-number}
  if (/^[a-z0-9]+-\d{4}-\d{2}$/.test(recruitmentSlug)) {
    return NextResponse.next();
  }

  try {
    // Query the recruitment_slug_redirects table for a mapping
    const response = await fetch(
      new URL("/api/recruitment-redirects/check", request.url),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ oldSlug: recruitmentSlug }),
        // Add timeout to prevent middleware from hanging
        signal: AbortSignal.timeout(5000),
      },
    );

    if (response.ok) {
      const { newSlug } = await response.json();
      if (newSlug) {
        // Reconstruct the URL with the new slug
        const newPathname = pathname.replace(recruitmentSlug, newSlug);
        const newUrl = new URL(newPathname, request.url);

        // Use 301 (Moved Permanently) for SEO preservation
        return NextResponse.redirect(newUrl, { status: 301 });
      }
    }
  } catch (error) {
    // Log error but don't break the request — API not available is non-fatal
    // The page will still load; just without the redirect
    console.warn("Recruitment redirect check unavailable:", error instanceof Error ? error.message : String(error));
  }

  // If no redirect found, continue normally
  return NextResponse.next();
}

// Configure which routes the middleware applies to
export const config = {
  matcher: [
    // Apply to /jobs routes
    "/jobs/:path*",
    // Also handle the locale-prefixed versions
    "/en/jobs/:path*",
    "/hi/jobs/:path*",
  ],
};
