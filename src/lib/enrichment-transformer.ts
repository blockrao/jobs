/**
 * Enrichment Transformer — Phase 1B to EnrichmentSchema
 *
 * Converts Phase 1B enrichment format (with meta, core, salary, vacancies_breakdown, etc.)
 * to the EnrichmentSchema format expected by the UI.
 *
 * Phase 1B Structure:
 * - meta: extraction metadata
 * - core: basic job info
 * - salary: min/max monthly pay
 * - vacancies_breakdown: array of {category, count, location}
 * - eligibility: {age_limit, education, experience}
 * - application: {deadline, fee, method}
 * - selection_process: array of {name, step, total_marks}
 * - job_terms: {tenure, posting_location, transferable}
 * - reference: {fja_url, official_url, notification_link}
 */

import type { EnrichmentSchema } from '@/types/enrichment-schema';

interface Phase1BEnrichment {
  meta?: {
    extraction_timestamp?: string;
    source?: string;
    confidence_score?: number;
    verified?: boolean;
  };
  core?: {
    job_title?: string;
    organization?: string;
    total_vacancies?: number;
    posting_location?: string;
    job_type?: string;
  };
  salary?: {
    monthly_min?: number;
    monthly_max?: number;
    currency?: string;
    raw?: string;
  };
  vacancies_breakdown?: Array<{
    category?: string;
    count?: number;
    location?: string;
  }>;
  eligibility?: {
    age_limit?: {
      min?: number;
      max?: number;
      text?: string;
    };
    education?: Array<{
      id?: string;
      degree?: string;
      specialization?: string;
      minimumMarks?: number;
    }>;
    experience?: {
      years_required?: number;
      job_title?: string;
      description?: string;
      [key: string]: any;
    };
  };
  application?: {
    deadline?: string;
    application_fee?: number;
    application_method?: string;
    [key: string]: any;
  };
  selection_process?: Array<{
    name?: string;
    step?: number;
    total_marks?: number;
    stage?: number;
    stageName?: string;
    description?: string;
  }>;
  job_terms?: {
    tenure?: string;
    posting_location?: string;
    transferable?: boolean;
  };
  reference?: {
    fja_url?: string;
    official_url?: string;
    notification_link?: string;
  };
  [key: string]: any;
}

/**
 * Transform Phase 1B enrichment to EnrichmentSchema format
 */
export function transformPhase1BToEnrichmentSchema(
  phase1b: Phase1BEnrichment | null | undefined
): EnrichmentSchema | null {
  if (!phase1b || typeof phase1b !== 'object') {
    return null;
  }

  const enrichment: EnrichmentSchema = {};

  // ── Education & Experience ──────────────────────────────────────────────
  if (phase1b.eligibility?.education && Array.isArray(phase1b.eligibility.education)) {
    enrichment.education = {
      mandatory: phase1b.eligibility.education
        .map((e: any) => {
          const parts = [];
          if (e.degree) parts.push(e.degree);
          if (e.specialization) parts.push(`(${e.specialization})`);
          return parts.join(' ');
        })
        .filter(Boolean),
    };
  }

  if (phase1b.eligibility?.experience) {
    const exp = phase1b.eligibility.experience;
    enrichment.experience = {
      years_required: exp.years_required,
      job_title: exp.job_title,
      note: exp.description,
    };
  }

  // ── Age Limit ──────────────────────────────────────────────────────────
  if (phase1b.eligibility?.age_limit) {
    const age = phase1b.eligibility.age_limit;
    if (age.text) {
      enrichment.age_limit = age.text;
    } else if (age.min != null || age.max != null) {
      const parts = [];
      if (age.min != null) parts.push(`minimum ${age.min} years`);
      if (age.max != null) parts.push(`maximum ${age.max} years`);
      enrichment.age_limit = parts.join(', ');
    }
  }

  // ── Salary ─────────────────────────────────────────────────────────────
  if (phase1b.salary) {
    enrichment.payLevel = {
      monthly: phase1b.salary.raw,
    };

    // Build formatted monthly range if we have min/max
    if (phase1b.salary.monthly_min != null || phase1b.salary.monthly_max != null) {
      const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
      if (phase1b.salary.monthly_min != null && phase1b.salary.monthly_max != null) {
        enrichment.payLevel.monthly = `${inr(phase1b.salary.monthly_min)} – ${inr(phase1b.salary.monthly_max)}/month`;
      } else if (phase1b.salary.monthly_min != null) {
        enrichment.payLevel.monthly = `From ${inr(phase1b.salary.monthly_min)}/month`;
      } else if (phase1b.salary.monthly_max != null) {
        enrichment.payLevel.monthly = `Up to ${inr(phase1b.salary.monthly_max)}/month`;
      }
    }
  }

  // ── Vacancies by Category ──────────────────────────────────────────────
  if (phase1b.vacancies_breakdown && Array.isArray(phase1b.vacancies_breakdown)) {
    enrichment.vacanciesByCategory = {};
    phase1b.vacancies_breakdown.forEach((v: any) => {
      if (v.category && v.count != null) {
        const key = v.category.toLowerCase().replace(/\s+/g, '_');
        enrichment.vacanciesByCategory![key] = v.count;
      }
    });
    if (Object.keys(enrichment.vacanciesByCategory).length === 0) {
      delete enrichment.vacanciesByCategory;
    }
  }

  // ── Application Dates & Fee ────────────────────────────────────────────
  if (phase1b.application) {
    const app = phase1b.application;
    if (app.deadline) {
      const isoDate = formatToISO(app.deadline);
      if (isoDate) {
        enrichment.applicationClosingDate = isoDate;
      }
    }

    if (!enrichment.howToApply) {
      enrichment.howToApply = {};
    }
    if (app.application_method) {
      enrichment.howToApply.method = app.application_method;
    }
  }

  // ── Selection Process ──────────────────────────────────────────────────
  if (phase1b.selection_process && Array.isArray(phase1b.selection_process)) {
    enrichment.selectionProcess = phase1b.selection_process
      .map((s: any) => ({
        stage: s.step ?? s.stage,
        name: s.name ?? s.stageName,
        description: s.description,
      }))
      .filter((s: any) => s.name || s.stage != null);
  }

  // ── Official Links ─────────────────────────────────────────────────────
  if (phase1b.reference) {
    enrichment.officialLinks = {
      notification_pdf: phase1b.reference.notification_link,
      official_website: phase1b.reference.official_url,
      fja_source: phase1b.reference.fja_url,
    };
  }

  // Return null if no fields were populated
  if (Object.keys(enrichment).length === 0) {
    return null;
  }

  return enrichment;
}

/**
 * Check if enrichment data is in Phase 1B format
 */
export function isPhase1BEnrichment(data: unknown): data is Phase1BEnrichment {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  // Phase 1B has these top-level keys
  return !!(
    obj.meta ||
    obj.core ||
    obj.salary ||
    obj.vacancies_breakdown ||
    obj.eligibility ||
    obj.application ||
    obj.selection_process ||
    obj.job_terms ||
    obj.reference
  );
}

/**
 * Format various date formats to ISO string
 */
function formatToISO(dateInput: string | Date | null | undefined): string | null {
  if (!dateInput) return null;
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

/**
 * Get raw Phase 1B enrichment data (before transformation)
 * Useful for debugging and rendering raw data
 */
export function getPhase1BRawData(
  enrichment: unknown
): Phase1BEnrichment | null {
  if (!isPhase1BEnrichment(enrichment)) return null;
  return enrichment as Phase1BEnrichment;
}
