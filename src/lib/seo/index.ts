/**
 * Central public-representation policy (SEO-001; ledger A-007, A-027, A-050;
 * docs/architecture/SEO001_PUBLIC_REPRESENTATION.md).
 *
 * Every route decides canonical, hreflang and robots by calling this module.
 * No route file builds those values itself (contract CAN-05). The module
 * holds representation rules only: it decides nothing about lifecycle,
 * identity or data.
 *
 * Rules implemented here:
 *  - English is unprefixed; Hindi lives under /hi; /en never appears.
 *  - A URL has one language. A Hindi version "exists" only when the caller
 *    says the entity has genuine Hindi content (`hasHindi`).
 *  - Untranslated Hindi page: noindex, follow; canonical to the English
 *    address; no hreflang.
 *  - hreflang only between two indexable versions; complete and reciprocal.
 *  - Filter, search and query views of a listing: noindex, follow; canonical
 *    to the unfiltered listing.
 *  - noindex is always `follow`.
 */
import type { Metadata, MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export type EntityBase = "/jobs" | "/articles" | "/organizations" | "/exams";

type Seo = Pick<Metadata, "alternates" | "robots">;

const NOINDEX_FOLLOW = { index: false, follow: true } as const;

const languagesFor = (enPath: string) => ({
  en: absoluteUrl(enPath),
  hi: absoluteUrl(`/hi${enPath}`),
  "x-default": absoluteUrl(enPath),
});

/**
 * A localized entity page (job, article, organization, exam).
 *
 * `eligible` is the page type's own indexability criterion in English (for
 * a job, the existing quality tier); it defaults to true. `hasHindi` is
 * whether genuine Hindi content exists for the entity.
 */
export function entitySeo(opts: {
  base: EntityBase;
  slug: string;
  locale: string;
  hasHindi: boolean;
  eligible?: boolean;
}): Seo & { canonicalPath: string; url: string; indexable: boolean } {
  const { base, slug, locale, hasHindi, eligible = true } = opts;
  const enPath = `${base}/${slug}`;
  const isHi = locale === "hi";
  const untranslatedHi = isHi && !hasHindi;
  const indexable = eligible && !untranslatedHi;
  const canonicalPath = isHi && hasHindi ? `/hi${enPath}` : enPath;
  const pairIndexable = eligible && hasHindi;

  return {
    canonicalPath,
    url: absoluteUrl(canonicalPath),
    indexable,
    alternates: {
      canonical: canonicalPath,
      ...(pairIndexable && !untranslatedHi && { languages: languagesFor(enPath) }),
    },
    robots: indexable ? undefined : NOINDEX_FOLLOW,
  };
}

/** A single-language page at a fixed path (hub, static page, detail page). */
export function pageSeo(path: string, opts: { index?: boolean } = {}): Seo {
  return {
    alternates: { canonical: path },
    robots: opts.index === false ? NOINDEX_FOLLOW : undefined,
  };
}

/**
 * A listing that accepts filter or search parameters. Only the unfiltered
 * view is indexable; every view is canonical to the unfiltered path.
 */
export function listingSeo(path: string, params: Record<string, unknown>): Seo {
  const filtered = Object.values(params).some((v) => v !== undefined && v !== null && v !== "");
  return pageSeo(path, { index: !filtered });
}

/** Sitemap hreflang block: present only when the Hindi version exists. */
export function sitemapAlternates(
  base: EntityBase,
  slug: string,
  hasHindi: boolean,
): Pick<MetadataRoute.Sitemap[number], "alternates"> {
  return hasHindi ? { alternates: { languages: languagesFor(`${base}/${slug}`) } } : {};
}
