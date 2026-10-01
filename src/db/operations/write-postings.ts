import { getDb } from "../index";
import { postings, postingUpdates, organizations, exams } from "../schema";
import type { DedupedPosting } from "../../ingest/deduplicate";
import type { NormalizedPosting } from "../../ingest/normalize";
import { inferStage, isStageAdvance } from "../../ingest/normalize";
import { loadExamSlugs } from "../../ingest/exam-linker";
import { eq, and } from "drizzle-orm";

export async function writePostingsToDB(
  dedupedPostings: DedupedPosting[],
  normalized: NormalizedPosting[]
) {
  const db = getDb();
  let inserted = 0,
    updated = 0,
    skipped = 0;

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

    // Ensure organization exists
    const orgResult = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, norm.organizationSlug))
      .limit(1);

    let orgId: number;
    if (orgResult.length === 0) {
      // Create new organization
      const newOrg = await db
        .insert(organizations)
        .values({
          slug: norm.organizationSlug,
          name: deduped.organizationName,
          sector: "GOVERNMENT_CENTRAL", // Default; can be refined later
          websiteUrl: deduped.primary.officialNotificationUrl || undefined,
        })
        .returning({ id: organizations.id });
      orgId = newOrg[0].id;
    } else {
      orgId = orgResult[0].id;
    }

    // Check if posting exists by source + externalId (dedup key)
    const sourcePortal = deduped.sources[0]?.portal || 'unknown';
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

    const primaryScore = deduped.primary.confidence || 0;
    const currentStage = inferStage(deduped.primary);

    if (existingPosting.length === 0) {
      // Insert new posting
      const newPosting = await db
        .insert(postings)
        .values({
          slug: norm.slug,
          title: deduped.primary.title,
          kind: deduped.primary.kind || "GOVERNMENT",
          organizationId: orgId,
          examId: examId || undefined, // Link to exam if detected
          currentStage,
          description: deduped.primary.description || "",
          eligibility: deduped.primary.eligibility,
          totalVacancies: deduped.primary.totalVacancies,
          salaryMin: deduped.primary.salaryMin,
          salaryMax: deduped.primary.salaryMax,
          locationCity: deduped.locationCity,
          officialNotificationUrl: deduped.primary.officialNotificationUrl,
          applyUrl: deduped.primary.applyUrl,
          validThrough: deduped.deadline,
          source: sourcePortal,
          externalId: deduped.primary.externalId,
          sourceUrl: deduped.primary.sourceUrl,
          ingestedAt: new Date(),
          confidence: primaryScore,
          reviewStatus: primaryScore >= 70 ? "APPROVED" : "PENDING",
          datePosted: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: postings.id });

      inserted++;

      // Create timeline updates
      for (const stage of norm.timeline) {
        await db.insert(postingUpdates).values({
          postingId: newPosting[0].id,
          stage: stage.stage as any, // Drizzle will validate enum
          title: `${stage.stage.replace(/_/g, " ")} - ${deduped.organizationName}`,
          eventDate: stage.date,
          createdAt: new Date(),
        });
      }
    } else {
      // Update existing posting
      const existingId = existingPosting[0].id;
      await db
        .update(postings)
        .set({
          title: deduped.primary.title,
          examId: examId || undefined, // Update exam link if detected
          currentStage,
          description: deduped.primary.description || "",
          eligibility: deduped.primary.eligibility,
          totalVacancies: deduped.primary.totalVacancies,
          salaryMin: deduped.primary.salaryMin,
          salaryMax: deduped.primary.salaryMax,
          locationCity: deduped.locationCity,
          officialNotificationUrl: deduped.primary.officialNotificationUrl,
          applyUrl: deduped.primary.applyUrl,
          validThrough: deduped.deadline,
          confidence: primaryScore,
          reviewStatus: primaryScore >= 70 ? "APPROVED" : "PENDING",
          updatedAt: new Date(),
        })
        .where(eq(postings.id, existingId));

      updated++;

      // Update or create timeline entries for stage progression
      const existingPost = existingPosting[0];
      if (
        existingPost.currentStage &&
        isStageAdvance(existingPost.currentStage, currentStage)
      ) {
        // Stage has progressed; add new timeline entry
        await db.insert(postingUpdates).values({
          postingId: existingId,
          stage: currentStage as any,
          title: `${currentStage.replace(/_/g, " ")} - ${deduped.organizationName}`,
          eventDate: new Date(),
          createdAt: new Date(),
        });
      }

      // Add any new timeline stages from normalized timeline
      if (norm.timeline.length > 0) {
        const existingUpdates = await db
          .select({ stage: postingUpdates.stage })
          .from(postingUpdates)
          .where(eq(postingUpdates.postingId, existingId));

        const existingStages = new Set(existingUpdates.map((u) => u.stage));

        for (const stage of norm.timeline) {
          if (!existingStages.has(stage.stage)) {
            await db.insert(postingUpdates).values({
              postingId: existingId,
              stage: stage.stage as any,
              title: `${stage.stage.replace(/_/g, " ")} - ${deduped.organizationName}`,
              eventDate: stage.date,
              createdAt: new Date(),
            });
          }
        }
      }
    }
  }

  return { inserted, updated, skipped, total: dedupedPostings.length };
}
