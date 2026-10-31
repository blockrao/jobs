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

import { PostEnrichment } from '@/types/job-posting';

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
export interface EnrichmentTransformOptions {
  sourceOrigin?: string | null;
  postName?: string | null;
}

export function transformEnrichment(
  rawEnrichment: any,
  options: EnrichmentTransformOptions = {},
): PostEnrichment {
  const isAggregatorDiscovered = options.sourceOrigin === 'AGGREGATOR_DISCOVERED';
  const reviewedFields = rawEnrichment?.source_provenance?.fact_review?.reviewed_fields;
  const hasExplicitPostFactReview = (field: string): boolean => {
    if (typeof options.postName !== 'string' || !Array.isArray(reviewedFields)) return false;
    return reviewedFields.includes(`post:${options.postName}:${field}`);
  };
  const trustedFactSources = new Set([
    'OFFICIAL_NOTIFICATION',
    'ISSUER_NOTIFICATION',
    'ISSUER_API',
    'ISSUER_CONTROLLED',
    'GOA_GOV_IN',
    'MANUAL_VERIFIED',
  ]);
  const isFactRowEligible = (item: any, field: string): boolean => {
    const source = typeof item?.source === 'string' ? item.source.trim().toUpperCase() : null;
    const verifiedAt = item?.verified_at ?? item?.verifiedAt ?? null;
    const sourceRef = item?.source_ref ?? item?.sourceRef ?? null;
    const sourceLocator = item?.source_locator ?? item?.sourceLocator ?? null;
    const verificationStatus = item?.verification_status ?? item?.verificationStatus;
    const hasRowEvidence =
      verifiedAt != null &&
      typeof sourceRef === 'string' && sourceRef.trim().length > 0 &&
      typeof sourceLocator === 'string' && sourceLocator.trim().length > 0;
    const requiresHumanReview =
      isAggregatorDiscovered ||
      !source ||
      !trustedFactSources.has(source) ||
      !hasRowEvidence ||
      verificationStatus === 'UNVERIFIABLE';
    return requiresHumanReview
      ? hasExplicitPostFactReview(field) && hasRowEvidence
      : true;
  };
  const eligibleRows = (items: any, field: string): any[] =>
    Array.isArray(items) ? items.filter((item) => isFactRowEligible(item, field)) : [];
  const eligibleObjectEntries = (items: any, field: string): Array<[string, any]> =>
    items && typeof items === 'object' && !Array.isArray(items)
      ? Object.entries(items).filter(([, item]) => isFactRowEligible(item, field))
      : [];

  if (!rawEnrichment || typeof rawEnrichment !== 'object') {
    // Return minimal valid PostEnrichment
    return {
      vacanciesByCategory: {},
      vacanciesTotal: 0,
      feesByCategory: {},
      applicationFees: [],
      ageRulesByCategory: {},
      ageRules: [],
      selectionProcess: [],
      sourceVerificationStatus: 'PENDING',
      extractionConfidence: 0,
      dataGaps: [],
    };
  }

  const enrichment: Partial<PostEnrichment> = {};

  try {
    // ─────────────────────────────────────────────────────────────────
    // TAB 1: ELIGIBILITY CRITERIA
    // ─────────────────────────────────────────────────────────────────

    // Transform education to array structure (as PostEnrichment expects)
    if (Array.isArray(rawEnrichment.education) && rawEnrichment.education.length > 0) {
      enrichment.education = rawEnrichment.education
        .filter((e: any) => isFactRowEligible(e, 'education'))
        .map((e: any) => ({
          degree: e.degree || '',
          subject: e.subject,
          specialization: e.specialization,
          university: e.university,
          registration: e.registration,
          minimumPercentage: e.minimum_percentage || e.minimumPercentage,
          minimumMarks: e.minimum_marks || e.minimumMarks,
          confidenceScore: e.confidence_score ?? e.confidenceScore,
          source: e.source ?? null,
          verifiedAt: e.verified_at ? new Date(e.verified_at) : (e.verifiedAt ? new Date(e.verifiedAt) : undefined),
          sourceRef: e.source_ref ?? e.sourceRef ?? null,
          sourceLocator: e.source_locator ?? e.sourceLocator ?? null,
          factId: e.fact_id ?? e.factId,
        }))
        .filter((e: any) => e.degree.trim().length > 0);
    } else {
      enrichment.education = [];
    }

    // Transform experience to array structure (as PostEnrichment expects)
    if (Array.isArray(rawEnrichment.experience) && rawEnrichment.experience.length > 0) {
      enrichment.experience = rawEnrichment.experience
        .filter((exp: any) => isFactRowEligible(exp, 'experience'))
        .map((exp: any) => ({
          totalYears: exp.total_years ?? exp.totalYears,
          minYears: exp.min_years ?? exp.minYears ?? 0,
          maxYears: exp.max_years ?? exp.maxYears,
          domains: Array.isArray(exp.domains) ? exp.domains : (exp.domain ? [exp.domain] : []),
          experienceType: exp.type || exp.experience_type || exp.experienceType,
          confidenceScore: exp.confidence_score ?? exp.confidenceScore,
          source: exp.source ?? null,
          verifiedAt: exp.verified_at ? new Date(exp.verified_at) : (exp.verifiedAt ? new Date(exp.verifiedAt) : undefined),
          sourceRef: exp.source_ref ?? exp.sourceRef ?? null,
          sourceLocator: exp.source_locator ?? exp.sourceLocator ?? null,
          factId: exp.fact_id ?? exp.factId,
        }));
    } else {
      enrichment.experience = [];
    }

    // Age rules - only expose rows with complete issuer evidence.
    const verifiedAgeRuleEntries = eligibleObjectEntries(rawEnrichment.age_rules, 'age_rules');
    if (verifiedAgeRuleEntries.length > 0) {
      const ageRulesObject: Record<string, { min: number; max: number }> = {};
      const ageRulesArray: Array<{ category: string; min: number; max: number; maxAge?: number; relaxationYears?: number; ruleType?: string; note?: string }> = [];

      verifiedAgeRuleEntries.forEach(([category, rule]: [string, any]) => {
        if (rule && typeof rule === 'object') {
          const maxAge = rule.max ?? rule.max_age ?? 65;
          ageRulesObject[category] = { min: rule.min ?? 0, max: maxAge };
          ageRulesArray.push({
            category,
            min: rule.min ?? 0,
            max: maxAge,
            maxAge,
            relaxationYears: rule.relaxation_years ?? rule.relaxationYears,
            ruleType: rule.rule_type ?? rule.ruleType,
            note: rule.note,
          });
        }
      });

      enrichment.ageRulesByCategory = ageRulesObject;
      enrichment.ageRules = ageRulesArray;
    } else {
      enrichment.ageRulesByCategory = {};
      enrichment.ageRules = [];
    }

    // ─────────────────────────────────────────────────────────────────
    // TAB 2: VACANCY BREAKDOWN
    // ─────────────────────────────────────────────────────────────────

    if (hasPostFactReview('vacancies') && rawEnrichment.vacancies && typeof rawEnrichment.vacancies === 'object') {
      const vacanc = rawEnrichment.vacancies;

      // Transform categories to PostEnrichment format
      if (vacanc.categories && typeof vacanc.categories === 'object') {
        enrichment.vacanciesByCategory = {
          General: vacanc.categories.General || 0,
          SC: vacanc.categories.SC || 0,
          ST: vacanc.categories.ST || 0,
          OBC: vacanc.categories.OBC || 0,
          EWS: vacanc.categories.EWS || 0,
        };
      } else {
        enrichment.vacanciesByCategory = {};
      }

      // Total vacancies count
      if (vacanc.total) {
        enrichment.vacanciesTotal = vacanc.total;
      }

      // Vacancies array for rendering
      if (vacanc.categories && typeof vacanc.categories === 'object') {
        enrichment.vacancies = Object.entries(vacanc.categories).map(([category, count]) => ({
          category,
          count: Number(count) || 0,
        }));
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // APPLICATION FEES
    // ─────────────────────────────────────────────────────────────────

    if (hasPostFactReview('application_fees') && rawEnrichment.application_fees && typeof rawEnrichment.application_fees === 'object') {
      const feesObject: Record<string, number | string> = {};
      const feesArray: Array<{ amount?: number | null; currency?: string; waivedFor?: string; paymentMethods?: string; note?: string; isExempted?: boolean; exemptionCategory?: string }> = [];

      Object.entries(rawEnrichment.application_fees).forEach(([category, feeData]: [string, any]) => {
        if (feeData && typeof feeData === 'object') {
          const amount = feeData.amount || feeData.fee_amount;
          const isExempt = feeData.currency_code === 'EXEMPT' || feeData.exemption_status === 'EXEMPT';

          feesObject[category] = isExempt ? 'Exempted' : (amount || 0);

          // Also add to array format for page component
          feesArray.push({
            amount: isExempt ? null : amount,
            currency: feeData.currency_code || feeData.currency || 'INR',
            waivedFor: feeData.waived_for || feeData.waivedFor,
            paymentMethods: feeData.payment_methods || feeData.paymentMethods,
            note: feeData.note,
            isExempted: isExempt,
            exemptionCategory: category,
          });
        }
      });

      if (Object.keys(feesObject).length > 0) {
        enrichment.feesByCategory = feesObject;
        enrichment.applicationFees = feesArray; // Page component expects this
      } else {
        enrichment.feesByCategory = {};
        enrichment.applicationFees = [];
      }
    } else {
      enrichment.feesByCategory = {};
      enrichment.applicationFees = [];
    }

    // ─────────────────────────────────────────────────────────────────
    // TAB 3: HOW TO APPLY (Not in database - will be empty)
    // ─────────────────────────────────────────────────────────────────
    // This data comes from other sources (FJA extraction, manual entry)
    // Leave as undefined if not present

    // ─────────────────────────────────────────────────────────────────
    // TAB 4: REQUIRED DOCUMENTS
    // ─────────────────────────────────────────────────────────────────

    if (hasPostFactReview('documents') && Array.isArray(rawEnrichment.documents) && rawEnrichment.documents.length > 0) {
      enrichment.requiredDocuments = rawEnrichment.documents.map((doc: any) => ({
        name: doc.name || doc.document_name || '',
        category: doc.category,
        required: doc.required !== false,
      }));
    } else {
      enrichment.requiredDocuments = [];
    }

    // ─────────────────────────────────────────────────────────────────
    // TAB 5: SELECTION PROCESS
    // ─────────────────────────────────────────────────────────────────

    if (hasPostFactReview('selection_process') && Array.isArray(rawEnrichment.selection_process) && rawEnrichment.selection_process.length > 0) {
      enrichment.selectionProcess = rawEnrichment.selection_process.map((stage: any) => ({
        step: stage.step || 0,
        name: stage.name || stage.stage_name || '',
        totalMarks: stage.total_marks || stage.totalMarks,
        duration: stage.duration,
        minQualifyingMarks: stage.min_qualifying_marks || stage.minQualifyingMarks,
        description: stage.description,
      }));

      // Also provide alias for compatibility
      enrichment.selectionProcessStages = enrichment.selectionProcess;
    } else {
      enrichment.selectionProcess = [];
      enrichment.selectionProcessStages = [];
    }

    // ─────────────────────────────────────────────────────────────────
    // TAB 6: PAY & COMPENSATION (Not in consolidated enrichment JSONB)
    // ─────────────────────────────────────────────────────────────────
    // Leave as undefined - handled separately in page component

    // ─────────────────────────────────────────────────────────────────
    // TAB 7: IMPORTANT DATES (In database but not currently mapped)
    // ─────────────────────────────────────────────────────────────────

    if (hasPostFactReview('important_dates') && Array.isArray(rawEnrichment.important_dates) && rawEnrichment.important_dates.length > 0) {
      // Create importantDates array for PostEnrichment
      enrichment.importantDates = rawEnrichment.important_dates.map((d: any) => ({
        label: d.label || d.description || '',
        date: d.date ? new Date(d.date) : undefined,
        dateStr: d.date || d.dateStr,
      }));

      // Extract and map specific dates based on labels
      rawEnrichment.important_dates.forEach((d: any) => {
        const label = d.label?.toLowerCase() || '';
        const dateVal = d.date ? new Date(d.date) : undefined;

        if (label.includes('notification')) {
          enrichment.notificationDate = dateVal;
        } else if ((label.includes('open') || label.includes('start')) && label.includes('application')) {
          enrichment.applicationOpenDate = dateVal;
        } else if ((label.includes('close') || label.includes('end')) && label.includes('application')) {
          enrichment.applicationClosingDate = dateVal;
        } else if (label.includes('exam')) {
          enrichment.examDate = dateVal;
        } else if (label.includes('admit')) {
          enrichment.admitCardDate = dateVal;
        } else if (label.includes('result')) {
          enrichment.resultDate = dateVal;
        } else if (label.includes('interview')) {
          enrichment.interviewScheduleDate = dateVal;
        } else if (label.includes('appointment')) {
          enrichment.appointmentDate = dateVal;
        }
      });
    } else {
      enrichment.importantDates = [];
    }

    // ─────────────────────────────────────────────────────────────────
    // TAB 8: OFFICIAL LINKS
    // ─────────────────────────────────────────────────────────────────

    if (hasPostFactReview('official_links') && Array.isArray(rawEnrichment.official_links) && rawEnrichment.official_links.length > 0) {
      enrichment.officialLinks = rawEnrichment.official_links.map((link: any) => ({
        type: link.type,
        url: link.url,
        title: link.label || link.title,
        source: link.source,
      }));
    } else {
      enrichment.officialLinks = [];
    }

    // ─────────────────────────────────────────────────────────────────
    // VERIFICATION & QUALITY METRICS
    // ─────────────────────────────────────────────────────────────────

    // Source verification status (required field)
    enrichment.sourceVerificationStatus = rawEnrichment.sourceVerificationStatus || 'PENDING';

    // Extraction confidence score (0-100)
    enrichment.extractionConfidence = rawEnrichment.extractionConfidence || 75;

    // Data gaps tracking (required field)
    enrichment.dataGaps = Array.isArray(rawEnrichment.dataGaps)
      ? rawEnrichment.dataGaps
      : [];

    // ─────────────────────────────────────────────────────────────────
    // VALIDATION: Ensure all fields are the correct type
    // ─────────────────────────────────────────────────────────────────

    // Validate and correct any remaining type mismatches
    if (enrichment.vacanciesByCategory && Array.isArray(enrichment.vacanciesByCategory)) {
      console.warn('[enrichment-transformer] vacanciesByCategory was array, converted to empty object');
      enrichment.vacanciesByCategory = {};
    }

    if (enrichment.feesByCategory && Array.isArray(enrichment.feesByCategory)) {
      console.warn('[enrichment-transformer] feesByCategory was array, converted to empty object');
      enrichment.feesByCategory = {};
    }

    if (enrichment.ageRulesByCategory && Array.isArray(enrichment.ageRulesByCategory)) {
      console.warn('[enrichment-transformer] ageRulesByCategory was array, converted to empty object');
      enrichment.ageRulesByCategory = {};
    }

    if (enrichment.documents && typeof enrichment.documents === 'object' && !Array.isArray(enrichment.documents)) {
      console.warn('[enrichment-transformer] documents was object, converted to empty array');
      enrichment.documents = [];
    }

    if (enrichment.selectionProcess && typeof enrichment.selectionProcess === 'object' && !Array.isArray(enrichment.selectionProcess)) {
      console.warn('[enrichment-transformer] selectionProcess was object, converted to empty array');
      enrichment.selectionProcess = [];
    }

    // Ensure all required PostEnrichment fields are present
    const result: PostEnrichment = {
      // Required fields (with defaults if not set)
      vacanciesByCategory: enrichment.vacanciesByCategory || {},
      vacanciesTotal: enrichment.vacanciesTotal || 0,
      feesByCategory: enrichment.feesByCategory || {},
      ageRulesByCategory: enrichment.ageRulesByCategory || {},
      selectionProcess: enrichment.selectionProcess || [],
      sourceVerificationStatus: enrichment.sourceVerificationStatus || 'PENDING',
      extractionConfidence: enrichment.extractionConfidence || 0,
      dataGaps: enrichment.dataGaps || [],

      // Optional fields from enrichment
      ...enrichment,
    };

    // Ensure array forms are always present for page component (not duplicated in spread)
    if (!result.ageRules) result.ageRules = [];
    if (!result.applicationFees) result.applicationFees = [];

    return result;
  } catch (error) {
    console.error('[enrichment-transformer] Error transforming enrichment:', error);
    return {
      vacanciesByCategory: {},
      vacanciesTotal: 0,
      feesByCategory: {},
      applicationFees: [],
      ageRulesByCategory: {},
      ageRules: [],
      selectionProcess: [],
      sourceVerificationStatus: 'PENDING',
      extractionConfidence: 0,
      dataGaps: [],
    };
  }
}
