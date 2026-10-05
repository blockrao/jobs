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
import { postings, sources, sourceDocuments, sourceObservations } from "../schema";
import type { DedupedPosting } from "../../ingest/deduplicate";
import type { NormalizedPosting } from "../../ingest/normalize";
import { inferStage, isNonRecruitmentContent } from "../../ingest/normalize";
import { loadExamSlugs } from "../../ingest/exam-linker";
import { resolveRecruitment, resolvePostLines, truncateForColumn, normalizeAdvertisementNumber, refreshRecruitmentDates } from "../../ingest/resolve";
import { evaluateContentQuality } from "../../lib/content-quality/gate";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import { loadOrgIndex, resolveOrganization, upsertCandidate, type OrgResolution } from "../../ingest/organization-resolution";

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

async function getOrCreateSource(db: ReturnType<typeof getDb>, portalSlug: string, sampleUrl: string) {
  const existing = await db.query.sources.findFirst({ where: eq(sources.slug, portalSlug) });
  if (existing) return existing;
  void sampleUrl; // the portal address is not stored (provenance policy); sources.url is NOT NULL, so empty
  const origin = "";
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
      // Provenance policy (owner direction 2026-10-05): the source address is used in memory only
      // (hashing) and is never stored.
      sourceUrl: null,
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

// ---------------------------------------------------------------------------
// WP-001: ingestion is not publication.
//
//  * Every source record is first written as a raw observation (what the
//    source told us, when), then processed.
//  * Organization: alias or clean existing organization -> that organization;
//    anything else becomes an Organization Candidate and the record is held
//    (no posting, no recruitment, no canonical organization is created).
//  * New postings land PENDING + DRAFT. Confidence never publishes; only the
//    separate promotion step (src/ingest/promotion.ts) can.
//  * Re-ingesting an existing posting is idempotent and protected: reviewed
//    values are never overwritten (changes are flagged), review/publishing
//    status is never touched, a rejected posting is not resurrected.
// ---------------------------------------------------------------------------

export type RecordAction =
  | "inserted"
  | "updated"
  | "flagged"
  | "unchanged"
  | "held_candidate"
  | "rejected"
  | "skipped";

export interface RecordResult {
  source: string;
  externalId: string;
  action: RecordAction;
  reason?: string;
  orgResolution?: OrgResolution["kind"];
  orgMatchedOn?: string;
  orgAmbiguous?: boolean;
  candidateReason?: string;
  postLines?: import("../../ingest/resolve").PostLinesResult;
  candidateId?: number;
  postingId?: number;
  observationId?: number;
  observationIsNew?: boolean;
  filledFields?: string[];
  changedFields?: string[];
  flaggedFields?: string[];
  existingWasReviewed?: boolean;
  recruitmentOrgMismatch?: boolean;
  /** Columns written by a re-ingest (diagnostic). */
  writtenFields?: string[];
}

export interface WriteOptions {
  runId?: string;
}

export interface WriteResult {
  inserted: number;
  updated: number;
  flagged: number;
  unchanged: number;
  heldCandidates: number;
  rejected: number;
  skipped: number;
  resolved: number;
  total: number;
  results: RecordResult[];
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const o = value as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(",")}}`;
}

function iso(d: Date | undefined | null): string | null {
  return d ? d.toISOString() : null;
}

async function recordObservation(
  db: ReturnType<typeof getDb>,
  norm: NormalizedPosting,
  source: string,
  runId?: string,
): Promise<{ id: number; isNew: boolean }> {
  const facts = {
    title: norm.title,
    organization: norm.organizationName || null,
    organizationFromLabel: norm.organizationFromLabel ?? false,
    vacancies: norm.totalVacancies ?? null,
    lastDate: iso(norm.validThrough),
    startDate: iso(norm.applicationStartDate),
    examDate: iso(norm.examDate),
    notificationUrl: norm.officialNotificationUrl ?? null,
    applyUrl: norm.applyUrl ?? null,
    websiteUrl: norm.websiteUrl ?? null,
    postNames: norm.postNames ?? null,
    advertisementNumber: norm.advertisementNumber ?? null,
    stated: norm.observationFacts ?? null,
  };
  const links = norm.observationLinks ?? null;
  const contentHash = crypto.createHash("sha256").update(stableStringify({ facts, links })).digest("hex");

  const [inserted] = await db
    .insert(sourceObservations)
    .values({
      source,
      externalId: norm.externalId,
      sourceUrl: null, // not stored (provenance policy)
      observedAt: norm.observedAt ?? new Date(),
      contentHash,
      facts,
      links,
      raw: (norm.observationRaw as object | undefined) ?? null,
      runId: runId ?? null,
      outcome: "RECEIVED",
    })
    .onConflictDoNothing()
    .returning({ id: sourceObservations.id });
  if (inserted) return { id: inserted.id, isNew: true };

  const existing = await db.query.sourceObservations.findFirst({
    where: and(
      eq(sourceObservations.source, source),
      eq(sourceObservations.externalId, norm.externalId),
      eq(sourceObservations.contentHash, contentHash),
    ),
    orderBy: [desc(sourceObservations.id)],
  });
  if (!existing) throw new Error("recordObservation: conflict but no row found");
  return { id: existing.id, isNew: false };
}

async function setObservationOutcome(
  db: ReturnType<typeof getDb>,
  id: number,
  outcome: "LOADED" | "HELD_CANDIDATE" | "REJECTED" | "SKIPPED",
  reason: string | null,
  postingId?: number | null,
  candidateId?: number | null,
) {
  await db
    .update(sourceObservations)
    .set({ outcome, outcomeReason: reason, postingId: postingId ?? null, candidateId: candidateId ?? null })
    .where(eq(sourceObservations.id, id));
}

const isEmpty = (v: unknown) => v == null || v === "" || (Array.isArray(v) && v.length === 0);
function sameValue(a: unknown, b: unknown): boolean {
  if (isEmpty(a) && isEmpty(b)) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (typeof a === "object" || typeof b === "object") return JSON.stringify(a) === JSON.stringify(b);
  return a === b;
}

// Facts whose change matters to a reader (extensions, corrigenda). A change
// to one of these on a reviewed posting is flagged, never applied silently.
const MATERIAL_FIELDS = ["validThrough", "totalVacancies", "officialNotificationUrl", "applyUrl", "examDate"] as const;

// Written on every re-ingest: provenance/system bookkeeping, not editorial facts.
const PROVENANCE_FIELDS = ["sourceId", "sourceDocumentId", "sourcePortals"] as const;
// Derived from the facts; recomputed only for unreviewed rows (they drive
// the sitemap and robots decision of a reviewed page, which must not move).
const DERIVED_FIELDS = ["indexTier", "qualityMissing", "qualityEvaluatedAt", "confidence", "confidenceScore", "currentStage"] as const;
// Never written by a re-ingest: identity and editorial state.
const NEVER_FIELDS = new Set(["slug", "reviewStatus", "publishingStatus", "status", "createdAt", "ingestedAt", "isCanonical", "canonicalSlug", "kind"]);

export async function writePostingsToDB(
  dedupedPostings: DedupedPosting[],
  normalized: NormalizedPosting[],
  opts: WriteOptions = {},
): Promise<WriteResult> {
  const db = getDb();
  const out: WriteResult = {
    inserted: 0,
    updated: 0,
    flagged: 0,
    unchanged: 0,
    heldCandidates: 0,
    rejected: 0,
    skipped: 0,
    resolved: 0,
    total: dedupedPostings.length,
    results: [],
  };

  const examSlugs = await loadExamSlugs();
  const orgIndex = await loadOrgIndex(db);

  for (let i = 0; i < dedupedPostings.length; i++) {
    const deduped = dedupedPostings[i];
    const norm = normalized[i];
    const sourcePortal = deduped.sources[0]?.portal || "unknown";
    const result: RecordResult = { source: sourcePortal, externalId: norm.externalId, action: "skipped" };
    out.results.push(result);

    try {
      // 1. What the source told us, before anything is decided about it.
      const obs = await recordObservation(db, norm, sourcePortal, opts.runId);
      result.observationId = obs.id;
      result.observationIsNew = obs.isNew;

      if ((deduped.primary.confidence || 0) < 40) {
        result.action = "skipped";
        result.reason = "LOW_CONFIDENCE";
        out.skipped++;
        await setObservationOutcome(db, obs.id, "SKIPPED", result.reason);
        continue;
      }

      if (isNonRecruitmentContent(norm.title)) {
        // Result/admit-card/marksheet/syllabus content, not a job opening.
        result.action = "rejected";
        result.reason = "NON_RECRUITMENT_CONTENT";
        out.rejected++;
        await setObservationOutcome(db, obs.id, "REJECTED", result.reason);
        continue;
      }

      const existingPosting = await db.query.postings.findFirst({
        where: and(eq(postings.source, sourcePortal), eq(postings.externalId, norm.externalId)),
      });
      if (existingPosting) result.postingId = existingPosting.id;

      // 2. Organization: alias / existing clean organization, else a candidate.
      const resolution = resolveOrganization(orgIndex, norm.organizationName);
      result.orgResolution = resolution.kind;

      if (resolution.kind === "NONE") {
        result.action = "rejected";
        result.reason = resolution.reason;
        out.rejected++;
        await setObservationOutcome(db, obs.id, "REJECTED", result.reason, existingPosting?.id);
        continue;
      }

      if (resolution.kind === "CANDIDATE") {
        const candidateId = await upsertCandidate(db, {
          rawName: norm.organizationName,
          normalizedName: resolution.normalizedName,
          source: sourcePortal,
          sourceUrl: null, // not stored (provenance policy)
          evidence: {
            title: norm.title,
            fromLabel: norm.organizationFromLabel ?? false,
            advertisementNumber: norm.advertisementNumber ?? null,
            websiteUrl: norm.websiteUrl ?? null,
            notificationUrl: norm.officialNotificationUrl ?? null,
          },
          reason: resolution.reason,
          confidence: Math.round(deduped.primary.confidence ?? 0),
          proposedOrganizationId: resolution.proposedOrganizationId,
        });
        result.action = "held_candidate";
        result.reason = `ORGANIZATION_${resolution.reason}`;
        result.candidateReason = resolution.reason;
        result.candidateId = candidateId;
        out.heldCandidates++;
        await setObservationOutcome(db, obs.id, "HELD_CANDIDATE", result.reason, existingPosting?.id, candidateId);
        continue;
      }

      const org = resolution.organization;
      result.orgMatchedOn = resolution.matchedOn;
      if (resolution.kind === "EXISTING") result.orgAmbiguous = resolution.ambiguous;

      const examId = norm.examSlug ? examSlugs.get(norm.examSlug) ?? null : null;

      // 3. Resolve onto the canonical entity layer (identity-key based).
      // A posting that already points at a recruitment/post keeps them: a
      // re-ingest must be idempotent and must not re-point or consolidate
      // identities (identity consolidation is a separate, approved step).
      let recruitment: { id: number; created: boolean };
      const keptRecruitment = existingPosting?.inferredRecruitmentId
        ? await db.query.recruitments.findFirst({ where: (r, { eq: e }) => e(r.id, existingPosting.inferredRecruitmentId!) })
        : null;
      if (keptRecruitment) {
        recruitment = { id: keptRecruitment.id, created: false };
      } else {
        recruitment = await resolveRecruitment(
          db,
          {
            organizationId: org.id,
            examId,
            year: recruitmentYear(norm),
            // Strong identity key when the source states a usable advertisement number.
            officialNotificationNumber: normalizeAdvertisementNumber(norm.advertisementNumber),
            title: norm.title,
            applicationStartDate: norm.applicationStartDate ?? null,
            applicationEndDate: norm.validThrough ?? null,
          },
          norm.slug,
        );
      }

      // A later sighting fills a missing start date or extends the end date on the recruitment.
      await refreshRecruitmentDates(db, recruitment.id, {
        applicationStartDate: norm.applicationStartDate ?? null,
        applicationEndDate: norm.validThrough ?? null,
      });

      let postId: number | null = existingPosting?.inferredPostId ?? null;
      // Per-line Posts: only lines that pass the post-line classifier become Posts, and
      // a notice stands for one Post only when its table is exactly one accepted line
      // (architect unit rule). Existing Posts and an already-set posting link are never changed.
      const tableLines = norm.postTable ?? (norm.postNames ?? []).slice(0, 1).map((n) => ({ name: n, vacancies: undefined }));
      if (tableLines.length > 0) {
        const lineResult = await resolvePostLines(
          db,
          recruitment.id,
          norm.slug,
          tableLines,
          { countOptional: !norm.postTable },
        );
        result.postLines = lineResult;
        if (!postId && lineResult.singlePostId) postId = lineResult.singlePostId;
      }
      if (recruitment.created || postId) out.resolved++;

      // Does the recruitment this posting hangs off carry a different organization?
      const recRow = await db.query.recruitments.findFirst({ where: (r, { eq: e }) => e(r.id, recruitment.id) });
      if (recRow && recRow.organizationId !== org.id) result.recruitmentOrgMismatch = true;

      // 4. Provenance: persist the raw capture, not just a confidence score.
      const rawContent = [norm.title, norm.description, norm.eligibility].filter(Boolean).join("\n\n");
      const source = await getOrCreateSource(db, sourcePortal, norm.sourceUrl);
      const sourceDocumentId = await getOrCreateSourceDocument(db, source.id, norm.externalId, norm.sourceUrl, rawContent);

      const baseConfidence = deduped.primary.confidence ?? 0;
      const confidenceScore = postId
        ? Math.min(100, baseConfidence + 15)
        : recruitment.created === false
          ? Math.min(100, baseConfidence + 5)
          : baseConfidence;

      const currentStage = inferStage(deduped.primary);

      const safeTitle = truncateForColumn(norm.title, 220);
      const safeLocationCity = norm.locationCity ? truncateForColumn(norm.locationCity, 120) : null;
      const safeLocationRegion = norm.locationRegion ? truncateForColumn(norm.locationRegion, 120) : null;

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
        isCanonical: true,
        canonicalSlug: null,
        slug: norm.slug,
      });

      const incoming = {
        title: safeTitle,
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
        sourceId: source.id,
        sourceDocumentId,
        sourcePortals: deduped.sources.map((s) => s.portal),
        indexTier: gate.tier,
        qualityMissing: gate.missing,
        qualityEvaluatedAt: new Date(),
      } as const;

      if (!existingPosting) {
        const [created] = await db
          .insert(postings)
          .values({
            ...incoming,
            kind: norm.kind,
            isCanonical: true,
            canonicalSlug: null,
            slug: norm.slug,
            source: sourcePortal,
            externalId: norm.externalId,
            sourceUrl: null, // not stored (provenance policy)
            ingestedAt: new Date(),
            // Ingestion is not publication: confidence never approves.
            reviewStatus: "PENDING",
            publishingStatus: "DRAFT",
            status: "ACTIVE",
            datePosted: norm.datePosted ?? new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning({ id: postings.id });
        result.action = "inserted";
        result.postingId = created.id;
        out.inserted++;
        await setObservationOutcome(db, obs.id, "LOADED", null, created.id);
        continue;
      }

      // 5. Existing posting: idempotent, protected update.
      const reviewed = existingPosting.reviewStatus !== "PENDING";
      result.existingWasReviewed = reviewed;
      const current = existingPosting as Record<string, unknown>;
      const incomingRec = incoming as Record<string, unknown>;

      const set: Record<string, unknown> = {};
      const filled: string[] = [];
      const changed: string[] = [];
      const flaggedFields: string[] = [];
      const flagNotes: string[] = [];

      for (const key of Object.keys(incomingRec)) {
        if (NEVER_FIELDS.has(key)) continue;
        const inc = incomingRec[key];
        const cur = current[key];
        const isProvenance = (PROVENANCE_FIELDS as readonly string[]).includes(key);
        const isDerived = (DERIVED_FIELDS as readonly string[]).includes(key);
        const isMaterial = (MATERIAL_FIELDS as readonly string[]).includes(key);

        if (key === "qualityEvaluatedAt") continue; // follows indexTier below
        // Insert-time only: it depends on whether the recruitment was created in this run, so recomputing it would make re-ingest non-idempotent.
        if (key === "confidenceScore" && !isEmpty(cur)) continue;
        if (sameValue(cur, inc)) continue;

        if (isProvenance) {
          set[key] = inc;
          continue;
        }
        if (isEmpty(inc)) continue; // never blank an existing value with an absent one

        if (isEmpty(cur)) {
          // Missing value: fill, reviewed or not.
          if (isDerived && reviewed) continue;
          set[key] = inc;
          filled.push(key);
          continue;
        }

        // Both present and different.
        if (reviewed) {
          if (isMaterial) {
            flaggedFields.push(key);
            flagNotes.push(
              `${key}: current ${stableStringify(cur)} , source observation #${obs.id} says ${stableStringify(inc)}`,
            );
          }
          continue; // protected: reviewed values are never overwritten
        }
        // Unreviewed, source-derived: a newer observation may update it.
        set[key] = inc;
        if (isMaterial || key === "organizationId" || key === "inferredRecruitmentId" || key === "inferredPostId") {
          changed.push(key);
        }
      }
      if (!reviewed && (set.indexTier !== undefined || set.qualityMissing !== undefined)) set.qualityEvaluatedAt = new Date();

      if (flaggedFields.length > 0) {
        const marker = `source observation #${obs.id}`;
        if (!(existingPosting.reviewNotes ?? "").includes(marker)) {
          const note = `[WP-001 ${new Date().toISOString().slice(0, 10)}] ${flagNotes.join("; ")}`;
          set.flaggedForReview = true;
          set.reviewNotes = existingPosting.reviewNotes ? `${existingPosting.reviewNotes}\n${note}` : note;
        }
      }

      result.writtenFields = Object.keys(set);
      result.filledFields = filled;
      result.changedFields = changed;
      result.flaggedFields = flaggedFields;

      if (Object.keys(set).length === 0) {
        result.action = "unchanged";
        out.unchanged++;
      } else {
        set.updatedAt = new Date();
        await db.update(postings).set(set).where(eq(postings.id, existingPosting.id));
        if (flaggedFields.length > 0) {
          result.action = "flagged";
          out.flagged++;
        } else {
          result.action = "updated";
          out.updated++;
        }
      }
      await setObservationOutcome(db, obs.id, "LOADED", null, existingPosting.id);
    } catch (err) {
      result.action = "rejected";
      const cause = (err as { cause?: { message?: string } }).cause?.message;
      result.reason = `WRITE_ERROR: ${cause ?? (err as Error).message}`.slice(0, 300);
      out.rejected++;
      if (result.observationId) {
        await setObservationOutcome(db, result.observationId, "REJECTED", result.reason).catch(() => {});
      }
    }
  }

  return out;
}
