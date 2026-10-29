import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by src/app/global-not-found.tsx: the app has two root layouts
  // (src/app/(default) and src/app/[locale]) and no layout above them.
  experimental: {
    globalNotFound: true,
  },
  redirects: async () => [
    // GSC 404 remediation (2026-10-29): exact historical URLs with a duplicated
    // /jobs/jobs/ prefix. Each destination was verified against the live
    // recruitment_slug_redirects table so these are one-hop redirects to a
    // canonical recruitment hub, not guesses or broad pattern rewrites.
    { source: "/jobs/jobs/indian-institute-of-management-mumbai-2026-07", destination: "/jobs/org1329-2026-0007", permanent: true },
    { source: "/jobs/jobs/railway-recruitment-board-2026-05", destination: "/jobs/org14-2026-0003", permanent: true },
    { source: "/jobs/jobs/dr-b-r-ambedkar-open-university-2026-01", destination: "/jobs/org1253-2026-0001", permanent: true },
    { source: "/jobs/jobs/employees-state-insurance-corporation-medical-college-hospital-indore-professor-associate-professor-", destination: "/jobs/org2288-2026-0001", permanent: true },
    { source: "/jobs/jobs/himachal-pradesh-jal-shakti-vibhag-2026-01", destination: "/jobs/org1299-2026-0001", permanent: true },
    { source: "/jobs/jobs/hindustan-aeronautics-limited-2026-01", destination: "/jobs/org1684-2026-0001", permanent: true },
    { source: "/jobs/jobs/visva-bharati-2026-01", destination: "/jobs/org1575-2026-0001", permanent: true },
    { source: "/jobs/jobs/navsari-agricultural-university-2026-01", destination: "/jobs/org1467-2026-0001", permanent: true },
    { source: "/jobs/jobs/one-stop-centre-sivasagar-2026-02651", destination: "/jobs/org87-2026-0008", permanent: true },
    { source: "/jobs/jobs/tata-institute-of-social-sciences-2026-02", destination: "/jobs/org1554-2026-0007", permanent: true },
    { source: "/jobs/jobs/kalsi-forest-division-2026-01", destination: "/jobs/org1386-2026-0001", permanent: true },

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
