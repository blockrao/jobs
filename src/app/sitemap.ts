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
      WHERE p."isLive" = true
      ORDER BY p.updated_at DESC
    `);

    const postUrls = allPosts.map((post) => ({
      url: `https://www.joboye.com/jobs/${post.recruitment_slug}/${post.post_slug}`,
      lastModified: post.updated_at instanceof Date ? post.updated_at : new Date(post.updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));

    // Hub pages
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

    return [...hubUrls, ...postUrls];
  } catch (error) {
    console.error('[sitemap] Error fetching posts:', error);
    // Fallback to at least hub pages
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
