/**
 * Enrichment Transformer
 *
 * Transforms raw JSONB enrichment data from the database into the canonical
 * EnrichmentSchema structure expected by all page components.
 *
 * This is the SINGLE source of truth for all enrichment data transformations.
 * All enrichment data passes through this transformer before being returned
 * to the application.
 *
 * Database structure (raw JSONB):
 * - education: [{ degree, subject, specialization, source }]
 * - experience: [{ type, source, description }]
 * - selection_process: [{ step, name, description, marks, duration, mode }]
 * - documents: [{ name, category, required, requiredForCategories }]
 * - important_dates: [{ label, description }]
 * - vacancies: { total, categories, location_count, category_count, by_location }
 * - age_rules: { category: { max, relaxation_years, rule_type, condition } }
 * - application_fees: { category: { amount, currency_code, payment_mode, note } }
 * - official_links: [{ type, label, url, is_official }]
 *
 * EnrichmentSchema structure (canonical):
 * - education: { mandatory[], preferred[], note }
 * - experience: { years_required, job_title, preferred_with[], note }
 * - vacanciesByCategory: { general_unreserved, obc, ews, sc, st }
 * - vacanciesByLocation: { location: count }
 * - selectionProcess: [{ stage, name, description }]
 * - documents: string[] (simple list)
 * - officialLinks: { notification_pdf, application_form, official_website }
 * - ... and 20+ more fields
 */

import { EnrichmentSchema } from '@/types/enrichment-schema';

interface RawEnrichment {
  education?: any;
  experience?: any;
  selection_process?: any;
  documents?: any;
  important_dates?: any;
  vacancies?: any;
  age_rules?: any;
  application_fees?: any;
  official_links?: any;
  [key: string]: any;
}

/**
 * Transform raw database enrichment to canonical EnrichmentSchema
 * This is called ONCE per request in getPostBySlug() and ensures
 * all downstream code gets consistent, properly-structured data.
 */
