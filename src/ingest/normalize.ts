import { createHash } from "node:crypto";
import type { postings } from "../db/schema";
import type { RawPosting } from "./types";
import type { DedupedPosting } from "./deduplicate";
import { detectExamSlug } from "./exam-linker";

type PostingStage = (typeof postings.$inferSelect)["currentStage"];

// Carries every fact RawPosting captured (eligibility, vacancies, location,
// apply/official URLs, postNames, salary, age limits — adapters already
// extract all of this, see src/ingest/adapters/) plus what normalization
// itself computes (slug, organizationSlug, examSlug, timeline). Earlier,
// this type kept only title/description/examSlug/timeline and silently
// dropped the rest on the way to the database — the actual reason postings
// ended up missing eligibility/vacancies/location/URLs, not a gap in
// extraction.
export interface NormalizedPosting extends RawPosting {
  slug: string;
  organizationSlug: string;
  examSlug?: string;
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

/**
 * Scrubs Unicode replacement characters (U+FFFD) and other common encoding
 * artefacts introduced by mojibake in scraped content (P0-5).
 * Also collapses runs of whitespace and trims.
 */
export function scrubText(input: string | null | undefined): string | null {
  if (input == null) return null;
  return input
    .replace(/�/g, "")          // replacement character from bad encoding
    .replace(/\s{3,}/g, "  ")        // collapse runs of 3+ whitespace chars
    .trim() || null;
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

// Titles whose only real content is a result/admit-card/answer-key/
// marksheet/syllabus/seat-matrix/time-table update, with no actual
// recruitment signal (Recruitment/Vacancy/Bharti/Apply/Online Form/Posts).
// These aren't job openings — portals publish them alongside real listings
// (exam results, class 10/12 marksheets, academic syllabi) — but the
// pipeline was creating a brand-new fake Organization + Recruitment for each
// one. Confirmed live and deleted: "NEET PG 2026 Seat Matrix Out", "BSEB
// Class 10 & 12 Marksheet 2026", "MGSU Syllabus 2025-26" etc. had each
// become their own invented "organization". Properly matching these to an
// *existing* recruitment's lifecycle (advance its stage instead of minting a
// new entity) is real, separate work — until that exists, skip ingesting
// them as new entities rather than fabricate one.
const NON_RECRUITMENT_KEYWORD =
  /\b(Result|Admit\s*Card|Answer\s*Key|Time\s*Table|Seat\s*Matrix|Marksheet|Mark\s*Sheet|Syllabus|Score\s*Card|Counselling|Registration)\b/i;
// "Posts" (plural, the standard "for 500 Posts" vacancy-count phrasing) —
// not the bare singular "Post", which false-matches inside "Post Graduate",
// "Post Office", etc. and would wrongly let non-recruitment titles through.
const RECRUITMENT_SIGNAL = /\b(Recruitment|Vacanc|Bharti|Apply\s*Online|Online\s*Form|Notification|Posts)\b/i;

export function isNonRecruitmentContent(title: string): boolean {
  return NON_RECRUITMENT_KEYWORD.test(title) && !RECRUITMENT_SIGNAL.test(title);
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
    const sourceKey = deduped.sources[0]?.portal || 'JobOye HR Team';
    const slug = deterministicSlug(sourceKey, raw.externalId, raw.title);
    const organizationSlug = raw.organizationSlug || slugify(deduped.organizationName);

    const examMatch = detectExamSlug(raw.title, raw.description);
    const examSlug = examMatch?.slug;

    const timeline: Array<{ stage: PostingStage; date: Date }> = [];
    if (raw.datePosted) {
      timeline.push({ stage: "NOTIFICATION_OUT", date: raw.datePosted });
    }
    if (raw.examDate) {
      timeline.push({ stage: "EXAM_SCHEDULED", date: raw.examDate });
    }
    if (deduped.deadline) {
      timeline.push({ stage: "APPLICATION_CLOSED", date: deduped.deadline });
    }
    const inferredStage = inferStage(raw);
    timeline.push({ stage: inferredStage, date: new Date() });
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      // Every RawPosting field (eligibility, totalVacancies, location,
      // applyUrl, officialNotificationUrl, postNames, salary, age limits,
      // ...) passes through untouched. Only the fields normalize() itself
      // is responsible for computing are overridden below.
      ...raw,
      // P0-5: scrub encoding artefacts from user-visible text fields
      title: scrubText(raw.title) ?? raw.title,
      description: scrubText(raw.description) ?? raw.description,
      organizationName: scrubText(deduped.organizationName) ?? deduped.organizationName,
      slug,
      organizationSlug,
      examSlug,
      timeline,
    };
  });
}
