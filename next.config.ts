import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by src/app/global-not-found.tsx: the app has two root layouts
  // (src/app/(default) and src/app/[locale]) and no layout above them.
  experimental: {
    globalNotFound: true,
  },
  redirects: async () => [
    // PHASE 2: Redirect old /jobs/{recruitment-slug}-{id} pattern to recruitment hub
    // Old URLs like /jobs/directorate-of-medical-health-and-family-welfare-services-government-of-rajasthan-2026-02812
    // are now served at /jobs/{recruitment-slug}
    {
      source: "/jobs/:slug-:id(\\d+)",
      destination: "/jobs/:slug",
      permanent: true, // 301 redirect
    },
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
