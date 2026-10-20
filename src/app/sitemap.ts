import { MetadataRoute } from 'next';
import { getDb } from '@/db';
import { sql } from 'drizzle-orm';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getDb();

  try {
    // Fetch all live posts with recruitment info using raw SQL
    const allPosts = await db.execute<{
      post_slug: string;
      recruitment_slug: string;
      updated_at: Date | string;
    }>(sql`
      SELECT
        p.slug as post_slug,
        r.slug as recruitment_slug,
        p.updated_at
      FROM posts p
      INNER JOIN recruitments r ON p.recruitment_id = r.id
      ORDER BY p.updated_at DESC
    `);

    if (!allPosts || allPosts.length === 0) {
      console.warn('[sitemap] No live posts found, returning hub page only');
      // Fallback: return hub page when no posts are found
      return [
        {
          url: 'https://www.joboye.com',
          lastModified: new Date(),
          changeFrequency: 'daily',
          priority: 1.0,
        },
        {
          url: 'https://www.joboye.com/jobs',
          lastModified: new Date(),
          changeFrequency: 'daily',
          priority: 0.95,
        },
      ];
    }

    // PHASE 2: Generate clean URLs without locale prefix
    // All posts use /jobs/{recruitment-slug}/{post-slug} structure
    const postUrls = allPosts.map((post) => ({
      url: `https://www.joboye.com/jobs/${post.recruitment_slug}/${post.post_slug}`,
      lastModified: post.updated_at instanceof Date ? post.updated_at : new Date(post.updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    // Hub pages (single canonical /jobs page)
    const hubUrls: MetadataRoute.Sitemap = [
      {
        url: 'https://www.joboye.com',
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: 'https://www.joboye.com/jobs',
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.95,
      },
    ];

    const result = [...hubUrls, ...postUrls];
    console.log(`[sitemap] Generated sitemap with ${postUrls.length} posts`);
    return result;
  } catch (error) {
    console.error('[sitemap] Error fetching posts:', error);
    // Fallback to hub pages only
    return [
      {
        url: 'https://www.joboye.com',
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: 'https://www.joboye.com/jobs',
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.95,
      },
    ];
  }
}
