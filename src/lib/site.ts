// Resolve the canonical site origin. Order of preference:
// 1. NEXT_PUBLIC_SITE_URL — explicit custom domain (set this in production).
// 2. VERCEL_PROJECT_PRODUCTION_URL — the project's stable production domain,
//    injected by Vercel. Using this even on preview deploys keeps canonical
//    URLs / JSON-LD @ids / sitemap entries pointing at production (correct
//    for SEO — previews should not present themselves as canonical).
// 3. VERCEL_URL — per-deployment URL (last resort).
// 4. localhost for local dev.
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod.replace(/\/$/, "")}`;

  const deployment = process.env.VERCEL_URL;
  if (deployment) return `https://${deployment.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();

export const SITE_NAME = "JobOye";

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
