/**
 * Exam linking — matches job postings to known exams by title/description analysis.
 *
 * Maintains a canonical map of exam keywords → exam slugs. Uses keyword-based matching
 * to auto-detect which exam a posting relates to, with confidence scoring.
 */

import { getDb } from "@/db";
import { exams } from "@/db/schema";
import { eq } from "drizzle-orm";

interface ExamMatch {
  slug: string;
  confidence: number; // 0-100
  matchType: "exact" | "keyword" | "acronym";
}

// Exam keyword map: keyword patterns → exam slug(s)
// Ordered by specificity (longest/most specific first)
const EXAM_KEYWORDS: Record<string, string[]> = {
  // SSC exams
  "ssc combined graduate level": ["ssc-cgl"],
  "ssc cgl": ["ssc-cgl"],
  "ssc chsl": ["ssc-chsl"],
  "combined higher secondary": ["ssc-chsl"],
  "ssc mts": ["ssc-mts"],
  "multi tasking staff": ["ssc-mts"],
  "ssc gd": ["ssc-gd"],
  "general duty": ["ssc-gd"],
  "ssc je": ["ssc-je"],
  "junior engineer": ["ssc-je"],
  "ssc selection post": ["ssc-selection-post"],

  // UPSC exams
  "upsc ias": ["upsc-ias"],
  "union public service commission": ["upsc-ias"],
  "civil service examination": ["upsc-ias"],
  "upsc ips": ["upsc-ips"],
  "indian police service": ["upsc-ips"],

  // Railway exams
  "rrb ntpc": ["rrb-ntpc"],
  "railway recruitment board": ["rrb-ntpc"],
  "railway asm": ["rrb-asm"],
  "railway asi": ["rrb-asi"],
  "railway constable": ["rrb-constable"],

  // Banking exams
  "ibps po": ["ibps-po"],
  "probationary officer": ["ibps-po"],
  "ibps so": ["ibps-so"],
  "specialist officer": ["ibps-so"],
  "ibps clerk": ["ibps-clerk"],
  "sbi po": ["sbi-po"],
  "state bank": ["sbi-po"],

  // Police exams
  "delhi police constable": ["delhi-police-constable"],
  "delhi police asi": ["delhi-police-asi"],

  // Teaching exams
  "teaching dsssb": ["teaching-dsssb"],
  "delhi dsssb": ["teaching-dsssb"],

  // State PSCs (sampling - more can be added)
  "bpsc": ["bpsc-ias"],
  "bihar psc": ["bpsc-ias"],
  "hpsc": ["hpsc-ias"],
  "haryana psc": ["hpsc-ias"],
  "jpsc": ["jpsc-ias"],
  "jharkhand psc": ["jpsc-ias"],
  "rpsc": ["rpsc-ias"],
  "rajasthan psc": ["rpsc-ias"],
  "uppsc": ["uppsc-ias"],
  "uttar pradesh psc": ["uppsc-ias"],
  "apsc": ["apsc-ias"],
  "andhra psc": ["apsc-ias"],
  "kpsc": ["kpsc-ias"],
  "karnataka psc": ["kpsc-ias"],
  "tnpsc": ["tnpsc-ias"],
  "tamil nadu psc": ["tnpsc-ias"],
  "telangana psc": ["telangana-psc-ias"],

  // Insurance exams
  "insurance ato": ["insurance-ato"],
  "insurance assistant": ["insurance-ato"],
};

// Acronym map for quick matching (e.g. "SSC CGL" → ssc-cgl)
const ACRONYM_MAP: Record<string, string> = {
  "ssc cgl": "ssc-cgl",
  "ssc chsl": "ssc-chsl",
  "ssc mts": "ssc-mts",
  "ssc gd": "ssc-gd",
  "ssc je": "ssc-je",
  "upsc ias": "upsc-ias",
  "upsc ips": "upsc-ips",
  "rrb ntpc": "rrb-ntpc",
  "ibps po": "ibps-po",
  "ibps so": "ibps-so",
  "ibps clerk": "ibps-clerk",
  "sbi po": "sbi-po",
  "sbi clerk": "sbi-clerk",
  "bpsc": "bpsc-ias",
  "hpsc": "hpsc-ias",
  "jpsc": "jpsc-ias",
  "rpsc": "rpsc-ias",
  "uppsc": "uppsc-ias",
  "apsc": "apsc-ias",
  "kpsc": "kpsc-ias",
  "tnpsc": "tnpsc-ias",
};

/**
 * Detect exam slug from posting title/description.
 * Returns the best match with confidence score, or null if no match found.
 */
export function detectExamSlug(title: string, description?: string): ExamMatch | null {
  const text = `${title} ${description || ""}`.toLowerCase();

  // Try acronym matches first (highest confidence)
  for (const [acronym, slug] of Object.entries(ACRONYM_MAP)) {
    if (text.includes(acronym)) {
      return {
        slug,
        confidence: 85,
        matchType: "acronym",
      };
    }
  }

  // Try keyword matches (ordered by specificity)
  for (const [keyword, slugs] of Object.entries(EXAM_KEYWORDS)) {
    if (text.includes(keyword.toLowerCase())) {
      return {
        slug: slugs[0], // Return first slug if multiple matches
        confidence: 70,
        matchType: "keyword",
      };
    }
  }

  return null;
}

/**
 * Load all exam slugs from database for validation.
 * Cache can be passed to avoid repeated DB queries in batch operations.
 */
export async function loadExamSlugs(
  cache?: Map<string, number>
): Promise<Map<string, number>> {
  if (cache) return cache;

  const db = getDb();
  const allExams = await db.select({ slug: exams.slug, id: exams.id }).from(exams);

  const slugMap = new Map<string, number>();
  for (const exam of allExams) {
    slugMap.set(exam.slug, exam.id);
  }

  return slugMap;
}

/**
 * Validate and resolve exam slug to exam ID.
 * Returns exam ID if exam exists, null otherwise.
 */
export async function resolveExamId(
  examSlug: string | undefined,
  slugMap?: Map<string, number>
): Promise<number | null> {
  if (!examSlug) return null;

  if (slugMap) {
    return slugMap.get(examSlug) ?? null;
  }

  // Fallback: query DB directly
  const db = getDb();
  const exam = await db.select({ id: exams.id }).from(exams).where(eq(exams.slug, examSlug)).limit(1);

  return exam[0]?.id ?? null;
}
