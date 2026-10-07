import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by src/app/global-not-found.tsx: the app has two root layouts
  // (src/app/(default) and src/app/[locale]) and no layout above them.
  experimental: {
    globalNotFound: true,
  },
  headers: async () => [
    {
      // Prevent Vercel edge from caching post leaf pages — they are
      // dynamic (force-dynamic) and edge-caching stale 404s was the
      // root cause of posts appearing broken after the RLS/GRANT fix.
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
