import { NextRequest, NextResponse } from "next/server";
import createMiddleware from 'next-intl/middleware';
import { adminSessionToken } from "@/lib/admin-token";
import { locales, defaultLocale, type Locale } from "@/i18n/request";
import { isLocaleAwarePath } from "@/i18n/locale-aware-paths";

// Import Supabase client for redirect lookups
import { getDb } from "@/db";
import { recruitment_slug_redirects } from "@/db/schema";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "admin_session";

// Create the next-intl middleware
const intlMiddleware = createMiddleware({
  locales: locales as any,
  defaultLocale: defaultLocale,
  localePrefix: 'as-needed',
  // SEO-001 (ledger A-052): hreflang is decided per page by src/lib/seo and
  // emitted in the page <head> and the sitemap only. The middleware's own
  // HTTP `Link` header would declare en/hi alternates on every URL,
  // including pages the policy says must carry none.
  alternateLinks: false,
  // Ledger A-053 (owner decision 2026-10-03): the language of a page is the
  // language of its URL. A request is never redirected to another language
  // because of the browser's Accept-Language header or a saved preference.
  // Visitors change language with the language switcher.
  localeDetection: false,
});

// isLocaleAwarePath (src/i18n/locale-aware-paths.ts) tells us which route
// families actually have a `[locale]` segment
// (src/app/[locale]/articles|exams|organizations|jobs/[slug]). Every other
// route (`/news`, `/categories`, `/commissions/[slug]`, `/[exam_slug]`,
// etc.) is the plain, non-locale canonical page tree. next-intl's
// middleware previously ran on *every* path (matcher only excluded /api,
// /_next and static assets) — for a path with no `[locale]` counterpart it
// would still try to route it through the locale segment and land
// nowhere, 404ing pages that built and existed fine. Scoping the matcher
// to just the locale-aware prefixes fixes that without touching the rest
// of the site.

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

  // Handle URL slug redirects from old format to new semantic format
  // This handles the migration from descriptive slugs (150+ chars) to semantic slugs (33-48 chars)
  const jobsMatch = pathname.match(/^\/jobs\/([^\/]+)$/);
  if (jobsMatch) {
    const slug = jobsMatch[1];

    // Canonical semantic slugs end in -YYYY-NN. They cannot be legacy slugs,
    // so skip the redirect-table query on the common canonical navigation path.
    // Old descriptive slugs still use the indexed lookup and preserve 301s.
    if (!/-\d{4}-\d{2}$/.test(slug)) {
      try {
        const db = getDb();
        const redirectRecord = await db
          .select()
          .from(recruitment_slug_redirects)
          .where(eq(recruitment_slug_redirects.old_slug, slug))
          .limit(1);

        if (redirectRecord && redirectRecord.length > 0) {
          const newSlug = redirectRecord[0].new_slug;
          const url = new URL(`/jobs/${newSlug}`, request.url);

          // Return 301 permanent redirect
          return NextResponse.redirect(url, {
            status: 301,
          });
        }
      } catch (error) {
        console.error("Redirect lookup error:", error);
        // Continue on error — don't block page access
      }
    }
  }

  // Only run next-intl's routing on paths that actually have a
  // `[locale]` page — everything else passes through untouched.
  if (isLocaleAwarePath(pathname)) {
    return intlMiddleware(request);
  }

  // There is no src/app/[locale]/page.tsx — only articles/exams/
  // organizations/jobs detail routes are localized. A bare /en or /hi
  // (e.g. from the language switcher on the homepage) isn't locale-aware
  // by the check above, so it would otherwise fall through to the
  // top-level `/[exam_slug]` catch-all and render "Exam not found" for
  // exam_slug="hi". Send it to the (non-localized) homepage instead.
  if (/^\/(en|hi)\/?$/.test(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Any other /en/... or /hi/... path that isn't locale-aware (e.g.
  // /en/news, /hi/categories/foo, /en/search) has no matching route at
  // all — there's no [locale] segment for it and it's not the bare-root
  // case above either, so Next would otherwise 404 it. These can reach a
  // visitor via an old bookmark, a search engine that indexed a stray
  // link, or simply typing a plausible-looking URL. Redirect to the
  // equivalent canonical (non-prefixed) path rather than 404ing on a page
  // that genuinely exists one segment away.
  const localePrefixMatch = pathname.match(/^\/(en|hi)(\/.*)$/);
  if (localePrefixMatch) {
    return NextResponse.redirect(new URL(localePrefixMatch[2], request.url));
  }

  return NextResponse.next();
}

// Apply proxy to all routes except:
// - API routes (/api/*)
// - Assets (_next, favicon, robots, sitemap, etc.)
// - Public files
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.well-known|og-default.png).*)',
  ],
};