export function transformEnrichment(rawEnrichment: any): EnrichmentSchema {
  if (!rawEnrichment || typeof rawEnrichment !== 'object') {
    return {};
  }

  const enrichment: EnrichmentSchema = {};

  try {
    // ─────────────────────────────────────────────────────────────────
    // TAB 1: ELIGIBILITY CRITERIA
    // ─────────────────────────────────────────────────────────────────

    // Transform education array to object structure
    if (Array.isArray(rawEnrichment.education) && rawEnrichment.education.length > 0) {
      enrichment.education = {
        mandatory: rawEnrichment.education
          .map((e: any) => {
            const parts = [];
            if (e.degree) parts.push(e.degree);
            if (e.subject) parts.push(e.subject);
            if (e.specialization) parts.push(`(${e.specialization})`);
            return parts.join(' ');
          })
          .filter(Boolean),
        preferred: [],
        note: undefined,
      };
    }

    // Transform experience array to object structure
    if (Array.isArray(rawEnrichment.experience) && rawEnrichment.experience.length > 0) {
      const firstExp = rawEnrichment.experience[0];
      enrichment.experience = {
        years_required: parseFloat(firstExp.type) || undefined,
        job_title: firstExp.description || undefined,
        preferred_with: [],
        note: undefined,
      };
    }

    // Age limit and age note
    if (rawEnrichment.age_rules && typeof rawEnrichment.age_rules === 'object') {
      const categories = Object.values(rawEnrichment.age_rules as any);
      if (categories.length > 0) {
        const firstRule = categories[0] as any;
        enrichment.age_limit = firstRule.max ? `${firstRule.max} years` : undefined;
        enrichment.age_note = firstRule.condition || undefined;
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // TAB 2: VACANCY BREAKDOWN
    // ─────────────────────────────────────────────────────────────────

    if (rawEnrichment.vacancies && typeof rawEnrichment.vacancies === 'object') {
      const vacanc = rawEnrichment.vacancies;

      // Transform categories to standard naming (SC, ST, OBC, EWS, General)
      if (vacanc.categories && typeof vacanc.categories === 'object') {
        enrichment.vacanciesByCategory = {
          general_unreserved: vacanc.categories.General,
          sc: vacanc.categories.SC,
          st: vacanc.categories.ST,
          obc: vacanc.categories.OBC,
          ews: vacanc.categories.EWS,
        };
      }

      // Location-wise vacancies
      if (vacanc.by_location && typeof vacanc.by_location === 'object') {
        enrichment.vacanciesByLocation = vacanc.by_location;
      }

      // Summary details
      if (vacanc.total) {
        enrichment.vacancy_details = {
          total: vacanc.total,
          by_category: vacanc.categories,
          note: undefined,
        };
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // TAB 3: HOW TO APPLY (Not in database - will be empty)
    // ─────────────────────────────────────────────────────────────────
    // This data comes from other sources (FJA extraction, manual entry)
    // Leave as undefined if not present

    // ─────────────────────────────────────────────────────────────────
    // TAB 4: REQUIRED DOCUMENTS
    // ─────────────────────────────────────────────────────────────────

    if (Array.isArray(rawEnrichment.documents) && rawEnrichment.documents.length > 0) {
      enrichment.documents = rawEnrichment.documents
        .map((doc: any) => doc.name || doc.document_name)
        .filter(Boolean);

      enrichment.documentsDetailed = rawEnrichment.documents.map((doc: any) => ({
        name: doc.name || doc.document_name,
        format: doc.category || undefined,
        note: doc.note || undefined,
      }));
    }

    // ─────────────────────────────────────────────────────────────────
    // TAB 5: SELECTION PROCESS
    // ─────────────────────────────────────────────────────────────────

    if (Array.isArray(rawEnrichment.selection_process) && rawEnrichment.selection_process.length > 0) {
      enrichment.selectionProcess = rawEnrichment.selection_process.map((stage: any) => ({
        stage: stage.step,
        name: stage.name || stage.stage_name,
        description: stage.description,
      }));
    }

    // ─────────────────────────────────────────────────────────────────
    // TAB 6: PAY & COMPENSATION (Not in consolidated enrichment JSONB)
    // ─────────────────────────────────────────────────────────────────
    // Leave as undefined - handled separately in page component

    // ─────────────────────────────────────────────────────────────────
    // TAB 7: IMPORTANT DATES (In database but not currently mapped)
    // ─────────────────────────────────────────────────────────────────

    if (Array.isArray(rawEnrichment.important_dates) && rawEnrichment.important_dates.length > 0) {
      // Extract key dates from the array
      const dates = rawEnrichment.important_dates;
      const dateMap: Record<string, string> = {};

      dates.forEach((d: any) => {
        const label = d.label?.toLowerCase() || '';
        if (label.includes('open') || label.includes('start')) {
          dateMap.applicationOpenDate = d.description || d.date;
        } else if (label.includes('close') || label.includes('end')) {
          dateMap.applicationClosingDate = d.description || d.date;
        }
      });

      if (dateMap.applicationOpenDate) {
        enrichment.applicationOpenDate = dateMap.applicationOpenDate;
      }
      if (dateMap.applicationClosingDate) {
        enrichment.applicationClosingDate = dateMap.applicationClosingDate;
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // TAB 8: OFFICIAL LINKS
    // ─────────────────────────────────────────────────────────────────

    if (Array.isArray(rawEnrichment.official_links) && rawEnrichment.official_links.length > 0) {
      const linksObj: Record<string, string> = {};

      rawEnrichment.official_links.forEach((link: any) => {
        const type = link.type?.toLowerCase() || link.label?.toLowerCase() || '';
        const url = link.url;

        if (type.includes('notification')) {
          linksObj.notification_pdf = url;
        } else if (type.includes('application') || type.includes('form')) {
          linksObj.application_form = url;
        } else if (type.includes('website') || type.includes('official')) {
          linksObj.official_website = url;
        } else {
          linksObj[type] = url;
        }
      });

      if (Object.keys(linksObj).length > 0) {
        enrichment.officialLinks = linksObj;
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // VALIDATION: Ensure all fields are the correct type
    // ─────────────────────────────────────────────────────────────────

    // Validate and correct any remaining type mismatches
    if (enrichment.vacanciesByCategory && Array.isArray(enrichment.vacanciesByCategory)) {
      console.warn('[enrichment-transformer] vacanciesByCategory was array, converted to empty object');
      enrichment.vacanciesByCategory = {};
    }

    if (enrichment.vacanciesByLocation && Array.isArray(enrichment.vacanciesByLocation)) {
      console.warn('[enrichment-transformer] vacanciesByLocation was array, converted to empty object');
      enrichment.vacanciesByLocation = {};
    }

    if (enrichment.documents && typeof enrichment.documents === 'object' && !Array.isArray(enrichment.documents)) {
      console.warn('[enrichment-transformer] documents was object, converted to empty array');
      enrichment.documents = [];
    }

    if (enrichment.selectionProcess && typeof enrichment.selectionProcess === 'object' && !Array.isArray(enrichment.selectionProcess)) {
      console.warn('[enrichment-transformer] selectionProcess was object, converted to empty array');
      enrichment.selectionProcess = [];
    }

    return enrichment;
  } catch (error) {
    console.error('[enrichment-transformer] Error transforming enrichment:', error);
    return {};
  }
}
