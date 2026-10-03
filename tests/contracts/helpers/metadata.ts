import type { Metadata } from "next";

export const SITE = "https://www.joboye.com";

/**
 * Resolves `alternates.canonical` the way Next.js does when rendering
 * <link rel="canonical">: relative values are resolved against metadataBase
 * (the root layout sets it to SITE_URL).
 */
export function canonicalOf(meta: Metadata): URL | null {
  const raw = meta.alternates?.canonical;
  if (!raw) return null;
  return new URL(String(raw), SITE);
}

export function languagesOf(meta: Metadata): Record<string, string> | null {
  const langs = meta.alternates?.languages as Record<string, string> | undefined;
  return langs ?? null;
}

/** True when the metadata tells crawlers not to index the page. */
export function isNoindex(meta: Metadata): boolean {
  const robots = meta.robots;
  if (!robots) return false;
  if (typeof robots === "string") return /noindex/i.test(robots);
  return robots.index === false;
}

export const params = <T extends object>(p: T) => ({ params: Promise.resolve(p) });
