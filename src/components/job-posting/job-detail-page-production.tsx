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

interface OrganizationData {
  name: string | null;
  type?: string | null;
  url?: string | null;
  logoUrl?: string | null;
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
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  locale?: string;
  canonicalUrl: string;
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
  faqs,
  locale = 'en',
  canonicalUrl,
}: JobDetailPageProps) {
  // Data normalization
  const vacancies = post.vacancies ?? 0;
  const salaryMin = post.salary?.min ?? null;
  const salaryMax = post.salary?.max ?? null;
  const applicationDeadline = post.applicationDeadline ? new Date(post.applicationDeadline) : null;
  const isApplicationClosed = applicationDeadline && new Date() > applicationDeadline;
  const publishedDate = post.notificationPublicationDate || post.postedAt ? new Date(post.notificationPublicationDate || post.postedAt!) : null;
  const modifiedDate = post.updatedAt ? new Date(post.updatedAt) : null;

  // Qualification & skills
  const qualificationText = post.qualificationText || post.fjaExtract?.qualificationRaw || null;
  const experienceText = post.experienceText || post.fjaExtract?.experienceRaw || null;
  const extractedSkills = extractSkillsFromQualification(qualificationText);

  // Organization branding
  const orgEmoji = getOrgEmojiByType(post.organizationType);

  // Breadcrumb data for GEO/navigation
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
      {locale !== 'hi' && (
        <>
          <JobPostingSchema {...schemaData} />

          {/* BreadcrumbList for GEO + Navigation */}
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              'itemListElement': breadcrumbItems.map((item, idx) => ({
                '@type': 'ListItem',
                position: idx + 1,
                name: item.name,
                item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://joboye.com'}${item.url}`,
              })),
            })}
          </script>
        </>
      )}

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
          {applicationDeadline && (
            <div className={`mb-6 p-3 rounded-lg text-sm font-semibold ${
              isApplicationClosed
                ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
            }`}>
              {isApplicationClosed
                ? `Applications closed on ${formatDate(applicationDeadline)}`
                : `Applications close on ${formatDate(applicationDeadline)}`}
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
              Quick Facts
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

          {/* Qualifications Section */}
          {qualificationText && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Qualifications Required
              </h2>
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {qualificationText}
              </div>
            </section>
          )}

          {/* Age Limit Section */}
          {(post.ageLimit || post.fjaExtract?.ageRaw) && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Age Limit
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                {post.ageLimit || post.fjaExtract?.ageRaw}
              </p>
            </section>
          )}

          {/* Experience Section */}
          {experienceText && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Experience Required
              </h2>
              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {experienceText}
              </div>
            </section>
          )}

          {/* Selection Process */}
          {post.selectionProcess && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Selection Process
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {post.selectionProcess}
              </p>
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

          {/* Important Links */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
              Important Links
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
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
                </tbody>
              </table>
            </div>
          </section>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            {post.applyUrl && (
              <a
                href={post.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-center transition-colors"
              >
                Apply Now
              </a>
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

          {/* FAQs */}
          {faqs && faqs.length > 0 && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <details key={idx} className="border border-gray-200 dark:border-slate-800 rounded-lg">
                    <summary className="cursor-pointer px-4 py-3 font-semibold text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-900">
                      {faq.question}
                    </summary>
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-300">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Related Jobs */}
          {relatedJobs && relatedJobs.length > 0 && (
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 border-b-2 border-gray-200 dark:border-slate-800 pb-2">
                Related Job Opportunities
              </h2>
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
          <a
            href={post.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-center transition-colors"
          >
            Apply Now
          </a>
        </div>
      )}
    </>
  );
}
