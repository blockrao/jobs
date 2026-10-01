import { getDb } from "../index";
import { postings, organizations, exams, recruitments, posts as postsTable, positions } from "../schema-v2";
import type { DedupedPosting } from "../../ingest/deduplicate";
import type { NormalizedPosting } from "../../ingest/normalize";
import { inferStage } from "../../ingest/normalize";
import { loadExamSlugs } from "../../ingest/exam-linker";
import { eq, and, like, sql } from "drizzle-orm";

/**
 * Extract year from posting title/content
 * Looks for patterns like "2024", "2025", etc.
 */
function extractYear(text: string): number | null {
  const yearMatch = text.match(/20\d{2}/);
  return yearMatch ? parseInt(yearMatch[0], 10) : null;
}

/**
 * Match position by title pattern
 * Uses basic text matching against known position names
 */
async function inferPositionId(
  title: string,
  description: string
): Promise<number | null> {
  const db = getDb();
  const searchText = `${title} ${description}`.toLowerCase();

  // Try exact slug match first
  const patterns = [
    { slug: "constable", keywords: ["constable", "gd", "general duty"] },
    { slug: "aso", keywords: ["assistant section officer", "aso"] },
    { slug: "jso", keywords: ["junior statistical officer", "jso"] },
    { slug: "ias", keywords: ["ias", "ips", "ifs", "administrative service"] },
    { slug: "sub-inspector", keywords: ["sub inspector", "si", "upper"] },
    { slug: "head-constable", keywords: ["head constable", "hc"] },
  ];

  for (const pattern of patterns) {
    if (pattern.keywords.some((keyword) => searchText.includes(keyword))) {
      const result = await db
        .select()
        .from(positions)
        .where(eq(positions.slug, pattern.slug))
        .limit(1);

      if (result.length > 0) {
        return result[0].id;
      }
    }
  }

  return null;
}

/**
 * Find matching recruitment by organization and year
 */
async function inferRecruitmentId(
  organizationSlug: string,
  year: number | null,
  title: string
): Promise<{ id: number; confidenceScore: number } | null> {
  const db = getDb();

  // Get organization
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, organizationSlug))
    .limit(1);

  if (!org || org.length === 0) {
    return null;
  }

  // Search for recruitment by year and title similarity
  const recruits = await db
    .select()
    .from(recruitments)
    .where(eq(recruitments.organizationId, org[0].id));

  for (const rec of recruits) {
    // Exact year match
    if (year && rec.year === year) {
      return { id: rec.id, confidenceScore: 90 };
    }

    // Title substring match
    if (rec.name.toLowerCase().includes(title.toLowerCase().substring(0, 20))) {
      return { id: rec.id, confidenceScore: 75 };
    }
  }

  return null;
}

export async function writePostingsToDB(
  dedupedPostings: DedupedPosting[],
  normalized: NormalizedPosting[]
) {
  const db = getDb();
  let inserted = 0,
    updated = 0,
    skipped = 0,
    inferred = 0,
    orphaned = 0;

  // Pre-load all exam slugs to avoid repeated DB queries
  const examSlugs = await loadExamSlugs();

  for (let i = 0; i < dedupedPostings.length; i++) {
    const deduped = dedupedPostings[i];
    const norm = normalized[i];

    // Skip low-confidence postings
    if ((deduped.primary.confidence || 0) < 40) {
      skipped++;
      continue;
    }

    // Resolve exam slug to exam ID if provided
    const examId = norm.examSlug ? examSlugs.get(norm.examSlug) || null : null;

    // Get or create organization (from organizations_new table in schema-v2)
    const orgResult = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, norm.organizationSlug))
      .limit(1);

    let orgId: number;
    if (orgResult.length === 0) {
      // For now, skip if organization doesn't exist in schema-v2
      // In production, might need a fallback
      skipped++;
      continue;
    } else {
      orgId = orgResult[0].id;
    }

    // ========== INFERENCE LOGIC ==========

    // Extract year from posting
    const year = extractYear(deduped.primary.title + " " + (deduped.primary.description || ""));

    // Try to infer recruitment
    let inferredRecruitmentId: number | null = null;
    let recruitmentConfidence = 0;
    const recruitmentMatch = await inferRecruitmentId(
      norm.organizationSlug,
      year,
      deduped.primary.title
    );
    if (recruitmentMatch) {
      inferredRecruitmentId = recruitmentMatch.id;
      recruitmentConfidence = recruitmentMatch.confidenceScore;
    }

    // Try to infer position and post
    let inferredPostId: number | null = null;
    const positionId = await inferPositionId(
      deduped.primary.title,
      deduped.primary.description || ""
    );

    if (positionId && inferredRecruitmentId) {
      // Find post linking this recruitment to position
      const postResult = await db
        .select()
        .from(postsTable)
        .where(
          and(
            eq(postsTable.recruitmentId, inferredRecruitmentId),
            eq(postsTable.positionId, positionId)
          )
        )
        .limit(1);

      if (postResult.length > 0) {
        inferredPostId = postResult[0].id;
      }
    }

    // Calculate overall confidence score
    const baseConfidence = deduped.primary.confidence || 0;
    let confidenceScore = baseConfidence;
    if (inferredRecruitmentId && inferredPostId) {
      // Boost confidence if we successfully inferred both recruitment and post
      confidenceScore = Math.min(100, baseConfidence + 15);
      inferred++;
    } else if (inferredRecruitmentId || positionId) {
      // Partial match
      confidenceScore = Math.min(100, baseConfidence + 5);
    } else {
      orphaned++;
    }

    // Check if posting exists by source + externalId (dedup key)
    const sourcePortal = deduped.sources[0]?.portal || "unknown";
    const existingPosting = await db
      .select()
      .from(postings)
      .where(
        and(
          eq(postings.source, sourcePortal),
          eq(postings.externalId, deduped.primary.externalId)
        )
      )
      .limit(1);

    if (existingPosting.length === 0) {
      // Insert new posting with inferred relationships
      await db
        .insert(postings)
        .values({
          slug: norm.slug,
          title: deduped.primary.title,
          description: deduped.primary.description || "",
          inferredRecruitmentId,
          inferredPostId,
          confidenceScore,
          isCanonical: deduped.sources.length === 1, // Single source = canonical
          canonicalSlug: norm.slug,
          status: "ACTIVE",
          source: sourcePortal,
          externalId: deduped.primary.externalId,
          sourceUrl: deduped.primary.sourceUrl,
          scrapedAt: new Date(),
          reviewStatus: confidenceScore >= 70 ? "APPROVED" : "PENDING",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

      inserted++;
    } else {
      // Update existing posting with inferred relationships
      await db
        .update(postings)
        .set({
          title: deduped.primary.title,
          description: deduped.primary.description || "",
          inferredRecruitmentId,
          inferredPostId,
          confidenceScore,
          isCanonical: deduped.sources.length === 1,
          canonicalSlug: norm.slug,
          reviewStatus: confidenceScore >= 70 ? "APPROVED" : "PENDING",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(postings.source, sourcePortal),
            eq(postings.externalId, deduped.primary.externalId)
          )
        );

      updated++;
    }
  }

  return { inserted, updated, skipped, inferred, orphaned, total: dedupedPostings.length };
}
