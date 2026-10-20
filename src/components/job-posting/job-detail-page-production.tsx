/**
 * Job Detail Page - Production Implementation
 *
 * Features:
 * - Mobile-first responsive design with safe area support
 * - Complete JobPosting + BreadcrumbList schema.org
 * - Error/empty states for missing data
 * - Organization branding card
 * - Sticky mobile apply button
 * - FAQ toggle (minimal JS)
 * - Related jobs section
 * - Dark mode support via CSS variables
 * - Phase 1 P0: Unified enrichment display (vacancies, education, experience, documents, dates, age rules, selection process)
 *
 * SEO/GEO Strategy:
 * - Semantic HTML (h1→h6 hierarchy)
 * - Structured data for Answer Engine Optimization (AEO)
 * - Geographic metadata (addressRegion, jobLocation)
 * - Rich snippets ready (BreadcrumbList, FAQPage)
 */

import type React from 'react';
import { formatDate, formatCurrency, formatDeadlineStatus } from '@/lib/formatting';
import JobPostingSchema from '@/components/job-posting/structured-data/post-leaf-schema';
import PostFAQSchema from '@/components/job-posting/structured-data/post-faq-schema';
import { toPlausibleRecruitmentDate } from '@/lib/recruitment-dates';
import FAQSection from '@/components/job-posting/faq/faq-section';
import { generateFAQs } from '@/components/job-posting/faq/faq-templates';
import ApplicationInstructionsSection from '@/components/job-posting/application-instructions/application-instructions-section';
import {
  generateApplicationInstructions,
  generateRequiredDocuments,
} from '@/components/job-posting/application-instructions/application-templates';

// Helper: Parse JSON strings safely
function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value as T;
}

interface OrganizationData {
  name: string | null;
  type?: string | null;
  url?: string | null;
  logoUrl?: string | null;
}

interface RelatedPost {
  title: string;
  slug: string;
  recruitment_slug: string;
}

interface JobDetailPageProps {
  post: {
    id: string | number;
    title: string;
    description?: string | null;
    organizationName?: string | null;
    organizationType?: string | null;
    locationCity?: string | null;
    locationState?: string | null;
    recruitmentSlug: string;
    recruitmentName?: string | null;
    slug: string;
    postedAt?: Date | string | null;
    updatedAt?: Date | string | null;
    notificationPublicationDate?: Date | string | null;
    officialSourceUrl?: string | null;
    applyUrl?: string | null;
    employmentType?: string | null;
    qualificationText?: string | null;
    experienceText?: string | null;
    ageLimit?: string | null;
    selectionProcess?: string | null;
    howToApply?: string | null;
    applicationFee?: string | null;
    salary?: {
      min: number | null;
      max: number | null;
    };
    vacancies?: number | null;
    applicationDeadline?: Date | string | null;
    // Phase 1 P0: Enrichment detail fields
    vacanciesByCategory?: Array<{ category: string; total: number; location?: string }>;
    educationRequirements?: Array<{ degree: string; subject?: string; specialization?: string; minimumPercentage?: number; minimumMarks?: number; confidenceScore?: number }>;
    experienceRequirements?: Array<{ totalYears?: number; minYears?: number; type: string; confidenceScore?: number }>;
    selectionProcessStages?: Array<{ order: number; name: string; scheduledDate?: string; durationMinutes?: number; totalMarks?: number; minimumMarks?: number }>;
    requiredDocuments?: Array<{ name: string; category: string; isRequired: boolean }>;
    importantDates?: Array<{ type: string; date: string }>;
    ageRules?: Array<{ category: string; maxAge?: number; relaxationYears?: number; ruleType: string; note?: string }>;
    // Phase 1 P0: Application Fee and Official Links (new)
    applicationFees?: Array<{ amount?: number | null; currency?: string; waivedFor?: string; paymentMethods?: string; note?: string }>;
    officialLinks?: Array<{ type?: string; url?: string; title?: string; source?: string }>;
    fjaExtract?: {
      qualificationRaw?: string | null;
      experienceRaw?: string | null;
      advertisementNumber?: string | null;
      ageRaw?: string | null;
      salaryRaw?: string | null;
    };
  };
  relatedJobs?: Array<{
    id: string;
    title: string;
    slug: string;
    recruitmentSlug: string;
    applicationDeadline?: Date | string | null;
  }>;
  relatedByOrg?: RelatedPost[];
  relatedByLocation?: RelatedPost[];
  relatedByRole?: RelatedPost[];
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  locale?: string;
  canonicalUrl: string;
  /**
   * Lifecycle derived from the canonical recruitment (src/lib/lifecycle.ts).
   * Gates the JobPosting structured data: a closed recruitment is never
   * represented as an open job, and one with no verifiable deadline emits no
   * JobPosting at all once closed.
   */
  lifecycle?: { state: string; isOpen: boolean; isLive: boolean; deadline: Date | null };
  // Phase 2: Pillar page link
  pillarSlug?: string | null;
}

