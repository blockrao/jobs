/**
 * Enrichment Schema — Single Source of Truth for FJA Extraction
 *
 * This TypeScript interface defines the canonical structure for all enriched
 * post data extracted from FreeJobAlert. It serves as:
 * - Contract for scraper output
 * - Type definition for database storage
 * - Source for dynamic component rendering
 *
 * All fields are optional (posts may be partially enriched).
 * Add new data types here; the dynamic renderer auto-updates.
 */

export interface EnrichmentSchema {
  // ── TAB 1: Overview / Eligibility Criteria ──────────────────────────────

  /** Educational requirements */
  education?: {
    mandatory?: string[];
    preferred?: string[];
    note?: string;
  };

  /** Experience requirements */
  experience?: {
    years_required?: number;
    job_title?: string;
    preferred_with?: string[];
    note?: string;
  };

  /** Additional requirements (skills, registrations, etc.) */
  additional_requirements?: string[];

  /** Age limit information */
  age_limit?: string;
  age_note?: string;

  // ── TAB 2: Vacancy Breakdown ────────────────────────────────────────────

  /** Vacancies by category (SC, ST, OBC, EWS, GEN) */
  vacanciesByCategory?: {
    general_unreserved?: number;
    obc?: number;
    ews?: number;
    sc?: number;
    st?: number;
    [key: string]: number | undefined;
  };

  /** Vacancies by location (if available) */
  vacanciesByLocation?: {
    [location: string]: number;
  };

  /** Additional vacancy details */
  vacancy_details?: {
    total?: number;
    by_category?: Record<string, number>;
    note?: string;
  };

  // ── TAB 3: How to Apply ─────────────────────────────────────────────────

  /** Application method and step-by-step instructions */
  howToApply?: {
    method?: string; // e.g., "Offline Application", "Online Portal"
    steps?: string[]; // Numbered steps
    address?: string; // Postal address if offline
    email?: string;
    portal_url?: string;
    contact?: {
      person?: string;
      department?: string;
      phone?: string;
    };
  };

  /** Application dates */
  applicationOpenDate?: string; // ISO date: 2026-10-13
  applicationClosingDate?: string; // ISO date: 2026-11-03

  // ── TAB 4: Required Documents ───────────────────────────────────────────

  /** List of required documents */
  documents?: string[];

  /** Structured documents with details */
  documentsDetailed?: Array<{
    name: string;
    format?: string; // e.g., "Photocopy", "Original"
    note?: string;
  }>;

  // ── TAB 5: Selection Process ────────────────────────────────────────────

  /** Stages of selection process */
  selectionProcess?: Array<{
    stage?: number;
    name?: string; // e.g., "Interview", "Medical Examination"
    description?: string;
  }>;

  // ── TAB 6: Pay & Compensation ───────────────────────────────────────────

  /** Pay structure */
  payLevel?: {
    hourly?: string;
    daily_max?: string;
    monthly?: string;
    max_hours_per_day?: number;
    contract_max_days?: number;
    note?: string;
  };

  // ── TAB 7: Important Instructions ───────────────────────────────────────

  /** Key terms and conditions */
  keyInstructions?: string[];

  /** Job responsibilities/duties */
  jobDescription?: string[];

  /** Important notes */
  importantNotes?: string[];

  // ── TAB 8: Official Links ───────────────────────────────────────────────

  /** Official documents and links */
  officialLinks?: {
    notification_pdf?: string;
    application_form?: string;
    official_website?: string;
    [key: string]: string | undefined;
  };

  // ── Metadata ────────────────────────────────────────────────────────────

  /** Source and extraction metadata */
  fja_extraction_metadata?: {
    source_url?: string;
    extraction_confidence?: number; // 0-1
    data_types_extracted?: number;
    extraction_timestamp?: string;
  };
}

/**
 * Validate enrichment data against schema.
 * Returns { valid: boolean, errors: string[] }
 */
export function validateEnrichment(data: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    errors.push("Enrichment must be an object");
    return { valid: false, errors };
  }

  const obj = data as Record<string, unknown>;

  // Validate specific fields if present
  if (obj.vacanciesByCategory && typeof obj.vacanciesByCategory !== "object") {
    errors.push("vacanciesByCategory must be an object");
  }

  if (obj.applicationOpenDate && typeof obj.applicationOpenDate !== "string") {
    errors.push("applicationOpenDate must be a string (ISO date)");
  }

  if (obj.applicationClosingDate && typeof obj.applicationClosingDate !== "string") {
    errors.push("applicationClosingDate must be a string (ISO date)");
  }

  if (obj.documents && !Array.isArray(obj.documents)) {
    errors.push("documents must be an array");
  }

  if (obj.howToApply && typeof obj.howToApply !== "object") {
    errors.push("howToApply must be an object");
  }

  if (obj.selectionProcess && !Array.isArray(obj.selectionProcess)) {
    errors.push("selectionProcess must be an array");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Extract tab data from enrichment schema.
 * Used by the dynamic renderer to populate tabs.
 */
export function getEnrichmentTabs(enrichment: EnrichmentSchema): Array<{
  id: string;
  label: string;
  data: unknown;
  isEmpty: boolean;
}> {
  return [
    {
      id: "eligibility",
      label: "Eligibility",
      data: {
        education: enrichment.education,
        experience: enrichment.experience,
        additional_requirements: enrichment.additional_requirements,
        age_limit: enrichment.age_limit,
        age_note: enrichment.age_note,
      },
      isEmpty: !enrichment.education && !enrichment.experience && !enrichment.additional_requirements && !enrichment.age_limit,
    },
    {
      id: "vacancies",
      label: "Vacancies",
      data: {
        by_category: enrichment.vacanciesByCategory,
        by_location: enrichment.vacanciesByLocation,
        details: enrichment.vacancy_details,
      },
      isEmpty: !enrichment.vacanciesByCategory && !enrichment.vacanciesByLocation && !enrichment.vacancy_details,
    },
    {
      id: "how-to-apply",
      label: "How to Apply",
      data: {
        method: enrichment.howToApply?.method,
        steps: enrichment.howToApply?.steps,
        address: enrichment.howToApply?.address,
        contact: enrichment.howToApply?.contact,
        dates: {
          open: enrichment.applicationOpenDate,
          close: enrichment.applicationClosingDate,
        },
      },
      isEmpty: !enrichment.howToApply && !enrichment.applicationOpenDate && !enrichment.applicationClosingDate,
    },
    {
      id: "documents",
      label: "Documents",
      data: {
        documents: enrichment.documents,
        detailed: enrichment.documentsDetailed,
      },
      isEmpty: !enrichment.documents && !enrichment.documentsDetailed,
    },
    {
      id: "selection",
      label: "Selection Process",
      data: enrichment.selectionProcess,
      isEmpty: !enrichment.selectionProcess || enrichment.selectionProcess.length === 0,
    },
    {
      id: "pay",
      label: "Pay & Benefits",
      data: enrichment.payLevel,
      isEmpty: !enrichment.payLevel,
    },
    {
      id: "instructions",
      label: "Important Info",
      data: {
        key_instructions: enrichment.keyInstructions,
        job_description: enrichment.jobDescription,
        notes: enrichment.importantNotes,
      },
      isEmpty: !enrichment.keyInstructions && !enrichment.jobDescription && !enrichment.importantNotes,
    },
    {
      id: "links",
      label: "Official Links",
      data: enrichment.officialLinks,
      isEmpty: !enrichment.officialLinks || Object.keys(enrichment.officialLinks).length === 0,
    },
  ];
}
