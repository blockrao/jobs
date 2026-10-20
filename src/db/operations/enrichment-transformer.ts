/**
 * Enrichment Transformer
 *
 * Transforms raw JSONB enrichment data from the database into the canonical
 * PostEnrichment structure expected by all page components.
 *
 * This is the SINGLE source of truth for all enrichment data transformations.
 * All enrichment data passes through this transformer before being returned
 * to the application.
 *
 * Database structure (raw JSONB - ACTUAL):
 * - education: [] (empty array)
 * - experience: [] (empty array)
 * - selection_process: [] (empty array)
 * - documents: [] (empty array)
 * - important_dates: [] (empty array)
 * - vacancies: [{ category, location, total_vacancies }]
 * - age_rules: {} (empty object)
 * - application_fees: [{ fee_amount, fee_currency, payment_methods }]
 * - official_links: [{ link_url, link_type, link_label }]
 *
 * PostEnrichment structure (canonical):
 * - vacanciesByCategory: Record<string, number>
 * - vacanciesTotal: number
 * - education: Array<{ degree, subject, specialization, ... }>
 * - experience: Array<{ totalYears, minYears, maxYears, domains }>
 * - selectionProcess: Array<{ step, name, totalMarks, ... }>
 * - requiredDocuments: Array<{ name, category, required }>
 * - ageRulesByCategory: Record<string, { min, max }>
 * - feesByCategory: Record<string, number | string>
 * - importantDates: Array<{ label, date, dateStr }>
 * - officialLinks: Array<{ type, url, title, source }>
 * - sourceVerificationStatus: "VERIFIED" | "PENDING" | "UNVERIFIABLE"
 * - extractionConfidence: number
 * - dataGaps: string[]
 */

import { PostEnrichment } from '@/types/job-posting';

