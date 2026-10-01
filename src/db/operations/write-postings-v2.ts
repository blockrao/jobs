/**
 * Ingestion writer.
 *
 * Replaces the previous version of this file, which could not have
 * successfully run against the live database: it wrote columns
 * (rawTitle, rawContent, contentHash, scrapedAt, applicationDeadline,
 * lastCrawledAt...) that don't exist on the real `postings` table, imported
 * from a schema-v2.ts that had drifted from reality and was cast `as any`
 * to suppress the resulting type errors rather than fix them. It also used
 * keyword/substring matching for recruitment and position resolution — the
 * mechanism that produced the "PSU General Recruitment" catch-all bucket.
 *
 * This version: writes only real, verified columns (schema.ts, checked
 * against live information_schema — see the comment block above the
 * canonical-entity-layer tables in that file); uses real identity-key
 * resolution (src/ingest/resolve.ts); and persists every fact the adapters
 * already extract (eligibility, vacancies, location, apply/official URLs,
 * postNames) instead of discarding them, which normalize() used to do.
 */

import { getDb } from "../index";
import { postings, organizations, sources, sourceDocuments } from "../schema";
import type { DedupedPosting } from "../../ingest/deduplicate";
import type { NormalizedPosting } from "../../ingest/normalize";
import { inferStage, reviewStatusForConfidence } from "../../ingest/normalize";
import { loadExamSlugs } from "../../ingest/exam-linker";
import { resolveRecruitment, resolvePost, truncateForColumn } from "../../ingest/resolve";
import { evaluateContentQuality } from "../../lib/content-quality/gate";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

function hashContent(title: string, description: string): string {
  return crypto.createHash("sha256").update(`${title}|${description}`).digest("hex");
}

// Year for recruitment identity: prefer a real captured date over regex
// guessing off the title.
function recruitmentYear(raw: NormalizedPosting): number | null {
  if (raw.datePosted) return raw.datePosted.getFullYear();
  if (raw.examDate) return raw.examDate.getFullYear();
  const match = `${raw.title} ${raw.description ?? ""}`.match(/20\d{2}/);
  return match ? parseInt(match[0], 10) : null;
}

// Organizations used to be lookup-only here ("creating organizations on the
// fly is out of scope — that's a reference-data decision"), which quietly
// skipped every posting whose organization wasn't already seeded. That was
// masking the real problem: inferOrg() (src/ingest/adapters/util.ts) used to
// collapse distinct real employers (NTPC/SAIL/ONGC/... , every IIT/
// university) into one shared category row. Now that inferOrg returns the
// real specific name, lookup-only would just mean those specific names get
// silently skipped instead of silently mis-bucketed — worse, not better. So
// this resolves the same way recruitments/posts/sources already do:
// find-by-slug, else create, racing safely via onConflictDoNothing.
async function getOrCreateOrganization(
  db: ReturnType<typeof getDb>,
  slug: string,
  name: string,
  sector: NormalizedPosting["organizationSector"],
  state: string | undefined,
) {
  const existing = await db.query.organizations.findFirst({ where: eq(organizations.slug, slug) });
  if (existing) return existing;

  const safeSlug = truncateForColumn(slug, 160);
  const safeName = truncateForColumn(name, 200);
  await db
    .insert(organizations)
    .values({
      slug: safeSlug,
      name: safeName,
      sector: sector || "GOVERNMENT_CENTRAL",
      state: state ?? null,
    })
    .onConflictDoNothing({ target: organizations.slug });

  const created = await db.query.organizations.findFirst({ where: eq(organizations.slug, safeSlug) });
  if (!created) {
    throw new Error(`getOrCreateOrganization: slug "${safeSlug}" conflicted but no row found`);
  }
  return created;
}

