import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import {
  getAllArticleSlugsForSitemap,
  getAllCategorySlugsForSitemap,
  getAllExamSlugsForSitemap,
  getAllOrganizationSlugsForSitemap,
  getPostingSlugsPageForSitemap,
} from "@/lib/queries";

// Single sitemap at /sitemap.xml — clean canonical URL that robots.txt and
// search engines expect. Google allows up to 50,000 URLs / 50 MB per
// sitemap; we cap the posting slice below that. When postings approach that
// ceiling, switch to `generateSitemaps()` chunking (served at
// /sitemap/{id}.xml) and update the robots.txt Sitemap reference.
const MAX_POSTING_URLS = 45000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [postingRows, articleRows, categoryRows, orgRows, examRows] = await Promise.all([
    getPostingSlugsPageForSitemap(0, MAX_POSTING_URLS).catch(() => []),
    getAllArticleSlugsForSitemap().catch(() => []),
    getAllCategorySlugsForSitemap().catch(() => []),
    getAllOrganizationSlugsForSitemap().catch(() => []),
    getAllExamSlugsForSitemap().catch(() => []),
  ]);

  // Only emit a hi alternate for rows that actually have translated
  // content — see src/app/[locale]/jobs|articles|organizations|exams/
  // generateMetadata for the matching per-page logic. Advertising a hi URL
  // with no real Hindi content would mislead search engines, not help them.
  const hiAlternates = (slug: string, basePath: string) => ({
    alternates: {
      languages: {
        en: `${SITE_URL}/en${basePath}/${slug}`,
        hi: `${SITE_URL}/hi${basePath}/${slug}`,
      },
    },
  });

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/jobs`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/categories`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/articles`, changeFrequency: "daily", priority: 0.6 },
  ];

  const postingEntries: MetadataRoute.Sitemap = postingRows.map((row) => ({
    url: `${SITE_URL}/jobs/${row.slug}`,
    lastModified: row.updatedAt,
    changeFrequency: "daily",
    priority: 0.8,
    ...((row as any).titleHi ? hiAlternates(row.slug, "/jobs") : {}),
  }));

  const articleEntries: MetadataRoute.Sitemap = articleRows.map((row) => ({
    url: `${SITE_URL}/articles/${row.slug}`,
    lastModified: row.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
    ...((row as any).titleHi ? hiAlternates(row.slug, "/articles") : {}),
  }));

  const categoryEntries: MetadataRoute.Sitemap = categoryRows.map((row) => ({
    url: `${SITE_URL}/categories/${row.slug}`,
    changeFrequency: "daily",
    priority: 0.5,
  }));

  const orgEntries: MetadataRoute.Sitemap = orgRows.map((row) => ({
    url: `${SITE_URL}/organizations/${row.slug}`,
    changeFrequency: "weekly",
    priority: 0.4,
    ...((row as any).nameHi ? hiAlternates(row.slug, "/organizations") : {}),
  }));

  // Exams were never in the sitemap at all before this — all 68 have
  // labelHi, so every one gets the hi alternate.
  const examEntries: MetadataRoute.Sitemap = examRows.map((row) => ({
    url: `${SITE_URL}/exams/${row.slug}`,
    changeFrequency: "weekly",
    priority: 0.5,
    ...hiAlternates(row.slug, "/exams"),
  }));

  return [
    ...staticEntries,
    ...postingEntries,
    ...articleEntries,
    ...categoryEntries,
    ...orgEntries,
    ...examEntries,
  ];
}
