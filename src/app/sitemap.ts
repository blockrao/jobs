import { STATES } from "@/lib/states/states";
import { countCurrentByState } from "@/lib/states/queries";
import type { MetadataRoute } from "next";
import { SECTORS } from "@/lib/sectors";
import { SITE_URL } from "@/lib/site";
import { ROLE_REGISTRY } from "@/lib/roles";
import {
  getAllArticleSlugsForSitemap,
  getAllExamSlugsForSitemap,
  getAllOrganizationSlugsForSitemap,
  getPostingSlugsPageForSitemap,
  getPostSlugsForSitemap,
  getRecruitmentSlugsForSitemap,
} from "@/lib/queries";
import { pickSitemapLastmod } from "@/lib/freshness/lastmod";
import { sitemapAlternates } from "@/lib/seo";

// Single sitemap at /sitemap.xml — clean canonical URL that robots.txt and
// search engines expect. Google allows up to 50,000 URLs / 50 MB per
// sitemap; we cap the posting slice below that. When postings approach that
// ceiling, switch to `generateSitemaps()` chunking (served at
// /sitemap/{id}.xml) and update the robots.txt Sitemap reference.
const MAX_POSTING_URLS = 45000;

// Freshness (SEO-001 D1, ledger A-028): the sitemap is regenerated at most
// one hour after a change, with no application deployment needed. The
// requirement is 24 hours; the interval is an implementation detail.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [postingRows, articleRows, orgRows, examRows, postLeafRows, recruitmentRows] = await Promise.all([
    getPostingSlugsPageForSitemap(0, MAX_POSTING_URLS).catch(() => []),
    getAllArticleSlugsForSitemap().catch(() => []),
    getAllOrganizationSlugsForSitemap().catch(() => []),
    getAllExamSlugsForSitemap().catch(() => []),
    getPostSlugsForSitemap().catch(() => []),
    getRecruitmentSlugsForSitemap().catch(() => []),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE_URL}/jobs`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/posts`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/categories`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/articles`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/organizations`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/states`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/exams`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/news`, changeFrequency: "daily", priority: 0.5 },
  ];

  // Post entity pages — pilot set. Priority 0.85: these are the new SEO-differentiated
  // pages; slightly below the home and /jobs hub, above category/org pages.
  const roleEntries: MetadataRoute.Sitemap = ROLE_REGISTRY.map((role) => ({
    url: `${SITE_URL}/posts/${role.slug}`,
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  // Include all URLs for maximum discoverability: recruitment hubs + posting pages
  const recruitmentEntries: MetadataRoute.Sitemap = recruitmentRows.map((row) => ({
    url: `${SITE_URL}/jobs/${row.slug}`,
    lastModified: row.updatedAt,
    changeFrequency: "daily" as const,
    priority: 0.7, // Hubs: slightly lower than individual postings
  }));

  // Legacy posting rows that collide with a Recruitment slug are excluded to avoid
  // duplicate URLs; recruitment hubs take precedence as aggregation pages.
  const recruitmentSlugSet = new Set(recruitmentRows.map((row) => row.slug));
  const postingEntries: MetadataRoute.Sitemap = postingRows
    .filter(
      (row) =>
        !recruitmentSlugSet.has(row.slug) &&
        (!row.canonicalRecruitmentSlug || row.canonicalRecruitmentSlug === row.slug),
    )
    .map((row) => ({
    url: `${SITE_URL}/jobs/${row.slug}`,
    lastModified: pickSitemapLastmod(row.contentChangedAt, row.updatedAt),
    changeFrequency: "daily",
    priority: 0.8,
    ...sitemapAlternates("/jobs", row.slug, Boolean(row.titleHi)),
  }));

  const articleEntries: MetadataRoute.Sitemap = articleRows.map((row) => ({
    url: `${SITE_URL}/articles/${row.slug}`,
    lastModified: pickSitemapLastmod(row.updatedAt, undefined),
    changeFrequency: "weekly",
    priority: 0.6,
    ...sitemapAlternates("/articles", row.slug, Boolean(row.titleHi)),
  }));

  // Sector hubs come from the single taxonomy in src/lib/sectors.ts — the
  // only /categories/* URLs that resolve; the old `categories` table slugs 301.
  const categoryEntries: MetadataRoute.Sitemap = SECTORS.map((s) => ({
    url: `${SITE_URL}/categories/${s.slug}`,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const orgEntries: MetadataRoute.Sitemap = orgRows.map((row) => ({
    url: `${SITE_URL}/organizations/${row.slug}`,
    changeFrequency: "weekly",
    priority: 0.4,
    ...sitemapAlternates("/organizations", row.slug, Boolean(row.nameHi)),
  }));

  const examEntries: MetadataRoute.Sitemap = examRows.map((row) => ({
    url: `${SITE_URL}/exams/${row.slug}`,
    changeFrequency: "weekly",
    priority: 0.5,
    ...sitemapAlternates("/exams", row.slug, Boolean(row.labelHi)),
  }));

  // PQ-006 / PQ-007: per-post leaf pages — /jobs/{recruitment-slug}/{post-slug}
  //
  // Sitemap policy (Phase 1B):
  //   - All Posts included regardless of LIVE status (expired Posts retain historical SEO value).
  //   - JobPosting structured data is suppressed at render time for expired recruitments (separate concern).
  //   - changeFrequency and priority differentiate LIVE vs. historical Posts.
  //   - lastmod = GREATEST(posts.updatedAt, recruitments.updatedAt): most recent meaningful change.
  const postLeafEntries: MetadataRoute.Sitemap = postLeafRows.map((row) => ({
    url: `${SITE_URL}/jobs/${row.recruitmentSlug}/${row.postSlug}`,
    // row.lastModified comes from a raw SQL GREATEST() expression — the postgres
    // driver returns it as a string, not a Date. pickSitemapLastmod coerces it.
    lastModified: pickSitemapLastmod(row.lastModified, undefined),
    changeFrequency: row.isLive ? ("weekly" as const) : ("yearly" as const),
    priority: row.isLive ? 0.75 : 0.5,
  }));

  // State hubs enter the sitemap only while they list at least one current job (thin hubs are noindex).
  const stateCounts = await countCurrentByState().catch(() => ({}) as Record<string, number>);
  const stateEntries: MetadataRoute.Sitemap = STATES.filter((st) => (stateCounts[st.slug] ?? 0) > 0).map((st) => ({
    url: `${SITE_URL}/states/${st.slug}`,
    changeFrequency: "daily",
    priority: 0.5,
  }));

  // All URL categories for complete discoverability (Phase 1 priority: maximum indexability)
  const allEntries: MetadataRoute.Sitemap = [
    ...staticEntries,
    ...roleEntries,
    ...stateEntries,
    ...postingEntries,
    ...recruitmentEntries,
    ...postLeafEntries,
    ...articleEntries,
    ...categoryEntries,
    ...orgEntries,
    ...examEntries,
  ];
  const uniqueEntries = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const entry of allEntries) uniqueEntries.set(entry.url, entry);
  return Array.from(uniqueEntries.values());
}
