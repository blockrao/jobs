/**
 * hreflang Tag Generation for Language Variants
 *
 * Generates hreflang links for English/Hindi job pages
 * Prevents Google from treating translations as duplicates
 *
 * For each URL, outputs:
 * <link rel="alternate" hreflang="en-IN" href="https://joboye.com/jobs/..." />
 * <link rel="alternate" hreflang="hi-IN" href="https://joboye.com/hi/jobs/..." />
 * <link rel="alternate" hreflang="x-default" href="https://joboye.com/jobs/..." />
 */

import { SITE_URL } from './site';

export interface HrefLangLink {
  hreflang: string;
  href: string;
}

/**
 * Generate hreflang links for job pages
 *
 * @param recruitmentSlug - e.g., "bihar-public-service-commission"
 * @param postSlug - e.g., "assistant-engineer-civil" (optional for hub pages)
 * @returns Array of hreflang links
 */
export function generateHreflangs(
  recruitmentSlug: string,
  postSlug?: string
): HrefLangLink[] {
  const basePath = postSlug
    ? `/jobs/${recruitmentSlug}/${postSlug}`
    : `/jobs/${recruitmentSlug}`;

  const enUrl = `${SITE_URL}${basePath}`;
  const hiUrl = `${SITE_URL}/hi${basePath}`;

  return [
    {
      hreflang: 'en-IN',
      href: enUrl,
    },
    {
      hreflang: 'hi-IN',
      href: hiUrl,
    },
    {
      hreflang: 'x-default',
      href: enUrl,  // Default to English
    },
  ];
}

/**
 * Generate metadata with hreflang alternates for Next.js
 *
 * Usage in page.tsx:
 * const hreflangs = generateHreflangs(recruitmentSlug, postSlug);
 * return {
 *   alternates: {
 *     languages: Object.fromEntries(
 *       hreflangs.map(h => [h.hreflang, h.href])
 *     )
 *   }
 * }
 */
export function generateAlternates(
  recruitmentSlug: string,
  postSlug?: string
) {
  const hreflangs = generateHreflangs(recruitmentSlug, postSlug);
  return {
    languages: Object.fromEntries(
      hreflangs.map(h => [h.hreflang, h.href])
    ),
  };
}