export function transformEnrichment(rawEnrichment: any): PostEnrichment {
  if (!rawEnrichment || typeof rawEnrichment !== 'object') {
    // Return minimal valid PostEnrichment
    return {
      vacanciesByCategory: {},
      vacanciesTotal: 0,
      feesByCategory: {},
      ageRulesByCategory: {},
      selectionProcess: [],
      sourceVerificationStatus: 'PENDING',
      extractionConfidence: 0,
      dataGaps: [],
    };
  }

  const enrichment: Partial<PostEnrichment> = {};

  try {
    // VACANCIES: Transform array to category breakdown
    // Database: [{ category, location, total_vacancies }]
    if (Array.isArray(rawEnrichment.vacancies) && rawEnrichment.vacancies.length > 0) {
      const vacanciesByCategory: Record<string, number> = {};
      let totalVacancies = 0;

      rawEnrichment.vacancies.forEach((v: any) => {
        const category = v.category || 'General';
        const count = Number(v.total_vacancies) || 0;
        vacanciesByCategory[category] = (vacanciesByCategory[category] || 0) + count;
        totalVacancies += count;
      });

      enrichment.vacanciesByCategory = vacanciesByCategory;
      enrichment.vacanciesTotal = totalVacancies;
      enrichment.vacancies = rawEnrichment.vacancies.map((v: any) => ({
        category: v.category || 'General',
        count: Number(v.total_vacancies) || 0,
      }));
    } else {
      enrichment.vacanciesByCategory = {};
      enrichment.vacanciesTotal = 0;
      enrichment.vacancies = [];
    }

    // EDUCATION: Pass through as-is (currently empty in DB)
    if (Array.isArray(rawEnrichment.education) && rawEnrichment.education.length > 0) {
      enrichment.education = rawEnrichment.education.map((e: any) => ({
        degree: e.degree || '',
        subject: e.subject,
        specialization: e.specialization,
        university: e.university,
        registration: e.registration,
        minimumPercentage: e.minimum_percentage,
        minimumMarks: e.minimum_marks,
        confidenceScore: e.confidence_score,
      }));
    } else {
      enrichment.education = [];
    }

    // EXPERIENCE: Pass through as-is (currently empty in DB)
    if (Array.isArray(rawEnrichment.experience) && rawEnrichment.experience.length > 0) {
      enrichment.experience = rawEnrichment.experience.map((exp: any) => ({
        totalYears: exp.total_years,
        minYears: exp.min_years || 0,
        maxYears: exp.max_years,
        domains: Array.isArray(exp.domains) ? exp.domains : [],
      }));
    } else {
      enrichment.experience = [];
    }

    // SELECTION PROCESS: Pass through as-is (currently empty in DB)
    if (Array.isArray(rawEnrichment.selection_process) && rawEnrichment.selection_process.length > 0) {
      enrichment.selectionProcess = rawEnrichment.selection_process.map((stage: any) => ({
        step: stage.step || 0,
        name: stage.name || '',
        totalMarks: stage.total_marks,
        duration: stage.duration,
        minQualifyingMarks: stage.min_qualifying_marks,
        description: stage.description,
      }));
      enrichment.selectionProcessStages = enrichment.selectionProcess;
    } else {
      enrichment.selectionProcess = [];
      enrichment.selectionProcessStages = [];
    }

    // DOCUMENTS: Pass through as-is (currently empty in DB)
    if (Array.isArray(rawEnrichment.documents) && rawEnrichment.documents.length > 0) {
      enrichment.requiredDocuments = rawEnrichment.documents.map((doc: any) => ({
        name: doc.name || '',
        category: doc.category,
        required: doc.required !== false,
      }));
    } else {
      enrichment.requiredDocuments = [];
    }

    // IMPORTANT DATES: Pass through as-is (currently empty in DB)
    if (Array.isArray(rawEnrichment.important_dates) && rawEnrichment.important_dates.length > 0) {
      enrichment.importantDates = rawEnrichment.important_dates.map((d: any) => ({
        label: d.label || '',
        date: d.date ? new Date(d.date) : undefined,
        dateStr: d.dateStr,
      }));
    } else {
      enrichment.importantDates = [];
    }

    // APPLICATION FEES: Transform array to category breakdown
    // Database: [{ fee_amount, fee_currency, payment_methods }]
    if (Array.isArray(rawEnrichment.application_fees) && rawEnrichment.application_fees.length > 0) {
      const fees: Record<string, number | string> = {};

      rawEnrichment.application_fees.forEach((f: any, idx: number) => {
        const key = `Category${idx}`;
        const amount = f.fee_amount !== null ? f.fee_amount : (f.fee_currency === 'EXEMPT' ? 'Exempted' : 0);
        fees[key] = amount;
      });

      enrichment.feesByCategory = fees;
    } else {
      enrichment.feesByCategory = {};
    }

    // AGE RULES: Pass through as-is (currently empty in DB)
    if (rawEnrichment.age_rules && typeof rawEnrichment.age_rules === 'object' && Object.keys(rawEnrichment.age_rules).length > 0) {
      const ageRules: Record<string, { min: number; max: number }> = {};
      Object.entries(rawEnrichment.age_rules).forEach(([category, rule]: [string, any]) => {
        if (rule && typeof rule === 'object') {
          ageRules[category] = {
            min: rule.min || 0,
            max: rule.max || 65,
          };
        }
      });
      enrichment.ageRulesByCategory = ageRules;
    } else {
      enrichment.ageRulesByCategory = {};
    }

    // OFFICIAL LINKS: Transform link_ prefix fields
    // Database: [{ link_url, link_type, link_label }]
    if (Array.isArray(rawEnrichment.official_links) && rawEnrichment.official_links.length > 0) {
      enrichment.officialLinks = rawEnrichment.official_links.map((link: any) => ({
        type: link.link_type,
        url: link.link_url,
        title: link.link_label,
        source: link.source,
      }));
    } else {
      enrichment.officialLinks = [];
    }

    // VERIFICATION & QUALITY METRICS
    enrichment.sourceVerificationStatus = rawEnrichment.sourceVerificationStatus || 'PENDING';
    enrichment.extractionConfidence = rawEnrichment.extractionConfidence || 0;
    enrichment.dataGaps = Array.isArray(rawEnrichment.dataGaps) ? rawEnrichment.dataGaps : [];

    // Ensure all required PostEnrichment fields are present
    return {
      // Required fields (with defaults if not set)
      vacanciesByCategory: enrichment.vacanciesByCategory || {},
      vacanciesTotal: enrichment.vacanciesTotal || 0,
      feesByCategory: enrichment.feesByCategory || {},
      ageRulesByCategory: enrichment.ageRulesByCategory || {},
      selectionProcess: enrichment.selectionProcess || [],
      sourceVerificationStatus: enrichment.sourceVerificationStatus || 'PENDING',
      extractionConfidence: enrichment.extractionConfidence || 0,
      dataGaps: enrichment.dataGaps || [],

      // Optional fields
      ...enrichment,
    } as PostEnrichment;
  } catch (error) {
    console.error('[enrichment-transformer] Error transforming enrichment:', error);
    return {
      vacanciesByCategory: {},
      vacanciesTotal: 0,
      feesByCategory: {},
      ageRulesByCategory: {},
      selectionProcess: [],
      sourceVerificationStatus: 'PENDING',
      extractionConfidence: 0,
      dataGaps: [],
    };
  }
}
