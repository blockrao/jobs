#!/usr/bin/env node
/**
 * Post Title Standardization Migration
 *
 * Transforms non-SEO post titles into SEO-friendly format:
 * Before: "Sub Engineer", "Faculty", "Research Associate III"
 * After:  "Sub Engineer - Madhya Pradesh Employees Selection Board 2026"
 *
 * This script is safe: validates all changes before applying.
 * Run with: npx tsx scripts/migrate-post-titles.ts [--dry-run] [--count=N]
 */

import postgres from 'postgres';

// Parse CLI arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const countMatch = args.find(a => a.startsWith('--count='));
const limit = countMatch ? parseInt(countMatch.split('=')[1]) : null;

interface PostData {
  id: number;
  currentTitle: string;
  positionName: string | null;
  orgName: string | null;
  recruitmentSlug: string | null;
}

interface Migration {
  postId: number;
  oldTitle: string;
  newTitle: string;
  reason: string;
}

/**
 * Extract 4-digit year from recruitment slug
 * Examples: "org-name-2026-01" → "2026", "org-name" → null
 */
function extractYear(slug: string | null): string | null {
  if (!slug) return null;
  const match = slug.match(/\b(20\d{2})\b/);
  return match?.[1] ?? null;
}

/**
 * Generate new SEO-friendly title
 */
function generateTitle(position: string | null, org: string | null, year: string | null): string {
  const pos = (position || 'Position').trim();

  // Truncate long org names but preserve readability
  const truncateOrg = (o: string) => {
    if (o.length <= 45) return o;
    // Try to cut at word boundary
    const cut = o.substring(0, 42);
    return cut.substring(0, cut.lastIndexOf(' ')) + '…';
  };

  const orgPart = (org ? truncateOrg(org.trim()) : 'Position').trim();
  const yearPart = year ? ` ${year}` : '';

  return `${pos} - ${orgPart}${yearPart}`;
}

/**
 * Validate title quality
 */
function isGoodTitle(title: string): boolean {
  // Should be long enough for SEO, but not excessive
  return title.length >= 30 && title.length <= 200;
}

async function main() {
  console.log('🚀 Post Title Standardization Migration');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (applying changes)'}`);
  if (limit) console.log(`Limit: ${limit} posts`);
  console.log('');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const sql = postgres(dbUrl, { ssl: 'require' });

  try {
    // Fetch all posts with position/org data
    console.log('📊 Fetching posts...');
    const postsQuery = `
      SELECT
        p.id,
        p.title as "currentTitle",
        pos.name as "positionName",
        o.name as "orgName",
        r.slug as "recruitmentSlug"
      FROM posts p
      LEFT JOIN positions pos ON p.position_id = pos.id
      LEFT JOIN recruitments r ON p.recruitment_id = r.id
      LEFT JOIN organizations o ON r.organization_id = o.id
      ${limit ? `LIMIT ${limit}` : ''}
      ORDER BY p.id
    `;

    const posts = await sql.unsafe(postsQuery) as PostData[];
    console.log(`✓ Found ${posts.length} posts\n`);

    // Generate new titles
    const migrations: Migration[] = [];
    let unchanged = 0;
    let improvements = 0;
    let issues: string[] = [];

    for (const post of posts) {
      const year = extractYear(post.recruitmentSlug);
      const newTitle = generateTitle(post.positionName, post.orgName, year);

      if (newTitle === post.currentTitle) {
        unchanged++;
      } else if (!isGoodTitle(newTitle)) {
        issues.push(
          `Post #${post.id}: Generated title too short/long: "${newTitle}" (${newTitle.length} chars)`
        );
      } else {
        improvements++;
        migrations.push({
          postId: post.id,
          oldTitle: post.currentTitle,
          newTitle,
          reason: year ? 'Added org & year' : 'Added org name',
        });
      }
    }

    // Report
    console.log('📋 ANALYSIS');
    console.log(`   Total posts:     ${posts.length}`);
    console.log(`   Unchanged:       ${unchanged}`);
    console.log(`   Improvements:    ${improvements}`);
    console.log(`   Issues:          ${issues.length}\n`);

    if (issues.length > 0) {
      console.log('⚠️  ISSUES TO REVIEW:');
      issues.slice(0, 5).forEach(i => console.log(`   - ${i}`));
      if (issues.length > 5) console.log(`   ... and ${issues.length - 5} more`);
      console.log('');
    }

    if (migrations.length === 0) {
      console.log('ℹ️  No changes needed.');
      return;
    }

    // Show sample
    console.log('📝 SAMPLE CHANGES:');
    migrations.slice(0, 3).forEach(m => {
      console.log(`   #${m.postId}:`);
      console.log(`   - OLD: "${m.oldTitle}"`);
      console.log(`   + NEW: "${m.newTitle}"\n`);
    });
    if (migrations.length > 3) {
      console.log(`   ... and ${migrations.length - 3} more changes\n`);
    }

    // Apply if not dry run
    if (dryRun) {
      console.log('🔒 DRY RUN: No changes applied');
      console.log(`Ready to apply ${migrations.length} changes when run without --dry-run`);
    } else {
      console.log('💾 APPLYING CHANGES...');

      // Update in batches
      const batchSize = 100;
      for (let i = 0; i < migrations.length; i += batchSize) {
        const batch = migrations.slice(i, i + batchSize);

        for (const m of batch) {
          await sql`
            UPDATE posts
            SET title = ${m.newTitle}
            WHERE id = ${m.postId}
          `;
        }

        console.log(`✓ Applied batch ${Math.floor(i / batchSize) + 1} (${Math.min(batchSize, batch.length)} posts)`);
      }

      console.log(`\n✅ SUCCESS: Applied ${migrations.length} title improvements`);
    }

  } catch (err) {
    console.error('❌ ERROR:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
