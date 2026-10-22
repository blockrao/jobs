/**
 * Recruitment Hub Data Specification
 *
 * Master specification defining all 42 recruitment data fields.
 * This is the single source of truth for:
 * - Which fields exist
 * - Where they display (section)
 * - How they're formatted
 * - Priority level
 *
 * When adding a field:
 * 1. Add to database schema (src/db/schema.ts migration)
 * 2. Add to this spec
 * 3. UI auto-generates from this spec
 * 4. Tests verify completeness
 */

export type FieldFormat = 'text' | 'date' | 'link' | 'number' | 'list' | 'html';
export type FieldPriority = 'critical' | 'high' | 'medium' | 'low';

export interface FieldSpec {
  label: string;
  format: FieldFormat;
  priority: FieldPriority;
  description: string;
  source: 'notification' | 'extracted' | 'enriched';
  example?: string;
}

/**
 * Core Recruitment Data Specification
 * Organized by logical section for UI rendering
 */
export const RECRUITMENT_DATA_SPEC = {
  // ── OVERVIEW SECTION (At a Glance) ──
  overview: {
    organization: {
      label: 'Organisation',
      format: 'link' as const,
      priority: 'critical',
      description: 'Organization/Department conducting the recruitment',
      source: 'notification',
      example: 'Union Public Service Commission',
    },
    advertisementNumber: {
      label: 'Advertisement no.',
      format: 'text' as const,
      priority: 'critical',
      description: 'Official notification/advertisement number',
      source: 'notification',
      example: 'UPSC Advt. No. 12/2026',
    },
    posts: {
      label: 'Posts',
      format: 'list' as const,
      priority: 'critical',
      description: 'Positions/roles being recruited',
      source: 'extracted',
      example: 'Deputy Registrar, Assistant Librarian, System Analyst',
    },
    totalVacancies: {
      label: 'Total vacancies',
      format: 'number' as const,
      priority: 'critical',
      description: 'Total number of positions available',
      source: 'notification',
      example: '16',
    },
    applicationStartDate: {
      label: 'Apply from',
      format: 'date' as const,
      priority: 'critical',
      description: 'Application submission start date',
      source: 'notification',
      example: '2026-10-22',
    },
    applicationEndDate: {
      label: 'Last date',
      format: 'date' as const,
      priority: 'critical',
      description: 'Final date to submit applications',
      source: 'notification',
      example: '2026-11-09',
    },
    applicationFee: {
      label: 'Application fee',
      format: 'text' as const,
      priority: 'high',
      description: 'Fee required to submit application (category-wise)',
      source: 'notification',
      example: 'General/OBC: Rs. 200, SC/ST/PwBD: Nil',
    },
    applicationMode: {
      label: 'Mode',
      format: 'text' as const,
      priority: 'high',
      description: 'Online or offline application method',
      source: 'notification',
      example: 'Online',
    },
    jobType: {
      label: 'Job type',
      format: 'text' as const,
      priority: 'high',
      description: 'Employment type (permanent, contract, apprenticeship)',
      source: 'notification',
      example: 'Full-time',
    },
    location: {
      label: 'Location',
      format: 'text' as const,
      priority: 'high',
      description: 'State or region where position is located',
      source: 'enriched',
      example: 'Maharashtra',
    },
    ageLimit: {
      label: 'Age limit',
      format: 'text' as const,
      priority: 'critical',
      description: 'Age requirements and relaxations by category',
      source: 'notification',
      example: 'UR: 20-28 years, SC/ST/OBC: +5 years',
    },
  } as Record<string, FieldSpec>,

  // ── TIMELINE SECTION ──
  timeline: {
    notificationDate: {
      label: 'Notification published',
      format: 'date' as const,
      priority: 'high',
      description: 'Date the recruitment was announced',
      source: 'notification',
    },
    admitCardDate: {
      label: 'Admit card release',
      format: 'date' as const,
      priority: 'high',
      description: 'When admit cards will be available',
      source: 'notification',
    },
    examDate: {
      label: 'Exam / test',
      format: 'date' as const,
      priority: 'critical',
      description: 'Exam/written test date',
      source: 'notification',
    },
    interviewDate: {
      label: 'Interview',
      format: 'date' as const,
      priority: 'high',
      description: 'Interview/viva date (if applicable)',
      source: 'notification',
    },
    resultDate: {
      label: 'Result',
      format: 'date' as const,
      priority: 'critical',
      description: 'When results will be announced',
      source: 'notification',
    },
  } as Record<string, FieldSpec>,

  // ── SELECTION PROCESS SECTION ──
  selectionProcess: {
    stages: {
      label: 'Selection stages',
      format: 'text' as const,
      priority: 'critical',
      description: 'Exam/interview stages and weightage',
      source: 'notification',
      example: 'Prelims (100) → Mains (250) → Interview (75)',
    },
    examPattern: {
      label: 'Exam pattern',
      format: 'text' as const,
      priority: 'high',
      description: 'Question type, duration, negative marking',
      source: 'notification',
      example: 'Objective, 120 minutes, -0.33 for wrong answer',
    },
    cutoffInfo: {
      label: 'Previous year cutoff',
      format: 'text' as const,
      priority: 'high',
      description: 'Last year cutoff marks by category',
      source: 'enriched',
      example: 'UR: 150, OBC: 140, SC: 130, ST: 125',
    },
    physicalTest: {
      label: 'Physical test',
      format: 'text' as const,
      priority: 'medium',
      description: 'Physical fitness requirements (if applicable)',
      source: 'notification',
      example: '1.6 km in 6:40 minutes',
    },
  } as Record<string, FieldSpec>,

  // ── JOB DETAILS SECTION ──
  jobDetails: {
    jobDescription: {
      label: 'Job description',
      format: 'html' as const,
      priority: 'critical',
      description: 'Detailed role responsibilities and duties',
      source: 'extracted',
    },
    salary: {
      label: 'Salary & pay scale',
      format: 'text' as const,
      priority: 'critical',
      description: 'Pay scale, grade pay, and allowances',
      source: 'notification',
      example: 'Level 2, Rs. 9300-34800 + DA + HRA + other allowances',
    },
    postingLocation: {
      label: 'Posting location',
      format: 'text' as const,
      priority: 'high',
      description: 'Specific city/office where posted',
      source: 'notification',
      example: 'New Delhi, Mumbai, Bangalore',
    },
    promotionProspects: {
      label: 'Promotion prospects',
      format: 'text' as const,
      priority: 'medium',
      description: 'Career growth and promotion timeline',
      source: 'enriched',
      example: 'Eligible for Group B promotion after 5 years',
    },
    workingHours: {
      label: 'Working hours',
      format: 'text' as const,
      priority: 'medium',
      description: 'Daily working hours and working days',
      source: 'enriched',
      example: '9 AM - 5 PM, 5 days/week',
    },
  } as Record<string, FieldSpec>,

  // ── ELIGIBILITY DETAILS SECTION ──
  eligibility: {
    qualifications: {
      label: 'Qualifications',
      format: 'text' as const,
      priority: 'critical',
      description: 'Educational requirements per post',
      source: 'extracted',
      example: 'Post Graduate Degree, Master\'s in Library Science',
    },
    experience: {
      label: 'Experience required',
      format: 'text' as const,
      priority: 'critical',
      description: 'Work experience requirements',
      source: 'notification',
      example: '5-8 years in academic institutions',
    },
    categoryWiseVacancies: {
      label: 'Vacancy breakdown',
      format: 'list' as const,
      priority: 'high',
      description: 'Positions available per category (UR/OBC/SC/ST/EWS/PwBD)',
      source: 'notification',
      example: 'UR: 250, OBC: 150, SC: 80, ST: 20, EWS: 20',
    },
    categoryWiseAgeLimit: {
      label: 'Age limit by category',
      format: 'text' as const,
      priority: 'critical',
      description: 'Age relaxation per category',
      source: 'notification',
      example: 'UR: 20-28, SC/ST: 20-33, OBC: 20-31',
    },
  } as Record<string, FieldSpec>,

  // ── OFFICIAL LINKS SECTION ──
  links: {
    officialWebsite: {
      label: 'Official website',
      format: 'link' as const,
      priority: 'high',
      description: 'Organization\'s official website',
      source: 'enriched',
    },
    officialNotification: {
      label: 'Official notification',
      format: 'link' as const,
      priority: 'critical',
      description: 'Original PDF/page of recruitment notification',
      source: 'notification',
    },
    applicationPortal: {
      label: 'Apply online',
      format: 'link' as const,
      priority: 'critical',
      description: 'Direct link to application portal',
      source: 'notification',
    },
    admitCardLink: {
      label: 'Download admit card',
      format: 'link' as const,
      priority: 'high',
      description: 'Where to download exam admit card',
      source: 'notification',
    },
    syllabus: {
      label: 'Exam syllabus',
      format: 'link' as const,
      priority: 'high',
      description: 'Download detailed exam syllabus',
      source: 'notification',
    },
    previousYearQuestions: {
      label: 'Previous year papers',
      format: 'link' as const,
      priority: 'medium',
      description: 'Download old exam question papers',
      source: 'enriched',
    },
  } as Record<string, FieldSpec>,
};

/**
 * Get all fields across all sections
 */
export function getAllFields(): Record<string, FieldSpec> {
  const all: Record<string, FieldSpec> = {};
  Object.values(RECRUITMENT_DATA_SPEC).forEach((section) => {
    Object.assign(all, section);
  });
  return all;
}

/**
 * Get fields by priority
 */
export function getFieldsByPriority(priority: FieldPriority): Record<string, FieldSpec> {
  const all = getAllFields();
  return Object.fromEntries(
    Object.entries(all).filter(([_, field]) => field.priority === priority)
  );
}

/**
 * Completeness check: which fields are missing from UI
 */
export function getMissingFields(displayedFieldNames: string[]): string[] {
  const all = getAllFields();
  return Object.keys(all).filter((name) => !displayedFieldNames.includes(name));
}
