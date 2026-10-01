/**
 * Publishing & Editorial Dashboard Queries
 *
 * Implements safe publishing rules:
 * - Public queries only return AUTOMATED_VALIDATION_PASS and PUBLISHED postings
 * - Editorial queries show DRAFT postings flagged for review
 * - ARCHIVED postings hidden from active listings
 */

import { getDbV2 } from "@/db";
import { postings } from "@/db/schema-v2";
import { eq, inArray, and, desc } from "drizzle-orm";

export interface PostingForPublishing {
  id: number;
  slug: string;
  title: string;
  organization: { id: number; name: string };
  dataCompletenessStatus: string;
  publishingStatus: string;
  verificationStatus: string;
  sourceConfidence: number;
  lastVerifiedAt: Date | null;
}

export interface PostingForReview {
  id: number;
  slug: string;
  title: string;
  organizationName: string;
  dataCompletenessStatus: string;
  publishingStatus: string;
  verificationStatus: string;
  flaggedForReview: boolean;
  reviewNotes: string | null;
  sourceConfidence: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get active postings for public listing
 * Only returns COMPLETE postings that have passed automated validation or manual review
 */
export async function getActivePostings(limit = 50, offset = 0) {
  const db = getDbV2();
  if (!db) return [];

  return db
    .select()
    .from(postings)
    .where(
      and(
        eq(postings.reviewStatus, "APPROVED"),
        inArray(postings.publishingStatus, [
          "AUTOMATED_VALIDATION_PASS",
          "PUBLISHED",
        ]),
        eq(postings.dataCompletenessStatus, "COMPLETE")
      )
    )
    .orderBy(desc(postings.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get postings requiring editorial review
 * Shows DRAFT postings and those flagged for manual verification
 */
export async function getPostingsForReview(limit = 50, offset = 0) {
  const db = getDbV2();
  if (!db) return [];

  return db
    .select({
      id: postings.id,
      slug: postings.slug,
      title: postings.title,
      dataCompletenessStatus: postings.dataCompletenessStatus,
      publishingStatus: postings.publishingStatus,
      verificationStatus: postings.verificationStatus,
      flaggedForReview: postings.flaggedForReview,
      reviewNotes: postings.reviewNotes,
      sourceConfidence: postings.sourceConfidence,
      createdAt: postings.createdAt,
      updatedAt: postings.updatedAt,
    })
    .from(postings)
    .where(
      and(
        eq(postings.reviewStatus, "APPROVED"),
        inArray(postings.publishingStatus, ["DRAFT", "PENDING_REVIEW"]),
        eq(postings.flaggedForReview, true)
      )
    )
    .orderBy(desc(postings.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get count of postings by publishing status
 */
export async function getPublishingStatusCounts() {
  const db = getDbV2();
  if (!db) return {};

  const result = await db
    .select({
      status: postings.publishingStatus,
      count: postings.id,
    })
    .from(postings)
    .where(eq(postings.reviewStatus, "APPROVED"));

  const counts: Record<string, number> = {};
  result.forEach((row) => {
    if (row.status) {
      counts[row.status] = (counts[row.status] || 0) + 1;
    }
  });
  return counts;
}

/**
 * Mark a posting as manually reviewed and ready for publication
 */
export async function approvePostingForPublication(postingId: number) {
  const db = getDbV2();
  if (!db) return false;

  await db
    .update(postings)
    .set({
      publishingStatus: "PUBLISHED",
      verificationStatus: "MANUALLY_VERIFIED",
      lastVerifiedAt: new Date(),
      flaggedForReview: false,
    })
    .where(eq(postings.id, postingId));

  return true;
}

/**
 * Flag a posting for further review (needs more data extraction)
 */
export async function flagPostingForReview(
  postingId: number,
  notes: string
) {
  const db = getDbV2();
  if (!db) return false;

  await db
    .update(postings)
    .set({
      publishingStatus: "PENDING_REVIEW",
      verificationStatus: "FLAGGED_FOR_REVIEW",
      flaggedForReview: true,
      reviewNotes: notes,
    })
    .where(eq(postings.id, postingId));

  return true;
}

/**
 * Archive a posting (remove from active listings)
 */
export async function archivePosting(postingId: number, reason = "Manual archival") {
  const db = getDbV2();
  if (!db) return false;

  await db
    .update(postings)
    .set({
      publishingStatus: "ARCHIVED",
      status: "ARCHIVED",
      reviewNotes: reason,
    })
    .where(eq(postings.id, postingId));

  return true;
}

/**
 * Get publishing dashboard stats for admin
 */
export async function getPublishingDashboardStats() {
  const db = getDbV2();
  if (!db) return null;

  const result = await db
    .select({
      total: postings.id,
      publishingStatus: postings.publishingStatus,
      dataCompletenessStatus: postings.dataCompletenessStatus,
      flaggedForReview: postings.flaggedForReview,
    })
    .from(postings)
    .where(eq(postings.reviewStatus, "APPROVED"));

  return {
    total: result.length,
    byPublishingStatus: Object.groupBy(result, (r) => r.publishingStatus),
    byCompletenessStatus: Object.groupBy(
      result,
      (r) => r.dataCompletenessStatus
    ),
    flaggedForReviewCount: result.filter((r) => r.flaggedForReview).length,
    readyToPublish: result.filter(
      (r) => r.publishingStatus === "AUTOMATED_VALIDATION_PASS"
    ).length,
  };
}
