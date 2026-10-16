/**
 * Meta Tags Generator for SEO/GEO/AEO Compliance
 *
 * Generates:
 * - Open Graph tags (social sharing + job platform detection)
 * - Twitter Card tags
 * - Canonical URL
 * - Author/Publisher metadata
 * - Date metadata (publication, modification)
 * - Multilingual hreflang (en, hi, mr, gu, x-default)
 *
 * Used in: Next.js generateMetadata() in app/jobs/[recruitment]/[post]/page.tsx
 */

import { Metadata } from "next";
import { JobPostingData } from "@/types/job-posting";
import { SITE_URL } from "@/lib/site";

interface MetaTagsGeneratorProps {
  post: JobPostingData;
  locale?: string;
}

export function generateMetaTags({
  post,
  locale = "en",
}: MetaTagsGeneratorProps): Metadata {
  const baseUrl = SITE_URL || "https://www.joboye.com";
  const postUrl = `${baseUrl}/jobs/${post.recruitmentSlug}/${post.slug}`;

  // ========== TITLE & DESCRIPTION ==========
  const title = `${post.title} - ${post.organizationName} | Apply Online 2026`;

  const description = `Apply for ${post.title} at ${post.organizationName}. ` +
    `${post.vacancyDetails ? Object.values(post.vacancyDetails).reduce((a, b) => (a as number) + (b as number), 0) : 'Multiple'} vacancies. ` +
    `Apply by ${post.recruitmentApplicationEndDate ? new Date(post.recruitmentApplicationEndDate).toLocaleDateString("en-IN") : "deadline"}.`;

  // ========== OPEN GRAPH (Job Platform Detection) ==========
  const ogImage = `${baseUrl}/images/og/job-posting-${post.id}.jpg`;

  const openGraph: Metadata["openGraph"] = {
    title,
    description,
    type: "job.job_opening" as const,
    url: postUrl,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: `${post.title} at ${post.organizationName}`,
      },
    ],
    siteName: "JobOye - Government Job Discovery",
    locale: locale === "hi" ? "hi_IN" : locale === "mr" ? "mr_IN" : "en_IN",
  };

  // ========== TWITTER CARD ==========
  const twitter: Metadata["twitter"] = {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
    creator: "@joboyeindia",
  };

  // ========== CANONICAL & ALTERNATES ==========
  const alternates: Metadata["alternates"] = {
    canonical: postUrl,
    languages: {
      en: postUrl,
      "en-IN": postUrl,
      hi: `${postUrl}?lang=hi`,
      "hi-IN": `${postUrl}?lang=hi`,
      mr: `${postUrl}?lang=mr`,
      "mr-IN": `${postUrl}?lang=mr`,
      gu: `${postUrl}?lang=gu`,
      "gu-IN": `${postUrl}?lang=gu`,
      "x-default": postUrl,
    },
  };

  // ========== METADATA ==========
  const metadata: Metadata = {
    title,
    description,
    keywords: [
      post.title,
      post.organizationName,
      "government job",
      "recruitment",
      post.locationCity,
      post.locationState,
      "apply online",
    ].filter(Boolean) as string[],
    authors: [{ name: "JobOye" }],
    creator: "JobOye",
    publisher: "JobOye - Government Job Discovery Platform",
    robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    openGraph,
    twitter,
    alternates,
    metadataBase: new URL(baseUrl),

    // ========== CUSTOM META TAGS ==========
    // These will be rendered as-is
    other: {
      "geo.placename": post.locationCity || "India",
      "geo.region": post.locationState ? `IN-${post.locationState}` : "IN",
      "geo.position": post.locationCity === "Mumbai" ? "19.0760;72.8777" : undefined,
      "date": new Date(post.postedAt || Date.now()).toISOString().split("T")[0],
      "last-modified": new Date(post.updatedAt || Date.now()).toISOString().split("T")[0],
      "author": "JobOye",
      "publisher": "JobOye - Government Job Discovery Platform",
      "googlebot": "index, follow, max-snippet:-1",
      "bingbot": "index, follow",
    },
  };

  return metadata;
}

/**
 * Alternative function that returns raw meta tag strings for manual insertion
 * Useful for static site generation or template systems
 */
export function generateMetaTagStrings({
  post,
  locale = "en",
}: MetaTagsGeneratorProps): Record<string, string> {
  const baseUrl = SITE_URL || "https://www.joboye.com";
  const postUrl = `${baseUrl}/jobs/${post.recruitmentSlug}/${post.slug}`;

  const title = `${post.title} - ${post.organizationName} | Apply Online 2026`;
  const description = `Apply for ${post.title} at ${post.organizationName}. Multiple vacancies.`;
  const ogImage = `${baseUrl}/images/og/job-posting-${post.id}.jpg`;

  return {
    // Standard meta tags
    charset: "UTF-8",
    viewport: "width=device-width, initial-scale=1.0",
    description,
    keywords: `${post.title}, ${post.organizationName}, government job, recruitment`,

    // Open Graph
    "og:title": title,
    "og:type": "job.job_opening",
    "og:description": description,
    "og:url": postUrl,
    "og:image": ogImage,
    "og:image:width": "1200",
    "og:image:height": "630",
    "og:site_name": "JobOye - Government Job Discovery",
    "og:locale": locale === "hi" ? "hi_IN" : locale === "mr" ? "mr_IN" : "en_IN",

    // Twitter Card
    "twitter:card": "summary_large_image",
    "twitter:title": title,
    "twitter:description": description,
    "twitter:image": ogImage,
    "twitter:site": "@joboyeindia",
    "twitter:creator": "@joboyeindia",

    // Author/Publisher
    author: "JobOye",
    publisher: "JobOye - Government Job Discovery Platform",

    // Geo
    "geo:placename": post.locationCity || "India",
    "geo:region": post.locationState ? `IN-${post.locationState}` : "IN",
    "geo:position": post.locationCity === "Mumbai" ? "19.0760,72.8777" : undefined,

    // Robots
    robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",

    // Dates
    date: new Date(post.postedAt || Date.now()).toISOString().split("T")[0],
    "last-modified": new Date(post.updatedAt || Date.now()).toISOString().split("T")[0],
  };
}