async function getOrCreateSource(db: ReturnType<typeof getDb>, portalSlug: string, sampleUrl: string) {
  const existing = await db.query.sources.findFirst({ where: eq(sources.slug, portalSlug) });
  if (existing) return existing;
  let origin = sampleUrl;
  try {
    origin = new URL(sampleUrl).origin;
  } catch {
    /* keep sampleUrl as-is if it isn't a parseable URL */
  }
  const [created] = await db
    .insert(sources)
    .values({
      slug: portalSlug,
      name: portalSlug,
      url: origin,
      authority: "AGGREGATED",
      isOfficial: false,
    })
    .returning();
  return created;
}

async function getOrCreateSourceDocument(
  db: ReturnType<typeof getDb>,
  sourceId: number,
  externalId: string,
  sourceUrl: string,
  rawContent: string,
) {
  const existing = await db.query.sourceDocuments.findFirst({
    where: and(eq(sourceDocuments.sourceId, sourceId), eq(sourceDocuments.externalId, externalId)),
  });
  if (existing) {
    await db
      .update(sourceDocuments)
      .set({ rawContent, extractedAt: new Date(), extractionMethod: "web_scraper" })
      .where(eq(sourceDocuments.id, existing.id));
    return existing.id;
  }
  const [created] = await db
    .insert(sourceDocuments)
    .values({
      sourceId,
      sourceUrl,
      documentType: "posting",
      externalId,
      contentHash: hashContent(sourceUrl, rawContent),
      publishedAt: new Date(),
      rawContent,
      extractedAt: new Date(),
      extractionMethod: "web_scraper",
    })
    .returning({ id: sourceDocuments.id });
  return created.id;
}

