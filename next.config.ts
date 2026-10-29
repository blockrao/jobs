import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by src/app/global-not-found.tsx: the app has two root layouts
  // (src/app/(default) and src/app/[locale]) and no layout above them.
  experimental: {
    globalNotFound: true,
  },
  redirects: async () => [
    // GSC 404 remediation (2026-10-29): historical URLs were emitted as
    // /jobs/jobs/{legacy-recruitment-slug}. Remove only the duplicated "jobs"
    // segment. The canonical jobs route then resolves the old slug through
    // recruitment_slug_redirects and issues the second 301 to the true hub.
    // The 11 examples in the supplied GSC export all have DB redirect mappings.
    {
      source: "/jobs/jobs/:slug",
      destination: "/jobs/:slug",
      permanent: true,
    },

    // CRITICAL FIX (2026-10-24): Removed the regex redirect rule that was stripping
    // trailing numbers from new slugs. New slugs like 'org1121-2026-0004' were being
    // treated as 'org1121-2026' + id '0004', causing 308 redirect chains that showed
    // the wrong job. The recruitment_slug_redirects table is the ONLY mechanism for
    // redirecting old slugs to new ones. See SLUG_CORRUPTION_RESOLUTION_ROADMAP_2026_10_24.md.

    // Garbled slug redirect: Hindi characters mangled during slug generation
    // Bad: /jobs/-ne-top-entre-ivasagar--2651/lecturer-assistant-teacher-and-more
    // Good: /jobs/one-stop-centre-sivasagar-2026-02651/lecturer-assistant-teacher-and-more
    {
      source: "/jobs/-ne-top-entre-ivasagar--2651/:postSlug*",
      destination: "/jobs/one-stop-centre-sivasagar-2026-02651/:postSlug*",
      permanent: true,
    },
  ],
  headers: async () => [
    {
      // Prevent Vercel edge from caching post leaf pages — they are
      // dynamic (force-dynamic) and edge-caching stale 404s was the
      // root cause of posts appearing broken after the RLS/GRANT fix.
      // PHASE 2: Updated to match clean URL structure (no locale prefix)
      source: "/jobs/:slug/:postSlug",
      headers: [
        {
          key: "Cache-Control",
          value: "no-store",
        },
      ],
    },
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "X-XSS-Protection",
          value: "1; mode=block",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "Permissions-Policy",
          value: "geolocation=(), microphone=(), camera=()",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ],
    },
  ],
};

export default nextConfig;
