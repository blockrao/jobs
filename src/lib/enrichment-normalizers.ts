/**
 * Enrichment Normalizers
 *
 * Typed adapters that convert the several real JSONB shapes stored in
 * post_enrichments into stable, render-safe representations.
 *
 * Rules:
 *  - Source text is preserved; never fabricate a value that doesn't exist.
 *  - Unknown or uninterpretable shapes are silently dropped (return null/[]),
 *    so the UI never renders a blank or garbled section from bad data.
 *  - The `source` field (e.g. "xlsx_freejobsalert") is provenance metadata;
 *    it must never appear in user-facing UI.
 *  - Normalization is a display concern only — these adapters change nothing
 *    about resolver gating, structured data, or verification status.
 *
 * Confirmed DB shapes (from post_enrichments audit, 2026-10-12):
 *
 *  selectionProcess (53 rows total):
 *    A. string[]                            — 41 rows  (e.g. ["Shortlisting", "Interview"])
 *    B. {step, name, description?, ...}[]   —  1 row   (full rich shape)
 *    C. {step, label, description}[]        —  9 rows  (label not name)
 *    D. {stage}[]                           —  1 row   (only "stage" key)
 *
 *  eligibilityPathways (211 rows total):
 *    E. {source, pathway}[]                 — 199 rows (stub — pathway name only)
 *    F. {label, text}[]                     —   9 rows
 *    G. {description, experienceYears, pathway, qualifications}[]  — 1 row (full)
 *    H. {qualification}[]                   —   2 rows
 *
 *  education (3 rows total):
 *    I.  {degree, university?, registration?}  — 1 row (canonical)
 *    J.  {degree, notes?, preferred?}          — 1 row
 *    K.  {qualification_options: string[]}     — 1 row
 *
 *  experience (3 rows total):
 *    L.  {minYears, domains, countedFrom?, notes?}  — 2 rows (canonical)
 *    M.  {"<role label>": "<text>"}                 — 1 row (keyed object)
 */

// ── Selection Process ─────────────────────────────────────────────────────────

export interface NormalizedStage {
  /** Display name of the stage (never undefined after normalization). */
  name: string;
  /** Step number if available; null otherwise. */
  step: number | null;
  totalMarks?: number;
  duration?: string;
  minQualifyingMarks?: Record<string, number>;
  description?: string;
}

/**
 * Normalize any known `selectionProcess` JSONB shape into `NormalizedStage[]`.
 * Unknown or empty values return an empty array.
 */
export function normalizeSelectionProcess(raw: unknown): NormalizedStage[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  return raw
    .map((item): NormalizedStage | null => {
      // Shape A: plain string element
      if (typeof item === "string") {
        const trimmed = item.trim();
        return trimmed ? { name: trimmed, step: null } : null;
      }

      if (typeof item !== "object" || item === null) return null;

      const obj = item as Record<string, unknown>;

      // Shape D: {stage} only
      if (typeof obj.stage === "string") {
        const s = obj.stage.trim();
        return s ? { name: s, step: null } : null;
      }

      // Shape B & C: object with step + name OR label
      const name =
        typeof obj.name === "string" && obj.name.trim()
          ? obj.name.trim()
          : typeof obj.label === "string" && obj.label.trim()
          ? obj.label.trim()
          : null;

      if (!name) return null;

      const step = typeof obj.step === "number" ? obj.step : null;

      const result: NormalizedStage = { name, step };
      if (typeof obj.totalMarks === "number") result.totalMarks = obj.totalMarks;
      if (typeof obj.duration === "string" && obj.duration.trim())
        result.duration = obj.duration.trim();
      if (
        typeof obj.minQualifyingMarks === "object" &&
        obj.minQualifyingMarks !== null
      )
        result.minQualifyingMarks = obj.minQualifyingMarks as Record<
          string,
          number
        >;
      if (typeof obj.description === "string" && obj.description.trim())
        result.description = obj.description.trim();

      return result;
    })
    .filter((s): s is NormalizedStage => s !== null);
}

// ── Eligibility Pathways ──────────────────────────────────────────────────────

export type NormalizedPathwayKind =
  | "stub"         // just a name (from {source, pathway} stubs)
  | "label-text"   // label + explanatory text
  | "full"         // full structured pathway with qualifications
  | "qualification"; // single qualification string

export interface NormalizedPathway {
  kind: NormalizedPathwayKind;
  /** Always a non-empty display label. */
  label: string;
  description?: string;
  qualifications?: string[];
  experienceYears?: number;
}

/**
 * Normalize any known `eligibilityPathways` JSONB shape into
 * `NormalizedPathway[]`. Provenance fields (source) are stripped from output.
 */