export async function writePostingsToDB(
  dedupedPostings: DedupedPosting[],
  normalized: NormalizedPosting[],
): Promise<{ inserted: number; updated: number; skipped: number; resolved: number; total: number }> {
  const db = getDb();
  let inserted = 0,
    updated = 0,
    skipped = 0,
    resolved = 0;

  const examSlugs = await loadExamSlugs();

  for (let i = 0; i < dedupedPostings.length; i++) {
    const deduped = dedupedPostings[i];
    const norm = normalized[i];

    if ((deduped.primary.confidence || 0) < 40) {
      skipped++;
      continue;
    }

    const org = await getOrCreateOrganization(
      db,
      norm.organizationSlug,
      norm.organizationName,
      norm.organizationSector,
      norm.organizationState,
    );

    const examId = norm.examSlug ? examSlugs.get(norm.examSlug) ?? null : null;
    const sourcePortal = deduped.sources[0]?.portal || "unknown";

    // --- Resolve onto the canonical entity layer (identity-key based) ---
    const recruitment = await resolveRecruitment(
      db,
      {
        organizationId: org.id,
        examId,
        year: recruitmentYear(norm),
        officialNotificationNumber: null, // not yet captured by any adapter
        title: norm.title,
      },
      norm.slug,
    );

    let postId: number | null = null;
    const extractedJobTitle = norm.postNames?.[0]?.trim();
    if (extractedJobTitle) {
      const post = await resolvePost(
        db,
        {
          recruitmentId: recruitment.id,
          name: extractedJobTitle,
          positionCategory: "OTHER",
        },
        `${norm.slug}-post`,
      );
      postId = post.id;
    }
    // No extractedJobTitle -> postId stays null. The gate already treats a
    // missing extracted title as a Tier A blocker; we don't fabricate a
    // Post name from the scraped headline to work around that.
    if (recruitment.created || postId) resolved++;

    // --- Provenance: persist the raw capture, not just a confidence score ---
    const rawContent = [norm.title, norm.description, norm.eligibility].filter(Boolean).join("\n\n");
    const source = await getOrCreateSource(db, sourcePortal, norm.sourceUrl);
    const sourceDocumentId = await getOrCreateSourceDocument(
      db,
      source.id,
      norm.externalId,
      norm.sourceUrl,
      rawContent,
    );

    const baseConfidence = deduped.primary.confidence ?? 0;
    const confidenceScore = postId
      ? Math.min(100, baseConfidence + 15)
      : recruitment.created === false
        ? Math.min(100, baseConfidence + 5)
        : baseConfidence;

    const currentStage = inferStage(deduped.primary);

    // postings.title/locationCity/locationRegion are varchar-bounded, but
    // the scraped text feeding them isn't (see src/ingest/resolve.ts for the
    // live crash this same bug class caused on recruitments.name — a full
    // portal headline, district list and all, exceeding a 220-char column).
    const safeTitle = truncateForColumn(norm.title, 220);
    const safeLocationCity = norm.locationCity ? truncateForColumn(norm.locationCity, 120) : null;
    const safeLocationRegion = norm.locationRegion ? truncateForColumn(norm.locationRegion, 120) : null;

    // --- Content quality gate (src/lib/content-quality/gate.ts) ---
    const gate = evaluateContentQuality({
      title: safeTitle,
      totalVacancies: norm.totalVacancies ?? null,
      eligibility: norm.eligibility ?? null,
      description: norm.description ?? null,
      locationCity: norm.locationCity ?? null,
      locationRegion: norm.locationRegion ?? null,
      applyUrl: norm.applyUrl ?? null,
      officialNotificationUrl: norm.officialNotificationUrl ?? null,
      currentStage,
      validThrough: norm.validThrough ?? null,
      postNames: norm.postNames ?? null,
      isCanonical: deduped.sources.length === 1,
      canonicalSlug: norm.slug,
      slug: norm.slug,
    });

    const existingPosting = await db.query.postings.findFirst({
      where: and(eq(postings.source, sourcePortal), eq(postings.externalId, norm.externalId)),
    });

    const sharedFields = {
      title: safeTitle,
      kind: norm.kind,
      organizationId: org.id,
      examId,
      postNames: norm.postNames ?? [],
      description: norm.description || "",
      eligibility: norm.eligibility ?? null,
      totalVacancies: norm.totalVacancies ?? null,
      ageLimitMin: norm.ageLimitMin ?? null,
      ageLimitMax: norm.ageLimitMax ?? null,
      applicationFeeGeneral: norm.applicationFeeGeneral ?? null,
      applicationFeeReserved: norm.applicationFeeReserved ?? null,
      locationCity: safeLocationCity,
      locationRegion: safeLocationRegion,
      locationCountry: norm.locationCountry ?? "India",
      salaryMin: norm.salaryMin ?? null,
      salaryMax: norm.salaryMax ?? null,
      salaryCurrency: norm.salaryCurrency ?? "INR",
      salaryPeriod: norm.salaryPeriod ?? "MONTH",
      officialNotificationUrl: norm.officialNotificationUrl ?? null,
      applyUrl: norm.applyUrl ?? null,
      currentStage,
      validThrough: norm.validThrough ?? null,
      examDate: norm.examDate ?? null,
      inferredRecruitmentId: recruitment.id,
      inferredPostId: postId,
      confidenceScore,
      confidence: Math.round(baseConfidence),
      isCanonical: deduped.sources.length === 1,
      canonicalSlug: norm.slug,
      sourceId: source.id,
      sourceDocumentId,
      sourcePortals: deduped.sources.map((s) => s.portal),
      indexTier: gate.tier,
      qualityMissing: gate.missing,
      qualityEvaluatedAt: new Date(),
      updatedAt: new Date(),
    } as const;

    if (!existingPosting) {
      await db.insert(postings).values({
        ...sharedFields,
        slug: norm.slug,
        source: sourcePortal,
        externalId: norm.externalId,
        sourceUrl: norm.sourceUrl,
        ingestedAt: new Date(),
        confidence: Math.round(baseConfidence),
        reviewStatus: reviewStatusForConfidence(confidenceScore),
        status: "ACTIVE",
        datePosted: norm.datePosted ?? new Date(),
        createdAt: new Date(),
      });
      inserted++;
    } else {
      await db
        .update(postings)
        .set({ ...sharedFields, reviewStatus: reviewStatusForConfidence(confidenceScore) })
        .where(and(eq(postings.source, sourcePortal), eq(postings.externalId, norm.externalId)));
      updated++;
    }
  }

  return { inserted, updated, skipped, resolved, total: dedupedPostings.length };
}
