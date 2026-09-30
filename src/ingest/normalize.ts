import { createHash } from "node:crypto";
import type { postings } from "../db/schema";
import type { RawPosting } from "./types";
import type { DedupedPosting } from "./deduplicate";

type PostingStage = (typeof postings.$inferSelect)["currentStage"];

export interface NormalizedPosting {
  slug: string;
  organizationSlug: string;
  title: string;
  titleHi?: string;
  description?: string;
  descriptionHi?: string;
  timeline: Array<{
    stage: PostingStage;
    date: Date;
  }>;
}

// Progression order for lifecycle stages. A higher index means "later" in the
// recruitment lifecycle. Used to decide whether a re-ingested posting has
// advanced (and therefore should get a new timeline entry). Private-job stages
// (ACTIVE/FILLED/CLOSED) are ordered after the govt result stages so a private
// posting going ACTIVE->CLOSED still counts as forward progress.
export const STAGE_ORDER: PostingStage[] = [
  "NOTIFICATION_OUT",
  "APPLICATION_OPEN",
  "APPLICATION_CLOSED",
  "ADMIT_CARD_RELEASED",
  "EXAM_SCHEDULED",
  "EXAM_CONDUCTED",
  "ANSWER_KEY_OUT",
  "OBJECTION_WINDOW",
  "RESULT_OUT",
  "MERIT_LIST_OUT",
  "INTERVIEW_SCHEDULED",
  "FINAL_RESULT_OUT",
  "ACTIVE",
  "FILLED",
  "CLOSED",
];

export function stageRank(stage: PostingStage): number {
  const i = STAGE_ORDER.indexOf(stage);
  return i === -1 ? 0 : i;
}

export function isStageAdvance(from: PostingStage, to: PostingStage): boolean {
  return stageRank(to) > stageRank(from);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 180);
}

// Deterministic slug: same (source, externalId) always yields the same slug,
// so re-ingestion maps to the existing canonical URL. The short hash keeps
// slugs unique across sources/titles without leaking ids.
export function deterministicSlug(
  source: string,
  externalId: string,
  title: string,
): string {
  const hash = createHash("sha1")
    .update(`${source}:${externalId}`)
    .digest("hex")
    .slice(0, 6);
  const base = slugify(title) || "posting";
  return `${base}-${hash}`;
}

// Ordered keyword rules — first match wins (checked latest-stage-first so that
// e.g. "result declared" beats an earlier "admit card" mention in the text).
const STAGE_KEYWORDS: { stage: PostingStage; patterns: RegExp[] }[] = [
  { stage: "FINAL_RESULT_OUT", patterns: [/final\s+result/i] },
  { stage: "MERIT_LIST_OUT", patterns: [/merit\s+list/i, /cut\s?off\s+list/i] },
  { stage: "RESULT_OUT", patterns: [/result\s+(out|declared|released|announced)/i, /\bresult\b/i] },
  { stage: "OBJECTION_WINDOW", patterns: [/objection/i] },
  { stage: "ANSWER_KEY_OUT", patterns: [/answer\s*key/i] },
  { stage: "EXAM_CONDUCTED", patterns: [/exam\s+(conducted|concluded|over)/i] },
  { stage: "ADMIT_CARD_RELEASED", patterns: [/admit\s*card/i, /hall\s*ticket/i, /call\s*letter/i] },
  { stage: "EXAM_SCHEDULED", patterns: [/exam\s+(date|schedule)/i] },
  { stage: "APPLICATION_CLOSED", patterns: [/last\s+date\s+(over|passed)/i, /application\s+closed/i] },
  { stage: "APPLICATION_OPEN", patterns: [/apply\s+online/i, /application\s+(open|start|begin|invited)/i, /online\s+application/i] },
  { stage: "NOTIFICATION_OUT", patterns: [/notification/i, /recruitment/i, /vacanc/i] },
];

export function inferStage(raw: RawPosting): PostingStage {
  if (raw.stage) return raw.stage;
  const text = `${raw.title}\n${raw.stageHintText ?? ""}`;
  for (const { stage, patterns } of STAGE_KEYWORDS) {
    if (patterns.some((p) => p.test(text))) return stage;
  }
  // Default: private jobs are "ACTIVE"; govt notifications start at the top.
  return raw.kind === "PRIVATE" ? "ACTIVE" : "NOTIFICATION_OUT";
}

// Confidence >= this is auto-approved; below it lands in the moderation queue.
export const AUTO_APPROVE_THRESHOLD = 70;

export function reviewStatusForConfidence(
  confidence: number | undefined,
): "APPROVED" | "PENDING" {
  if (confidence == null) return "PENDING";
  return confidence >= AUTO_APPROVE_THRESHOLD ? "APPROVED" : "PENDING";
}

export function normalize(
  dedupedPostings: DedupedPosting[]
): NormalizedPosting[] {
  return dedupedPostings.map((deduped) => {
    const raw = deduped.primary;
    const sourceKey = deduped.sources[0]?.portal || 'unknown';
    const slug = deterministicSlug(sourceKey, raw.externalId, raw.title);
    const organizationSlug = raw.organizationSlug || slugify(deduped.organizationName);

    // Build timeline from inferred stages
    const timeline: Array<{ stage: PostingStage; date: Date }> = [];

    // Always start with notification
    if (raw.datePosted) {
      timeline.push({
        stage: "NOTIFICATION_OUT",
        date: raw.datePosted,
      });
    }

    // Add exam date if present
    if (raw.examDate) {
      timeline.push({
        stage: "EXAM_SCHEDULED",
        date: raw.examDate,
      });
    }

    // Add deadline (APPLICATION_CLOSED) if present
    if (deduped.deadline) {
      timeline.push({
        stage: "APPLICATION_CLOSED",
        date: deduped.deadline,
      });
    }

    // Infer current stage from title/description
    const inferredStage = inferStage(raw);
    timeline.push({
      stage: inferredStage,
      date: new Date(), // Current time as placeholder
    });

    // Sort by date
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      slug,
      organizationSlug,
      title: raw.title,
      titleHi: raw.title, // TODO: Implement Hindi translation
      description: raw.description,
      descriptionHi: raw.description, // TODO: Implement Hindi translation
      timeline,
    };
  });
}
