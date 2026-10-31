import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { pageSeo } from "@/lib/seo";

export type DiscoveryHubMetadataInput = {
  title: string;
  description: string;
  canonicalPath: string;
  ogImage?: string;
  ogImageAlt: string;
  /** Query/filter representations are not standalone indexable documents. */
  indexable?: boolean;
};

/**
 * Shared metadata contract for high-value discovery hubs.
 *
 * The canonical URL, HTML metadata, Open Graph and Twitter representations
 * describe the same canonical document. Route-specific titles/descriptions
 * remain explicit so the template never invents entity facts.
 */
export function discoveryHubMetadata(input: DiscoveryHubMetadataInput): Metadata {
  const {
    title,
    description,
    canonicalPath,
    ogImage = "/og-default.png",
    ogImageAlt,
    indexable = true,
  } = input;
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;

  return {
    title,
    description,
    ...pageSeo(canonicalPath, { index: indexable }),
    openGraph: {
      title: `${title} | JobOye`,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: "JobOye",
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | JobOye`,
      description,
      images: [ogImage],
    },
  };
}
