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

// Only these route families actually have a `[locale]` segment
// (src/app/[locale]/articles|exams|organizations/[slug]). Every other
// route (`/jobs`, `/exams`, `/categories`, `/commissions/[slug]`,
// `/[exam_slug]`, etc.) is the plain, non-locale canonical page tree.
// next-intl's middleware previously ran on *every* path (matcher only
// excluded /api, /_next and static assets) — for a path with no
// `[locale]` counterpart it would still try to route it through the
// locale segment and land nowhere, 404ing pages that built and existed
// fine. Scoping the matcher to just the locale-aware prefixes fixes
// that without touching the rest of the site.
const LOCALE_AWARE_PREFIXES = ['/articles/', '/exams/', '/organizations/', '/jobs/'];

function isLocaleAwarePath(pathname: string): boolean {
  // Strip an explicit /en or /hi prefix before checking, since next-intl
  // also needs to run on already-prefixed requests (e.g. /hi/exams/foo).
  const stripped = pathname.replace(/^\/(en|hi)(?=\/|$)/, '') || '/';
  return LOCALE_AWARE_PREFIXES.some((prefix) => stripped.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle admin authentication (applies everywhere under /admin)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const token = await adminSessionToken();
    const cookie = request.cookies.get(COOKIE_NAME)?.value;

    if (!token || cookie !== token) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Only run next-intl's routing on paths that actually have a
  // `[locale]` page — everything else passes through untouched.
  if (isLocaleAwarePath(pathname)) {
    return intlMiddleware(request);
  }

  // There is no src/app/[locale]/page.tsx — only articles/exams/
  // organizations detail routes are localized, never a localized
  // homepage. A bare /en or /hi (e.g. from the language switcher on
  // the homepage) isn't locale-aware by the check above, so it would
  // otherwise fall through to the top-level `/[exam_slug]` catch-all
  // and render "Exam not found" for exam_slug="hi". Send it to the
  // (non-localized) homepage instead.
  if (/^\/(en|hi)\/?$/.test(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Apply proxy to all routes except:
// - API routes (/api/*)
// - Assets (_next, favicon, robots, sitemap, etc.)
// - Public files
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.well-known).*)',
  ],
};