export function normalizeEligibilityPathways(raw: unknown): NormalizedPathway[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  return raw
    .map((item): NormalizedPathway | null => {
      if (typeof item !== "object" || item === null) return null;
      const obj = item as Record<string, unknown>;

      // Shape G: full structured pathway
      if (
        typeof obj.description === "string" &&
        (typeof obj.pathway === "string" || typeof obj.pathway === "number")
      ) {
        const label =
          typeof obj.pathway === "string"
            ? obj.pathway.trim() || "Pathway"
            : `Pathway ${obj.pathway}`;
        const result: NormalizedPathway = {
          kind: "full",
          label,
          description: obj.description.trim(),
        };
        if (Array.isArray(obj.qualifications) && obj.qualifications.length > 0) {
          result.qualifications = obj.qualifications
            .map((q) => String(q).trim())
            .filter(Boolean);
        }
        if (typeof obj.experienceYears === "number") {
          result.experienceYears = obj.experienceYears;
        }
        return result;
      }

      // Shape F: {label, text}
      if (typeof obj.label === "string" && typeof obj.text === "string") {
        const label = obj.label.trim();
        const text = obj.text.trim();
        if (!label && !text) return null;
        return {
          kind: "label-text",
          label: label || text,
          description: label ? text : undefined,
        };
      }

      // Shape H: {qualification}
      if (typeof obj.qualification === "string" && obj.qualification.trim()) {
        return {
          kind: "qualification",
          label: obj.qualification.trim(),
        };
      }

      // Shape E: {source, pathway} stub — pathway is the display name
      if (typeof obj.pathway === "string" && obj.pathway.trim()) {
        return {
          kind: "stub",
          label: obj.pathway.trim(),
        };
      }
      // numeric pathway without description (defensive)
      if (typeof obj.pathway === "number") {
        return { kind: "stub", label: `Pathway ${obj.pathway}` };
      }

      return null;
    })
    .filter((p): p is NormalizedPathway => p !== null);
}

// ── Education ─────────────────────────────────────────────────────────────────

export interface NormalizedEducation {
  /** Primary degree/qualification label. */
  degree?: string;
  university?: string;
  notes?: string;
  /**
   * Additional qualification note (e.g. "Master's degree preferred").
   * Stored as a free-text string in the DB — not a boolean flag.
   */
  preferredNote?: string;
  /** For qualification_options shape: list of accepted qualifications. */
  options?: string[];
}

/** Normalize any known education JSONB shape. */
export function normalizeEducation(
  raw: unknown
): NormalizedEducation | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  // Shape K: {qualification_options: string[]}
  if (Array.isArray(obj.qualification_options)) {
    const opts = obj.qualification_options
      .map((o) => String(o).trim())
      .filter(Boolean);
    return opts.length > 0 ? { options: opts } : null;
  }

  // Shape I & J: {degree, ...}
  if (typeof obj.degree === "string" && obj.degree.trim()) {
    const result: NormalizedEducation = { degree: obj.degree.trim() };
    if (typeof obj.university === "string" && obj.university.trim())
      result.university = obj.university.trim();
    if (typeof obj.notes === "string" && obj.notes.trim())
      result.notes = obj.notes.trim();
    // `preferred` is stored as a free-text string note, not a boolean.
    if (typeof obj.preferred === "string" && obj.preferred.trim())
      result.preferredNote = obj.preferred.trim();
    return result;
  }

  return null;
}

// ── Experience ────────────────────────────────────────────────────────────────

export interface NormalizedExperience {
  /** Canonical structured shape. */
  minYears?: number;
  domains?: string[];
  countedFrom?: string;
  notes?: string;
  /** For keyed-object shape: raw entries (role → description). */
  keyedEntries?: Array<{ role: string; description: string }>;
}

/** Normalize any known experience JSONB shape. */
export function normalizeExperience(
  raw: unknown
): NormalizedExperience | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  // Shape L: canonical {minYears, domains, ...}
  if (typeof obj.minYears === "number") {
    const result: NormalizedExperience = { minYears: obj.minYears };
    if (Array.isArray(obj.domains))
      result.domains = obj.domains.map((d) => String(d).trim()).filter(Boolean);
    if (typeof obj.countedFrom === "string" && obj.countedFrom.trim())
      result.countedFrom = obj.countedFrom.trim();
    if (typeof obj.notes === "string" && obj.notes.trim())
      result.notes = obj.notes.trim();
    return result;
  }

  // Shape M: keyed object {"<role>": "<description>", ...}
  const entries = Object.entries(obj)
    .map(([role, desc]) => ({
      role: role.trim(),
      description: String(desc).trim(),
    }))
    .filter((e) => e.role && e.description);

  return entries.length > 0 ? { keyedEntries: entries } : null;
}
