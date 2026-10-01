import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware: Admin Auth Protection
 *
 * Protects /admin/* routes by checking for valid admin session cookie
 * Redirects unauthenticated requests to /admin/login
 */

const ADMIN_COOKIE_NAME = "admin_session";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Protect /admin/* routes (but not /admin/login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const sessionCookie = request.cookies.get(ADMIN_COOKIE_NAME);

    if (!sessionCookie?.value) {
      // No session cookie found - redirect to login
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Session cookie exists - allow request to proceed
    // Note: Session validity is also checked in actions.ts on form submissions
    // This middleware provides an additional protection layer at the page level
  }

  return NextResponse.next();
}

// Apply middleware to admin routes
export const config = {
  matcher: ["/admin/:path*"],
};
