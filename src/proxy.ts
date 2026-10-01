import { NextRequest, NextResponse } from "next/server";
import createMiddleware from 'next-intl/middleware';
import { adminSessionToken } from "@/lib/admin-token";
import { locales, defaultLocale, type Locale } from "@/i18n/request";

const COOKIE_NAME = "admin_session";

// Create the next-intl middleware
const intlMiddleware = createMiddleware({
  locales: locales as any,
  defaultLocale: defaultLocale,
  localePrefix: 'as-needed',
});

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle i18n for all routes
  const intlResponse = intlMiddleware(request);

  // Handle admin authentication
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = await adminSessionToken();
    const cookie = request.cookies.get(COOKIE_NAME)?.value;

    if (!token || cookie !== token) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlResponse;
}

// Apply middleware to all routes except:
// - API routes (/api/*)
// - Assets (_next, favicon, robots, sitemap, etc.)
// - Public files
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.well-known).*)',
  ],
};
