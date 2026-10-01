import { getDbV2 } from "../index";
import {
  postings,
  organizations,
  exams,
  recruitments,
  posts as postsTable,
  positions,
  sources,
  sourceDocuments,
  recruitmentEvents,
} from "../schema-v2";
import type { DedupedPosting } from "../../ingest/deduplicate";
import type { NormalizedPosting } from "../../ingest/normalize";
import { inferStage } from "../../ingest/normalize";
import { loadExamSlugs } from "../../ingest/exam-linker";
import { eq, and, like, sql } from "drizzle-orm";
import crypto from "crypto";

/**
 * Calculate SHA-256 hash of posting content for deduplication
 */
function hashContent(title: string, description: string): string {
  const content = `${title}|${description}`;
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Extract year from posting title/content
 */
function extractYear(text: string): number | null {
  const yearMatch = text.match(/20\d{2}/);
  return yearMatch ? parseInt(yearMatch[0], 10) : null;
}

/**
 * Match position by title pattern
 */
async function inferPositionId(
  title: string,
  description: string
): Promise<number | null> {
  const db = getDbV2();
  const searchText = `${title} ${description}`.toLowerCase();

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
  const db = getDbV2();

  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, organizationSlug))
    .limit(1);

  if (!org || org.length === 0) {
    return null;
  }

  const recruits = await db
    .select()
    .from(recruitments)
    .where(eq(recruitments.organizationId, org[0].id));

  for (const rec of recruits) {
    if (year && rec.year === year) {
      return { id: rec.id, confidenceScore: 90 };
    }

    if (rec.name.toLowerCase().includes(title.toLowerCase().substring(0, 20))) {
      return { id: rec.id, confidenceScore: 75 };
    }
  }

  return null;
}

/**
 * Get or create source_document for a posting feed
 * Links the posting back to the original source evidence
 */
async function getOrCreateSourceDocument(
  sourcePortal: string,
  externalId: string,
  sourceUrl: string,
  rawContent: string
): Promise<number> {
  const db = getDbV2();
  const contentHash = hashContent(rawContent, externalId);

  // Find existing source by portal name
  const sourceRow = await db
    .select()
    .from(sources)
    .where(like(sources.name, `%${sourcePortal}%`))
    .limit(1);

  let sourceId: number;
  if (sourceRow.length === 0) {
    // Create default aggregated source if portal not found
    const newSource = await db
      .insert(sources)
      .values({
        name: sourcePortal,
        type: "aggregator",
        authority: "AGGREGATED" as any,
        isOfficial: false,
        active: true,
      })
      .returning();
    sourceId = newSource[0].id;
  } else {
    sourceId = sourceRow[0].id;
  }

  // Try to find existing source_document
  const existingDoc = await db
    .select()
    .from(sourceDocuments)
    .where(
      and(
        eq(sourceDocuments.sourceId, sourceId),
        eq(sourceDocuments.externalId, externalId)
      )
    )
    .limit(1);

  if (existingDoc.length > 0) {
    return existingDoc[0].id;
  }

  // Create new source_document
  const newDoc = await db
    .insert(sourceDocuments)
    .values({
      sourceId: sourceId,
      url: sourceUrl,
      documentType: "posting",
      externalId: externalId,
      publishedAt: new Date(),
      contentHash: contentHash,
      rawContent: rawContent.substring(0, 10000), // Store first 10KB
      extractionMethod: "web_scraper",
    })
    .returning();

  return newDoc[0].id;
}

/**
 * Track recruitment event if important fields changed
 */
async function trackRecruitmentEvent(
  recruitmentId: number,
  sourceDocumentId: number,
  newDeadline?: Date,
  newVacancies?: number,
  eventType: string = "POSTING_UPDATED"
) {
  const db = getDbV2();

  const changedFields: Record<string, { old?: any; new?: any }> = {};
  if (newDeadline) {
    changedFields.application_deadline = { new: newDeadline.toISOString() };
  }
  if (newVacancies) {
    changedFields.vacancies = { new: newVacancies };
  }

  if (Object.keys(changedFields).length === 0) {
    return; // No changes to track
  }

  await db
    .insert(recruitmentEvents)
    .values({
      recruitmentId: recruitmentId,
      eventType: "OTHER" as any,
      eventDate: new Date(),
      title: "Posting updated in ingestion pipeline",
      description: `Updated via scraper feed: ${Object.keys(changedFields).join(", ")}`,
      changedFields: changedFields,
      sourceDocumentId: sourceDocumentId,
    })
    .onConflictDoNothing(); // Safe to ignore duplicates
}

/**
 * Write postings to database with full provenance tracking
 */