// ─ Schema.org Data Preparation ─
function extractSkillsFromQualification(text: string | null | undefined): string[] {
  if (!text) return [];

  const skillKeywords = [
    'English', 'Hindi', 'Data', 'IT', 'Programming', 'Java', 'Python', 'SQL',
    'Communication', 'Analysis', 'Management', 'Planning', 'Coordination',
    'Report writing', 'Office', 'Excel', 'Word', 'Administrative',
    'Clerical', 'Legal', 'Medical', 'Engineering', 'Statistics',
    'Accounting', 'Finance', 'HR', 'Logistics', 'Transportation', 'Typing'
  ];

  return skillKeywords.filter(skill =>
    new RegExp(`\\b${skill}\\b`, 'i').test(text)
  );
}

function getOrgEmojiByType(type: string | null | undefined): string {
  const typeStr = type?.toLowerCase() || '';
  if (typeStr.includes('commission')) return '📋';
  if (typeStr.includes('board')) return '🏛️';
  if (typeStr.includes('bank')) return '🏦';
  if (typeStr.includes('railway')) return '🚂';
  if (typeStr.includes('ministry')) return '🏛️';
  return '🏢';
}

// ─ Main Component ─
export default function JobDetailPageProduction({
  post,
  relatedJobs,
  relatedByOrg,
  relatedByLocation,
  relatedByRole,
  faqs,
  locale = 'en',
  canonicalUrl,
  lifecycle,
}: JobDetailPageProps) {
  // Data normalization
  const vacancies = post.vacancies ?? 0;
  const salaryMin = post.salary?.min ?? null;
  const salaryMax = post.salary?.max ?? null;
  const applicationDeadline = lifecycle?.deadline
    ?? toPlausibleRecruitmentDate(post.applicationDeadline ?? null);
  const recruitmentClosed = lifecycle ? !lifecycle.isLive : false;
  const isApplicationClosed = recruitmentClosed || Boolean(applicationDeadline && new Date() > applicationDeadline);
  // Google requires expired postings to carry a past validThrough or no
  // JobPosting markup. Without a verifiable deadline, a closed recruitment
  // gets no JobPosting.
  const emitJobPosting = !(recruitmentClosed && !applicationDeadline);
  const publishedDate = post.notificationPublicationDate || post.postedAt ? new Date(post.notificationPublicationDate || post.postedAt!) : null;
  const modifiedDate = post.updatedAt ? new Date(post.updatedAt) : null;

  // Qualification & skills
  const qualificationText = post.qualificationText || post.fjaExtract?.qualificationRaw || null;
  const experienceText = post.experienceText || post.fjaExtract?.experienceRaw || null;
  const extractedSkills = extractSkillsFromQualification(qualificationText);

  // Organization branding
  const orgEmoji = getOrgEmojiByType(post.organizationType);

  // Compute completeness score for SEO/UX signal
  const completenessFields = {
    qualifications: Boolean(qualificationText),
    education: (post.educationRequirements?.length ?? 0) > 0,
    experience: (post.experienceRequirements?.length ?? 0) > 0,
    selection: Boolean(post.selectionProcess || (post.selectionProcessStages?.length ?? 0) > 0),
    requirements: (post.requiredDocuments?.length ?? 0) > 0,
    dates: (post.importantDates?.length ?? 0) > 0,
    fees: (post.applicationFees?.length ?? 0) > 0,
    salary: Boolean(post.salary?.min || post.fjaExtract?.salaryRaw),
  };

  const completenessCount = Object.values(completenessFields).filter(Boolean).length;
  const completenessMax = Object.keys(completenessFields).length;
  const isCompletePost = completenessCount >= 6;

  // Visible breadcrumb, built from the URL contract (/jobs → hub → leaf).
  // BreadcrumbList structured data is emitted once, by JobPostingSchema.
  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Jobs', url: '/jobs' },
    ...(post.recruitmentName ? [{ name: post.recruitmentName, url: `/jobs/${post.recruitmentSlug}` }] : []),
    { name: post.title, url: canonicalUrl },
  ];

  // Schema.org preparation
  const schemaData = {
    post: {
      id: post.id,
      title: post.title,
      slug: post.slug,
      description: post.description,
      organizationName: post.organizationName,
      recruitmentSlug: post.recruitmentSlug,
      recruitmentName: post.recruitmentName,
      employmentType: post.employmentType,
      locationCity: post.locationCity,
      locationState: post.locationState,
      notificationPublicationDate: publishedDate,
      postedAt: post.postedAt ? new Date(post.postedAt) : null,
      updatedAt: modifiedDate,
      vacancyNumber: post.fjaExtract?.advertisementNumber,
      officialSourceUrl: post.officialSourceUrl,
      qualificationText,
      experienceText,
    },
    resolvedVacancy: vacancies,
    resolvedSalary: salaryMin ? { min: salaryMin, max: salaryMax ?? salaryMin, currency: 'INR', period: 'yearly' } : null,
    resolvedDeadline: applicationDeadline
      ? { date: applicationDeadline, state: isApplicationClosed ? ('CLOSED' as const) : ('OPEN' as const) }
      : { date: null, state: 'UNKNOWN' as const },
  };

  return (
    <>
      {/* ─ Schema.org Structured Data (AEO Optimization) ─ */}
      {locale !== 'hi' && emitJobPosting && <JobPostingSchema {...schemaData} />}
      {locale !== 'hi' && <PostFAQSchema post={post} />}

      {/* ─ Page Structure (Mobile-First) ─ */}
      <main className="min-h-screen bg-white dark:bg-slate-950">
        {/* Header with Safe Area */}
        <header className="sticky top-0 z-50 bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <a href="/" className="text-xl font-bold">
              Job<span className="text-blue-600">Oye</span>
            </a>
            <nav className="hidden md:flex gap-4 text-sm">
              <a href="/jobs" className="text-gray-600 hover:text-gray-900 dark:text-gray-400">Latest Jobs</a>
              <a href="/states" className="text-gray-600 hover:text-gray-900 dark:text-gray-400">By State</a>
              <a href="/exams" className="text-gray-600 hover:text-gray-900 dark:text-gray-400">By Exam</a>
            </nav>
          </div>
        </header>

        {/* Breadcrumb */}
        <nav className="max-w-3xl mx-auto px-4 sm:px-6 py-3 text-xs text-gray-600 dark:text-gray-400">
          {breadcrumbItems.map((item, idx) => (
            <span key={idx}>
              {idx > 0 && ' › '}
              {idx < breadcrumbItems.length - 1 ? (
                <a href={item.url} className="hover:text-gray-900 dark:hover:text-gray-200">
                  {item.name}
                </a>
              ) : (
                item.name
              )}
            </span>
          ))}
        </nav>

        {/* Main Content */}
        <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          {/* Title Section */}
          <header className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-400">
              {post.organizationName && <span>{post.organizationName}</span>}
              {post.locationState && <span>•</span>}
              {post.locationState && <span>{post.locationState}</span>}
              {publishedDate && <span>•</span>}
              {publishedDate && <span>Posted {formatDate(publishedDate)}</span>}
            </div>
          </header>

          {/* Organization Card (GEO Signal) */}
          {post.organizationName && (
            <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 flex gap-4">
              <div className="text-3xl">{orgEmoji}</div>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">{post.organizationName}</h2>
                {post.organizationType && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{post.organizationType}</p>
                )}
              </div>
            </div>
          )}

          {/* Application Status */}
          {(applicationDeadline || recruitmentClosed) && (
            <div className={`mb-6 p-3 rounded-lg text-sm font-semibold ${
              isApplicationClosed
                ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
            }`}>
              {isApplicationClosed
                ? applicationDeadline
                  ? `Applications closed on ${formatDate(applicationDeadline)}`
                  : 'This recruitment is closed'
                : `Applications close on ${formatDate(applicationDeadline!)}`}
            </div>
          )}

          {/* Completeness Badge */}
          {isCompletePost && (
            <div className="mb-6 p-3 rounded-lg bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-sm font-semibold">
              ✓ Complete post: {completenessCount}/{completenessMax} sections filled
            </div>
          )}

          {/* Introduction */}
          {post.description && (
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
              {post.description}
            </p>
          )}

          {/* Quick Facts Table (SEO + Mobile Sticky) */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
              Quick Facts for {post.title}
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                  {vacancies > 0 && (
                    <tr className="hover:bg-gray-50 dark:hover:bg-slate-900">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 w-32">Vacancies</th>
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-semibold">{vacancies}</td>
                    </tr>
                  )}
                  {post.locationState && (
                    <tr className="hover:bg-gray-50 dark:hover:bg-slate-900">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 w-32">Location</th>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{post.locationState}</td>
                    </tr>
                  )}
                  {salaryMin && (
                    <tr className="hover:bg-gray-50 dark:hover:bg-slate-900">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 w-32">Salary</th>
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-semibold">
                        ₹{formatCurrency(salaryMin)} – ₹{formatCurrency(salaryMax ?? salaryMin)}
                      </td>
                    </tr>
                  )}
                  {applicationDeadline && (
                    <tr className="hover:bg-gray-50 dark:hover:bg-slate-900">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 w-32">Apply By</th>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{formatDate(applicationDeadline)}</td>
                    </tr>
                  )}
                  {post.employmentType && (
                    <tr className="hover:bg-gray-50 dark:hover:bg-slate-900">
                      <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 w-32">Employment Type</th>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{post.employmentType}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Vacancies by Category - Phase 1 P0 */}
          {post.vacanciesByCategory && post.vacanciesByCategory.length > 0 && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Vacancy Breakdown
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                    {post.vacanciesByCategory.map((v, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-900">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 capitalize">{v.category}</th>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{v.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Qualifications Section */}
          {qualificationText && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Qualifications Required for {post.title}
              </h2>
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {qualificationText}
              </div>
            </section>
          )}

          {/* Education Requirements - Phase 1 P0 */}
          {post.educationRequirements && post.educationRequirements.length > 0 && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Education Requirements for {post.title}
              </h2>
              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                {post.educationRequirements.map((e, idx) => {
                  // Parse degree if it's a JSON string array
                  const degreeOptions = safeJsonParse<string[]>(e.degree, [e.degree || ''].filter(Boolean));
                  const isMultipleOptions = Array.isArray(degreeOptions) && degreeOptions.length > 1;

                  return (
                    <li key={idx} className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                      {isMultipleOptions ? (
                        <div>
                          <div className="font-semibold mb-2">Any of the following:</div>
                          <ul className="list-disc list-inside space-y-1 text-sm">
                            {degreeOptions.map((option, optIdx) => (
                              <li key={optIdx} className="text-gray-700 dark:text-gray-300">
                                {option}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="font-semibold">{degreeOptions[0] || e.degree}</div>
                      )}
                      {e.subject && <div className="text-sm mt-2">Subject: {e.subject}</div>}
                      {e.specialization && <div className="text-sm">Specialization: {e.specialization}</div>}
                      {e.minimumPercentage && <div className="text-sm">Minimum: {e.minimumPercentage}%</div>}
                      {e.confidenceScore && <div className="text-xs text-gray-500 mt-2">Confidence: {e.confidenceScore}%</div>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Age Limit Section */}
          {(post.ageLimit || post.fjaExtract?.ageRaw || (post.ageRules && post.ageRules.length > 0)) && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Age Limit
              </h2>
              {post.ageLimit || post.fjaExtract?.ageRaw ? (
                <p className="text-gray-700 dark:text-gray-300">
                  {post.ageLimit || post.fjaExtract?.ageRaw}
                </p>
              ) : null}
              {post.ageRules && post.ageRules.length > 0 && (
                <ul className="space-y-2 mt-4 text-gray-700 dark:text-gray-300">
                  {post.ageRules.map((rule, idx) => (
                    <li key={idx} className="text-sm">
                      <strong>{rule.category}:</strong> {rule.maxAge ? `Max ${rule.maxAge} years` : rule.ruleType === 'NO_UPPER_LIMIT' ? 'No upper age limit' : 'Check notification'}
                      {rule.relaxationYears && ` (+ ${rule.relaxationYears} years relaxation)`}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Experience Section */}
          {(experienceText || (post.experienceRequirements && post.experienceRequirements.length > 0)) && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Experience Required
              </h2>
              {experienceText && (
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed mb-4">
                  {experienceText}
                </div>
              )}
              {post.experienceRequirements && post.experienceRequirements.length > 0 && (
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  {post.experienceRequirements.map((exp, idx) => (
                    <li key={idx} className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                      <div className="font-semibold">{exp.type}</div>
                      <div className="text-sm">
                        {exp.minYears || exp.totalYears ? `${exp.minYears || exp.totalYears} years required` : 'Experience required'}
                      </div>
                      {exp.confidenceScore && <div className="text-xs text-gray-500 mt-2">Confidence: {exp.confidenceScore}%</div>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Selection Process - Phase 1 P0 */}
          {(post.selectionProcess || (post.selectionProcessStages && post.selectionProcessStages.length > 0)) && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Selection Process
              </h2>
              {post.selectionProcess && (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  {post.selectionProcess}
                </p>
              )}
              {post.selectionProcessStages && post.selectionProcessStages.length > 0 && (
                <ol className="space-y-3 text-gray-700 dark:text-gray-300 list-decimal list-inside">
                  {post.selectionProcessStages.map((stage, idx) => (
                    <li key={idx} className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                      <div className="font-semibold">{stage.name}</div>
                      {stage.totalMarks && <div className="text-sm">Total Marks: {stage.totalMarks}</div>}
                      {stage.minimumMarks && <div className="text-sm">Passing: {stage.minimumMarks}</div>}
                      {stage.durationMinutes && <div className="text-sm">Duration: {stage.durationMinutes} minutes</div>}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          {/* Required Documents - Phase 1 P0 */}
          {post.requiredDocuments && post.requiredDocuments.length > 0 && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Required Documents
              </h2>
              <div className="space-y-2">
                {post.requiredDocuments.map((doc, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg flex items-start gap-3">
                    <span className={`text-lg ${doc.isRequired ? '✓' : '○'}`}>{doc.isRequired ? '✓' : '○'}</span>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{doc.name}</div>
                      {doc.category && <div className="text-sm text-gray-600 dark:text-gray-400">{doc.category}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Important Dates - Phase 1 P0 */}
          {post.importantDates && post.importantDates.length > 0 && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Important Dates
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                    {post.importantDates.map((date, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-900">
                        <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 capitalize">{date.type}</th>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{formatDate(new Date(date.date))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* How to Apply */}
          {post.howToApply && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                How to Apply
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {post.howToApply}
              </p>
            </section>
          )}

          {/* Application Fee */}
          {post.applicationFees && post.applicationFees.length > 0 && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Application Fee
              </h2>
              <div className="space-y-2">
                {post.applicationFees.map((fee, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {fee.amount !== null && fee.amount !== undefined ? `₹${formatCurrency(fee.amount)}` : 'Fee Waived'}
                    </div>
                    {fee.currency && fee.currency !== 'INR' && <div className="text-sm text-gray-600 dark:text-gray-400">Currency: {fee.currency}</div>}
                    {fee.waivedFor && <div className="text-sm text-gray-600 dark:text-gray-400">Waived for: {fee.waivedFor}</div>}
                    {fee.paymentMethods && <div className="text-sm text-gray-600 dark:text-gray-400">Payment: {fee.paymentMethods}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Important Links */}
          {(post.officialLinks?.length || post.applyUrl || post.officialSourceUrl) && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Important Links
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                    {post.officialLinks && post.officialLinks.length > 0 ? (
                      // Display official links if available
                      post.officialLinks.map((link, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-900">
                          <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">
                            {link.title || link.type?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Link'}
                          </th>
                          <td className="px-4 py-3">
                            {link.url ? (
                              <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                {link.type === 'apply_online' ? 'Click here' : link.type === 'official_notification' ? 'Download PDF' : 'Open Link'}
                              </a>
                            ) : (
                              <span className="text-gray-500">No link available</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      // Fallback to original links if no official links data
                      <>
                        {post.applyUrl && (
                          <tr className="hover:bg-gray-50 dark:hover:bg-slate-900">
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Apply Online</th>
                            <td className="px-4 py-3">
                              <a href={post.applyUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                Click here
                              </a>
                            </td>
                          </tr>
                        )}
                        {post.officialSourceUrl && (
                          <tr className="hover:bg-gray-50 dark:hover:bg-slate-900">
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Official Notification</th>
                            <td className="px-4 py-3">
                              <a href={post.officialSourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                                Download PDF
                              </a>
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            {post.applyUrl && (
              <>
                {isApplicationClosed ? (
                  <div className="flex-1 px-6 py-3 bg-gray-400 text-white font-semibold rounded-lg text-center cursor-not-allowed opacity-60">
                    Applications Closed
                  </div>
                ) : (
                  <a
                    href={post.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-center transition-colors"
                  >
                    Apply Now
                  </a>
                )}
              </>
            )}
            {post.officialSourceUrl && (
              <a
                href={post.officialSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-900 text-gray-900 dark:text-white font-semibold rounded-lg text-center transition-colors"
              >
                Official Notification
              </a>
            )}
          </div>

          {/* FAQs — Auto-generated from post metadata or provided via prop */}
          {(() => {
            // Use provided FAQs or generate from post metadata
            const faqsToDisplay = faqs && faqs.length > 0 ? faqs : generateFAQs({
              title: post.title,
              organizationName: post.organizationName || undefined,
              recruitmentName: post.recruitmentName || undefined,
              qualificationText: qualificationText || undefined,
              experienceText: experienceText || undefined,
              locationCity: post.locationCity || undefined,
              locationState: post.locationState || undefined,
              salary: { min: salaryMin ?? undefined, max: salaryMax ?? undefined },
              applicationDeadline: applicationDeadline || undefined,
              examDate: post.importantDates?.find(d => d.type?.toLowerCase().includes('exam'))
                ? new Date(post.importantDates.find(d => d.type?.toLowerCase().includes('exam'))?.date || '')
                : undefined,
              ageMin: post.ageRules?.[0]?.maxAge ? 18 : undefined,
              ageMax: post.ageRules?.[0]?.maxAge,
            });

            return faqsToDisplay && faqsToDisplay.length > 0 ? (
              <FAQSection faqs={faqsToDisplay} postId={post.id} postTitle={post.title} />
            ) : null;
          })()}

          {/* Application Instructions */}
          {(() => {
            const appInstructions = generateApplicationInstructions({
              applyUrl: post.applyUrl,
              officialSourceUrl: post.officialSourceUrl,
              organizationName: post.organizationName,
              locationCity: post.locationCity,
              locationState: post.locationState,
              employmentType: post.employmentType,
              requiredDocuments: post.requiredDocuments,
              applicationDeadline,
            });

            const requiredDocs = generateRequiredDocuments({
              applyUrl: post.applyUrl,
              officialSourceUrl: post.officialSourceUrl,
              organizationName: post.organizationName,
              locationCity: post.locationCity,
              locationState: post.locationState,
              employmentType: post.employmentType,
              requiredDocuments: post.requiredDocuments,
              applicationDeadline,
            });

            return appInstructions && appInstructions.length > 0 ? (
              <ApplicationInstructionsSection
                instructions={appInstructions}
                requiredDocuments={requiredDocs}
                applicationDeadline={applicationDeadline || undefined}
                organizationName={post.organizationName || undefined}
              />
            ) : null;
          })()}

          {/* Related Opportunities — Semantically grouped */}
          {(
            (relatedByOrg && relatedByOrg.length > 0) ||
            (relatedByLocation && relatedByLocation.length > 0) ||
            (relatedByRole && relatedByRole.length > 0) ||
            (relatedJobs && relatedJobs.length > 0)
          ) && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Related Opportunities
              </h2>

              {relatedByOrg && relatedByOrg.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Other jobs at {post.organizationName}
                  </h3>
                  <ul className="space-y-2">
                    {relatedByOrg.map(r => (
                      <li key={r.slug}>
                        <a
                          href={`/jobs/${r.recruitment_slug}/${r.slug}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {r.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {relatedByLocation && relatedByLocation.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Other jobs in {post.locationState}
                  </h3>
                  <ul className="space-y-2">
                    {relatedByLocation.map(r => (
                      <li key={r.slug}>
                        <a
                          href={`/jobs/${r.recruitment_slug}/${r.slug}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {r.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {relatedByRole && relatedByRole.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Other similar positions
                  </h3>
                  <ul className="space-y-2">
                    {relatedByRole.map(r => (
                      <li key={r.slug}>
                        <a
                          href={`/jobs/${r.recruitment_slug}/${r.slug}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {r.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {relatedJobs && relatedJobs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">More opportunities</h3>
                  <ul className="space-y-3 divide-y divide-gray-200 dark:divide-slate-800">
                    {relatedJobs.map(job => (
                      <li key={job.id} className="py-3">
                        <a
                          href={`/jobs/${job.recruitmentSlug}/${job.slug}`}
                          className="block text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                        >
                          {job.title}
                        </a>
                        {job.applicationDeadline && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Apply by {formatDate(new Date(job.applicationDeadline))}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Pillar Context Link — Phase 2 Tier 1 */}
          {pillarSlug && (
            <section className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                📚 Learn More About {post.organizationName} Recruitment
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                View the complete {post.organizationName} recruitment guide including salary structure, eligibility criteria, application process, and more.
              </p>
              <a
                href={`/exams/${pillarSlug}/`}
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition font-medium"
              >
                View {post.organizationName} Guide →
              </a>
            </section>
          )}

          {/* Disclaimer */}
          <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 text-sm text-gray-700 dark:text-gray-300">
            <p>
              <strong>Disclaimer:</strong> JobOye is not a government website. Information on this page is compiled from official notifications.
              Candidates should verify all details on the official website before applying.
            </p>
          </div>
        </article>
      </main>

      {/* ─ Mobile Sticky Apply Bar ─ */}
      {post.applyUrl && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 p-4 z-40">
          {isApplicationClosed ? (
            <div className="w-full block px-6 py-3 bg-gray-400 text-white font-semibold rounded-lg text-center opacity-60">
              Applications Closed
            </div>
          ) : (
            <a
              href={post.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-center transition-colors"
            >
              Apply Now
            </a>
          )}
        </div>
      )}
    </>
  );
}
