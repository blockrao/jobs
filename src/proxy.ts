import { NextRequest, NextResponse } from "next/server";
import { adminSessionToken } from "@/lib/admin-token";
import legacyExamSlugs from "@/lib/legacy-exam-slugs.generated.json";
import { getLegacyExamRedirect } from "@/lib/legacy-exam-routing";
import { getSector, getSectorByAlias, sectorHref } from "@/lib/sectors";

const COOKIE_NAME = "admin_session";
const legacyExamSlugSet = new Set<string>(legacyExamSlugs);

/**
 * URL contract (locked 2026-10-20) — there is exactly one URL per page and
 * no locale prefix. Every redirect below is a permanent 301 to a URL that is
 * guaranteed to exist, so crawlers never land on a redirect that 404s.
 *
 *   /jobs                                → discovery listing
 *   /jobs/{recruitment-slug}             → recruitment hub
 *   /jobs/{recruitment-slug}/{post-slug} → post leaf
 *
 * Legacy patterns handled here:
 *   /en/...  /hi/...       → same path without the prefix (locale routes removed 2026-10-20)
 *   /{legacy-exam-slug}    → /exams/{slug} (build-time manifest, no DB)
 *   /jobs?sector=x         → sector hub
 *   /jobs/{old-recruitment-slug}[/{post}] → canonical URL, resolved in the page routes
 *                            via recruitment_slug_redirects (never in the proxy).
 */

const LOCALE_PREFIX_RE = /^\/(en|hi)(?=\/|$)/;

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 1. Locale-prefixed URLs. The site indexed ~6,500 /en/jobs/... URLs before the
  //    locale segment was removed; they must 301 to the unprefixed path, never 404.
  if (LOCALE_PREFIX_RE.test(pathname)) {
    const stripped = pathname.replace(LOCALE_PREFIX_RE, "") || "/";
    return NextResponse.redirect(new URL(`${stripped}${search}`, request.url), { status: 301 });
  }

  // 2. Legacy /{examSlug} root URLs (build-generated allowlist; unknown roots fall
  //    through to the real 404 handler without any database work).
  const legacyExamTarget = getLegacyExamRedirect(pathname, legacyExamSlugSet);
  if (legacyExamTarget) {
    return NextResponse.redirect(new URL(legacyExamTarget, request.url), { status: 301 });
  }

  // 3. Admin authentication (everything under /admin except the login page).
  // The legacy /reports route is an internal enrichment dashboard, not a
  // public job-seeker destination, so protect it with the same admin session.
  if ((pathname.startsWith("/admin") && pathname !== "/admin/login") || pathname === "/reports" || pathname.startsWith("/reports/")) {
    const token = await adminSessionToken();
    const cookie = request.cookies.get(COOKIE_NAME)?.value;
    if (!token || cookie !== token) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Legacy footer links used `/jobs?sector=<x>`; 301 them to the sector hub.
  if (pathname === "/jobs" && request.nextUrl.searchParams.has("sector")) {
    const sectorParam = request.nextUrl.searchParams.get("sector") ?? "";
    const target = getSector(sectorParam) ?? getSectorByAlias(sectorParam);
    return NextResponse.redirect(new URL(target ? sectorHref(target) : "/jobs", request.url), { status: 301 });
  }

  // 5. Old recruitment slugs are resolved by the routes themselves
  //    (src/db/operations/get-recruitments.ts and get-posts.ts consult
  //    recruitment_slug_redirects and the pages issue a 301 to the canonical
  //    URL). Keeping the database out of the proxy keeps every request cheap.

  return NextResponse.next();
}

// Apply to all routes except API routes, Next internals and static files.
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.well-known|og-default.png).*)",
  ],
};
