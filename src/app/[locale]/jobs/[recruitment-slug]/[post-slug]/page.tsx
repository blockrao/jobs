import type { Metadata } from "next";
import {
  default as CanonicalPostLeafPage,
  generateMetadata as generateCanonicalPostLeafMetadata,
} from "@/app/(default)/jobs/[recruitment-slug]/[post-slug]/page";
import { pageSeo } from "@/lib/seo";

type Props = {
  params: Promise<{
    locale: string;
    "recruitment-slug": string;
    "post-slug": string;
  }>;
};

/**
 * Locale-prefixed Post Leaf route.
 *
 * The shared leaf renderer currently provides English content only. Until a
 * genuine Hindi translation is available for this Post, /hi must remain
 * crawlable for links but non-indexable and canonical to the English leaf.
 * This prevents the locale middleware from routing /hi through the English
 * page metadata with an indexable canonical by accident.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, ...routeParams } = await params;
  const englishMetadata = await generateCanonicalPostLeafMetadata({
    params: Promise.resolve(routeParams),
  });

  if (locale !== "hi") {
    return englishMetadata;
  }

  const canonicalPath = `/jobs/${routeParams["recruitment-slug"]}/${routeParams["post-slug"]}`;
  return {
    ...englishMetadata,
    ...pageSeo(canonicalPath, { index: false }),
    openGraph: {
      ...englishMetadata.openGraph,
      url: `https://www.joboye.com${canonicalPath}`,
    },
  };
}

export default CanonicalPostLeafPage;