export async function writePostingsToDB(
  dedupedPostings: DedupedPosting[],
  normalized: NormalizedPosting[]
): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
  inferred: number;
  orphaned: number;
  total: number;
}> {
  const db = getDbV2();
  let inserted = 0,
    updated = 0,
    skipped = 0,
    inferred = 0,
    orphaned = 0;

  const examSlugs = await loadExamSlugs();

  for (let i = 0; i < dedupedPostings.length; i++) {
    const deduped = dedupedPostings[i];
    const norm = normalized[i];

    // Skip low-confidence postings
    if ((deduped.primary.confidence || 0) < 40) {
      skipped++;
      continue;
    }

    const examId = norm.examSlug ? examSlugs.get(norm.examSlug) || null : null;

    // Resolve organization
    const orgResult = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, norm.organizationSlug))
      .limit(1);

    let orgId: number;
    if (orgResult.length === 0) {
      skipped++;
      continue;
    } else {
      orgId = orgResult[0].id;
    }

    // Extract year for recruitment inference
    const year = extractYear(
      deduped.primary.title + " " + (deduped.primary.description || "")
    );

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

    // Try to infer position
    let inferredPostId: number | null = null;
    const positionId = await inferPositionId(
      deduped.primary.title,
      deduped.primary.description || ""
    );

    if (positionId && inferredRecruitmentId) {
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

    // Calculate confidence score
    const baseConfidence = deduped.primary.confidence || 0;
    let confidenceScore = baseConfidence;
    if (inferredRecruitmentId && inferredPostId) {
      confidenceScore = Math.min(100, baseConfidence + 15);
      inferred++;
    } else if (inferredRecruitmentId || positionId) {
      confidenceScore = Math.min(100, baseConfidence + 5);
    } else {
      orphaned++;
    }

    // ========== PROVENANCE LAYER ==========
    const sourcePortal = deduped.sources[0]?.portal || "unknown";
    const rawContent =
      deduped.primary.title +
      " " +
      (deduped.primary.description || "") +
      " " +
      (deduped.primary.eligibility || "");
    const contentHash = hashContent(
      deduped.primary.title,
      deduped.primary.description || ""
    );

    // Get or create source_document (audit trail)
    const sourceDocumentId = await getOrCreateSourceDocument(
      sourcePortal,
      deduped.primary.externalId,
      deduped.primary.sourceUrl,
      rawContent
    );

    // Get source_id
    const sourceRow = await db
      .select()
      .from(sources)
      .where(like(sources.name, `%${sourcePortal}%`))
      .limit(1);
    const sourceId =
      sourceRow.length > 0 ? sourceRow[0].id : (sourceRow[0]?.id || null);

    // Check if posting already exists
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
      // Insert new posting with provenance
      await db
        .insert(postings)
        .values({
          slug: norm.slug,
          title: deduped.primary.title,
          description: deduped.primary.description || "",
          inferredRecruitmentId,
          inferredPostId,
          confidenceScore,
          isCanonical: deduped.sources.length === 1,
          canonicalSlug: norm.slug,
          status: "ACTIVE",
          source: sourcePortal,
          externalId: deduped.primary.externalId,
          sourceUrl: deduped.primary.sourceUrl,
          scrapedAt: new Date(),
          reviewStatus: confidenceScore >= 70 ? "APPROVED" : "PENDING",
          createdAt: new Date(),
          updatedAt: new Date(),
          // NEW: Provenance fields
          sourceId: sourceId,
          sourceDocumentId: sourceDocumentId,
          rawTitle: deduped.primary.title,
          rawDescription: deduped.primary.description || "",
          rawContent: rawContent.substring(0, 50000), // Store full content
          contentHash: contentHash,
          extractedAt: new Date(),
          extractionMethod: "web_scraper",
          applicationDeadline: deduped.primary.validThrough,
          examDate: deduped.primary.examDate,
          lastCrawledAt: new Date(),
        })
        .onConflictDoNothing();

      inserted++;

      // Track event if recruitment was inferred
      if (inferredRecruitmentId) {
        await trackRecruitmentEvent(
          inferredRecruitmentId,
          sourceDocumentId,
          deduped.primary.validThrough,
          deduped.primary.totalVacancies,
          "POSTING_INGESTED"
        );
      }
    } else {
      // Update existing posting
      const old = existingPosting[0];
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
          updatedAt: new Date(),
          // Update provenance
          sourceDocumentId: sourceDocumentId,
          rawTitle: deduped.primary.title,
          rawDescription: deduped.primary.description || "",
          rawContent: rawContent.substring(0, 50000),
          contentHash: contentHash,
          extractedAt: new Date(),
          applicationDeadline: deduped.primary.validThrough,
          examDate: deduped.primary.examDate,
          lastCrawledAt: new Date(),
        })
        .where(
          and(
            eq(postings.source, sourcePortal),
            eq(postings.externalId, deduped.primary.externalId)
          )
        );

      updated++;

      // Track event if deadline changed
      if (
        old.application_deadline !==
        (deduped.primary.validThrough?.getTime() || null)
      ) {
        if (inferredRecruitmentId) {
          await trackRecruitmentEvent(
            inferredRecruitmentId,
            sourceDocumentId,
            deduped.primary.validThrough,
            deduped.primary.totalVacancies,
            "APPLICATION_DEADLINE_EXTENDED"
          );
        }
      }
    }
  }

  return { inserted, updated, skipped, inferred, orphaned, total: dedupedPostings.length };
}
