/**
 * Qualification hub taxonomy.
 *
 * Each entry defines an education-level hub page at /qualifications/{slug}.
 * The `namePattern` regex is matched against posts.name (case-insensitive)
 * to determine whether a post belongs on a hub page. A post may match multiple
 * levels (e.g. "8th to Graduate" matches 10th-pass AND graduate AND more).
 *
 * Pattern order matters only for display; matching is independent per hub.
 *
 * IMPORTANT: Patterns are POSIX ERE (not JavaScript regex). They use \m and \M
 * for word boundaries (Postgres-specific). Do NOT pass these patterns to
 * JavaScript RegExp constructors; they will fail or produce wrong results.
 * Patterns are database-only; never use in client-side code.
 */

export interface QualificationHub {
  slug: string;
  label: string;
  /** Short label for tiles / chips */
  shortLabel: string;
  description: string;
  /** Postgres-compatible regex (POSIX ERE, case-insensitive via ~*) */
  namePattern: string;
  /** Rough search volume tier for internal prioritisation */
  priority: 1 | 2 | 3;
}

export const QUALIFICATIONS: QualificationHub[] = [
  {
    slug: "10th-pass",
    label: "10th Pass Jobs",
    shortLabel: "10th Pass",
    description:
      "Government jobs open to 10th pass / Matriculation candidates. No college degree required.",
    namePattern:
      "\\m(10th|matricul|class[- ]x[^i]|class[- ]10|high school|sslc|hslc|secondary school certificate|10th?\\s*pass)\\M",
    priority: 1,
  },
  {
    slug: "12th-pass",
    label: "12th Pass Jobs",
    shortLabel: "12th Pass",
    description:
      "Government jobs open to 12th pass / Intermediate / Higher Secondary candidates.",
    namePattern:
      "\\m(12th|intermediate|higher secondary|senior secondary|class[- ]xii|class[- ]12|hsc|hssc|plus[- ]?two|10\\+2|inter[- ]pass)\\M",
    priority: 1,
  },
  {
    slug: "graduate",
    label: "Graduate Jobs",
    shortLabel: "Graduate",
    description:
      "Government jobs requiring a bachelor's degree — BA, B.Sc, B.Com, BCA, BBA or any graduation.",
    namePattern:
      "\\m(graduate|graduation|b\\.a\\b|b\\.sc|b\\.com|b\\.c\\.a|b\\.b\\.a|ba\\b|bsc\\b|bcom\\b|bca\\b|bba\\b|bachelor|degree holder|degree pass|any degree)\\M",
    priority: 1,
  },
  {
    slug: "post-graduate",
    label: "Post Graduate Jobs",
    shortLabel: "Post Graduate",
    description:
      "Government jobs requiring a master's degree or post-graduation — MA, M.Sc, MBA, M.Com or equivalent.",
    namePattern:
      "\\m(post.?graduat|m\\.?a\\.?\\b|m\\.?sc|m\\.?com|m\\.?b\\.?a|master.s degree|pg degree|post graduation)\\M",
    priority: 2,
  },
  {
    slug: "diploma",
    label: "Diploma Jobs",
    shortLabel: "Diploma",
    description:
      "Government jobs for Diploma holders — Polytechnic, 3-year Diploma in Engineering or other streams.",
    namePattern:
      "\\m(diploma|polytechnic|dme|dce|dee|dae|dpharma)\\M",
    priority: 2,
  },
  {
    slug: "iti",
    label: "ITI Jobs",
    shortLabel: "ITI",
    description:
      "Government jobs for ITI / Trade Certificate holders — Electrician, Fitter, Welder, Machinist and other trades.",
    namePattern:
      "\\m(iti|trade apprentice|ncvt|scvt|artisan|craftsman|fitter|welder|electrician|machinist|turner|plumber|wireman|mechanic|carpenter|mason|painter)\\M",
    priority: 1,
  },
  {
    slug: "btech-be",
    label: "B.Tech / BE Jobs",
    shortLabel: "B.Tech/BE",
    description:
      "Government and PSU jobs for B.Tech / B.E. / Engineering graduates.",
    namePattern:
      "\\m(b\\.?e\\.?|b\\.?tech|bachelor of (engineering|technology)|engineering graduate|junior engineer|assistant engineer)\\M",
    priority: 1,
  },
  {
    slug: "mbbs",
    label: "MBBS / Medical Jobs",
    shortLabel: "MBBS",
    description:
      "Government jobs for MBBS and medical degree holders — doctors, medical officers, resident doctors.",
    namePattern:
      "\\m(mbbs|md\\b|ms\\b|medical officer|medical practitioner|resident doctor|junior resident|senior resident|bds|dental surgeon|ayurvedic|homoeopathic)\\M",
    priority: 2,
  },
  {
    slug: "law-llb",
    label: "Law / LLB Jobs",
    shortLabel: "LLB/Law",
    description:
      "Government jobs requiring an LLB / law degree — legal advisors, public prosecutors, judicial service.",
    namePattern:
      "\\m(llb|ll\\.b|law (degree|graduate|officer)|legal (officer|advisor|adviser|assistant|counsel)|public prosecutor|advocate|judicial)\\M",
    priority: 2,
  },
  {
    slug: "fresher",
    label: "Fresher Jobs",
    shortLabel: "Freshers",
    description:
      "Government jobs that welcome fresh candidates — no prior experience required.",
    namePattern:
      "\\m(apprentice|trainee|fresh|probationer|probationary officer|direct recruit|junior|grade[- ]?iii|group[- ]?c|group[- ]?d)\\M",
    priority: 1,
  },
];

export function getQualification(slug: string): QualificationHub | undefined {
  return QUALIFICATIONS.find((q) => q.slug === slug);
}

export function qualificationHref(slug: string): string {
  return `/qualifications/${slug}`;
}

export const FEATURED_QUALIFICATIONS = QUALIFICATIONS.filter(
  (q) => q.priority === 1
);
