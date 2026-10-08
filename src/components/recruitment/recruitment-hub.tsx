'use client';

/**
 * Recruitment Hub Component
 *
 * Route: /jobs/[recruitment-slug]
 *
 * Spec: Recruitment-level discovery and navigation page.
 * This is NOT a Post Leaf. It does not duplicate Post-specific facts.
 *
 * Architecture (approved spec, 2026-10-09):
 *   - Recruitment Header: identity, status badge (from recruitment.status enum), primary CTA
 *   - Recruitment Snapshot: key resolver-gated facts only
 *   - Dated milestone timeline: Notification → Application Opens → Application Closes
 *     (lifecycle status badge is separate from the dated timeline)
 *   - Posts / Opportunities: single-column comparison list, resolvePostVacancy() per row
 *   - FAQ: conditional — only questions whose answer is a non-null resolver output
 *   - Trust / Source: official notification + apply links
 *
 * Excluded (by spec):
 *   - Salary / pay level (Post-specific; Phase 1 exclusion)
 *   - Eligibility, qualification, age, experience (Post Leaf only / Phase 2)
 *   - "Am I eligible?" checker
 *   - Generic fabricated FAQ answers
 *   - Enrichment fields as authoritative facts
 *   - Filter chips, pagination (Phase 1)
 *   - Summing Post vacancies for Recruitment total
 */

import React from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  Briefcase,
  Users,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  Globe,
  MapPin,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

interface RecruitmentHubProps {
  recruitment: any;
  posts: any[];
  /** Resolved total vacancies from resolveRecruitmentVacancy() — null means unknown */
  resolvedTotalVacancies?: number | null;
  /** Resolved application URL from resolveApplicationUrl() */
  resolvedApplicationUrl?: string | null;
  /** Resolved official source URL from resolveOfficialSource() */
  resolvedOfficialSource?: string | null;
  /** Resolved employer name from resolveEmployer() */
  resolvedEmployer?: string | null;
  /** Resolved selection process from resolveSelectionProcess() */
  resolvedSelectionProcess?: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (date: any): string | null => {
  if (!date) return null;
  try {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return null;
  }
};

/** Returns true only when the status string explicitly means closed/expired */
const isRecruitmentClosed = (status: string | null | undefined): boolean => {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'closed' || s === 'expired' || s === 'completed';
};

const isRecruitmentActive = (status: string | null | undefined): boolean => {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'active' || s === 'open';
};

const isRecruitmentUpcoming = (status: string | null | undefined): boolean => {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'upcoming' || s === 'announced';
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return null;

  if (isRecruitmentClosed(status)) {
    return (
      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full border border-gray-300">
        Closed
      </span>
    );
  }
  if (isRecruitmentActive(status)) {
    return (
      <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full border border-green-300">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
        Active
      </span>
    );
  }
  if (isRecruitmentUpcoming(status)) {
    return (
      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full border border-blue-300">
        Upcoming
      </span>
    );
  }
  // Unknown/other — show the raw value without fabricating meaning
  return (
    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full border border-gray-200">
      {status}
    </span>
  );
}

function PostStatusBadge({ post }: { post: any }) {
  const status = post.status ?? post.lifecycle_status ?? null;
  if (!status) return null;

  const s = String(status).toLowerCase();
  if (s === 'closed' || s === 'expired') {
    return (
      <span className="inline-block bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded border border-gray-200">
        Closed
      </span>
    );
  }
  if (s === 'active' || s === 'open') {
    return (
      <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded border border-green-200">
        Active
      </span>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RecruitmentHub({
  recruitment,
  posts,
  resolvedTotalVacancies,
  resolvedApplicationUrl,
  resolvedOfficialSource,
  resolvedEmployer,
  resolvedSelectionProcess,
}: RecruitmentHubProps) {
  const displayOrg = resolvedEmployer ?? recruitment.organizationName ?? null;
  const notificationDate = formatDate(recruitment.notificationDate);
  const appStart = formatDate(recruitment.applicationStartDate);
  const appEnd = formatDate(recruitment.applicationEndDate);
  const closed = isRecruitmentClosed(recruitment.status);

  // Determine if the dated timeline has anything to show
  const hasTimeline = !!(notificationDate || appStart || appEnd);

  // Posts: single-column comparison list
  const hasPosts = posts.length > 0;
  const isSinglePost = posts.length === 1;

  // FAQ: only questions with non-null answers
  const faqItems: { q: string; a: string }[] = [];

  if (recruitment.name && displayOrg) {
    faqItems.push({
      q: `What is ${recruitment.name}?`,
      a: `${recruitment.name} is a recruitment conducted by ${displayOrg}${recruitment.year ? ` for the year ${recruitment.year}` : ''}.`,
    });
  }

  if (resolvedTotalVacancies != null) {
    faqItems.push({
      q: 'How many vacancies are available?',
      a: `A total of ${resolvedTotalVacancies.toLocaleString('en-IN')} vacancies are available across ${posts.length} post${posts.length !== 1 ? 's' : ''}.`,
    });
  }

  if (appEnd) {
    faqItems.push({
      q: 'When does the application close?',
      a: `The last date to apply is ${appEnd}.`,
    });
  }

  if (hasPosts && posts.length > 1) {
    const postNames = posts.slice(0, 5).map((p: any) => p.name ?? p.position?.name).filter(Boolean);
    if (postNames.length > 0) {
      faqItems.push({
        q: 'Which posts are included in this recruitment?',
        a: `This recruitment includes ${posts.length} posts, including: ${postNames.join(', ')}${posts.length > 5 ? ', and more' : ''}.`,
      });
    }
  }

  if (resolvedSelectionProcess) {
    faqItems.push({
      q: 'What is the selection process?',
      a: resolvedSelectionProcess,
    });
  }

  if (resolvedOfficialSource) {
    faqItems.push({
      q: 'Where is the official notification?',
      a: `The official notification is available at the link below in the Sources section.`,
    });
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── Sticky breadcrumb bar ── */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/jobs" className="text-blue-600 hover:text-blue-700 font-medium">
              Jobs
            </Link>
            {displayOrg && (
              <>
                <ChevronRight size={14} className="text-gray-400" />
                <span className="text-gray-500 truncate max-w-[120px] md:max-w-xs hidden sm:inline">
                  {displayOrg}
                </span>
              </>
            )}
            <ChevronRight size={14} className="text-gray-400" />
            <span className="text-gray-900 font-medium truncate max-w-[180px] md:max-w-md">
              {recruitment.name}
            </span>
          </nav>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-5xl mx-auto">

        {/* ═══════════════════════════════════════════
            SECTION 1 — RECRUITMENT HEADER
            ═══════════════════════════════════════════ */}
        <div className="bg-white border-b border-gray-200 px-4 py-8 md:py-10">
          {/* Status badge — from recruitment.status enum, not derived from dates */}
          <div className="mb-3">
            <StatusBadge status={recruitment.status} />
          </div>

          {/* Recruitment name (h1) */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 leading-tight">
            {recruitment.name}
          </h1>

          {/* Organization */}
          {displayOrg && (
            <p className="text-gray-600 mb-1">
              <span className="font-medium">{displayOrg}</span>
            </p>
          )}

          {/* Year context */}
          {recruitment.year && (
            <p className="text-sm text-gray-500 mb-4">{recruitment.year}</p>
          )}

          {/* One-sentence description — only from authoritative source */}
          {recruitment.description && (
            <p className="text-gray-700 mb-6 leading-relaxed">{recruitment.description}</p>
          )}

          {/* Primary CTA */}
          {isSinglePost ? (
            <Link
              href={`/jobs/${recruitment.slug}/${posts[0].slug}`}
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition text-sm"
            >
              View Post Details
              <ArrowRight size={16} />
            </Link>
          ) : hasPosts ? (
            <a
              href="#posts"
              className="inline-flex items-center gap-2 bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition text-sm"
            >
              View All Posts ({posts.length})
              <ArrowRight size={16} />
            </a>
          ) : null}
        </div>

        {/* ═══════════════════════════════════════════
            SECTION 2 — RECRUITMENT SNAPSHOT
            ═══════════════════════════════════════════ */}
        <div className="px-4 py-8 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recruitment Overview</h2>
          <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200 overflow-hidden">

            {displayOrg && (
              <div className="flex items-baseline gap-4 px-4 py-3 bg-white">
                <dt className="text-sm font-medium text-gray-500 w-40 flex-shrink-0">Organization</dt>
                <dd className="text-sm text-gray-900 font-medium">{displayOrg}</dd>
              </div>
            )}

            {/* Total vacancies — only resolveRecruitmentVacancy() output */}
            {resolvedTotalVacancies != null && (
              <div className="flex items-baseline gap-4 px-4 py-3 bg-white">
                <dt className="text-sm font-medium text-gray-500 w-40 flex-shrink-0">Total Vacancies</dt>
                <dd className="text-sm text-gray-900 font-bold">
                  {resolvedTotalVacancies.toLocaleString('en-IN')}
                </dd>
              </div>
            )}

            {posts.length > 0 && (
              <div className="flex items-baseline gap-4 px-4 py-3 bg-white">
                <dt className="text-sm font-medium text-gray-500 w-40 flex-shrink-0">Total Posts</dt>
                <dd className="text-sm text-gray-900">{posts.length}</dd>
              </div>
            )}

            {appStart && (
              <div className="flex items-baseline gap-4 px-4 py-3 bg-white">
                <dt className="text-sm font-medium text-gray-500 w-40 flex-shrink-0">Application Opens</dt>
                <dd className="text-sm text-gray-900">{appStart}</dd>
              </div>
            )}

            {appEnd && (
              <div className={`flex items-baseline gap-4 px-4 py-3 ${closed ? 'bg-gray-50' : 'bg-white'}`}>
                <dt className="text-sm font-medium text-gray-500 w-40 flex-shrink-0">Application Closes</dt>
                <dd className={`text-sm font-semibold ${closed ? 'text-gray-500' : 'text-red-700'}`}>
                  {appEnd}
                  {closed && <span className="ml-2 text-xs font-normal text-gray-400">(Closed)</span>}
                </dd>
              </div>
            )}

            {resolvedSelectionProcess && (
              <div className="flex items-baseline gap-4 px-4 py-3 bg-white">
                <dt className="text-sm font-medium text-gray-500 w-40 flex-shrink-0">Selection Process</dt>
                <dd className="text-sm text-gray-900">{resolvedSelectionProcess}</dd>
              </div>
            )}

            {resolvedOfficialSource && (
              <div className="flex items-baseline gap-4 px-4 py-3 bg-white">
                <dt className="text-sm font-medium text-gray-500 w-40 flex-shrink-0">Official Notification</dt>
                <dd className="text-sm">
                  <a
                    href={resolvedOfficialSource}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                  >
                    View Notification
                    <ExternalLink size={13} />
                  </a>
                </dd>
              </div>
            )}

            {resolvedApplicationUrl && (
              <div className="flex items-baseline gap-4 px-4 py-3 bg-white">
                <dt className="text-sm font-medium text-gray-500 w-40 flex-shrink-0">Apply Online</dt>
                <dd className="text-sm">
                  <a
                    href={resolvedApplicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-700 hover:text-green-800 font-medium inline-flex items-center gap-1"
                  >
                    Official Apply Portal
                    <ExternalLink size={13} />
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* ═══════════════════════════════════════════
            SECTION 3 — DATED MILESTONE TIMELINE
            (separate from the lifecycle status badge)
            ═══════════════════════════════════════════ */}
        {hasTimeline && (
          <div className="px-4 py-8 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-blue-600" />
              Important Dates
            </h2>
            <ol className="space-y-3">
              {notificationDate && (
                <li className="flex gap-4 items-start">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    1
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{notificationDate}</div>
                    <div className="text-xs text-gray-500">Notification Published</div>
                  </div>
                </li>
              )}
              {appStart && (
                <li className="flex gap-4 items-start">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    {notificationDate ? 2 : 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{appStart}</div>
                    <div className="text-xs text-gray-500">Application Opens</div>
                  </div>
                </li>
              )}
              {appEnd && (
                <li className="flex gap-4 items-start">
                  <div className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                    closed ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-700'
                  }`}>
                    {[notificationDate, appStart].filter(Boolean).length + 1}
                  </div>
                  <div>
                    <div className={`text-sm font-semibold ${closed ? 'text-gray-500' : 'text-red-800'}`}>
                      {appEnd}
                      {closed && <span className="ml-2 text-xs font-normal text-gray-400">Closed</span>}
                    </div>
                    <div className="text-xs text-gray-500">Application Deadline</div>
                  </div>
                </li>
              )}
            </ol>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTION 4 — POSTS / OPPORTUNITIES
            Core navigation component
            ═══════════════════════════════════════════ */}
        {hasPosts && (
          <div id="posts" className="px-4 py-8 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Briefcase size={20} className="text-blue-600" />
              {isSinglePost ? 'Available Post' : `Available Posts (${posts.length})`}
            </h2>
            {!isSinglePost && (
              <p className="text-sm text-gray-500 mb-4">
                Select the post you are interested in to view full details.
              </p>
            )}

            {isSinglePost ? (
              /* Single Post: prominent entry point, not a one-row table */
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                <Link
                  href={`/jobs/${recruitment.slug}/${posts[0].slug}`}
                  className="group block"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition mb-2">
                        {posts[0].name ?? posts[0].position?.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        {posts[0].resolvedVacancyCount != null && (
                          <span className="flex items-center gap-1">
                            <Users size={14} className="text-blue-500" />
                            {posts[0].resolvedVacancyCount.toLocaleString('en-IN')} vacancies
                          </span>
                        )}
                        {posts[0].position?.locationText && (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} className="text-gray-400" />
                            {posts[0].position.locationText}
                          </span>
                        )}
                        <PostStatusBadge post={posts[0]} />
                      </div>
                    </div>
                    <ArrowRight size={20} className="text-blue-600 flex-shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <Link
                    href={`/jobs/${recruitment.slug}/${posts[0].slug}`}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                  >
                    View Full Post Details
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            ) : (
              /* Multi-Post: single-column comparison list */
              <div className="space-y-2">
                {posts.map((post: any) => {
                  const postVacancies = post.resolvedVacancyCount ?? null;
                  const postName = post.name ?? post.position?.name ?? 'View Post';
                  const locationText = post.position?.locationText ?? post.locationText ?? null;

                  return (
                    <Link
                      key={post.id}
                      href={`/jobs/${recruitment.slug}/${post.slug}`}
                      className="flex items-center justify-between gap-4 px-4 py-4 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        {/* Title — line 1 */}
                        <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition text-sm md:text-base truncate mb-1">
                          {postName}
                        </div>
                        {/* Vacancy + location — line 2 (only when available) */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          {postVacancies != null && (
                            <span className="flex items-center gap-1">
                              <Users size={12} className="text-blue-400" />
                              {postVacancies.toLocaleString('en-IN')} vacancies
                            </span>
                          )}
                          {locationText && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-gray-400" />
                              {locationText}
                            </span>
                          )}
                          <PostStatusBadge post={post} />
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTION 5 — FAQ
            Conditional — only questions with non-null authoritative answers
            ═══════════════════════════════════════════ */}
        {faqItems.length > 0 && (
          <div className="px-4 py-8 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Globe size={20} className="text-blue-600" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqItems.map((faq, idx) => (
                <details key={idx} className="group bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <summary className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer select-none hover:bg-gray-50 transition text-sm font-semibold text-gray-900 list-none">
                    <span>{faq.q}</span>
                    <ChevronRight size={16} className="text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-4 pb-4 pt-1 text-sm text-gray-700 leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTION 6 — TRUST / SOURCE
            Official links only — no fabricated content
            ═══════════════════════════════════════════ */}
        {(resolvedOfficialSource || resolvedApplicationUrl) && (
          <div className="px-4 py-8 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle size={20} className="text-green-600" />
              Official Sources
            </h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 space-y-3">
              <p className="text-sm text-green-800">
                Verify all details directly from the official sources below before applying.
              </p>
              {resolvedOfficialSource && (
                <div className="flex items-start gap-3">
                  <FileText size={16} className="text-green-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-green-700 font-medium mb-0.5">Official Notification</div>
                    <a
                      href={resolvedOfficialSource}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-700 hover:text-blue-800 break-all inline-flex items-center gap-1"
                    >
                      {resolvedOfficialSource}
                      <ExternalLink size={12} className="flex-shrink-0" />
                    </a>
                  </div>
                </div>
              )}
              {resolvedApplicationUrl && (
                <div className="flex items-start gap-3">
                  <Globe size={16} className="text-green-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-green-700 font-medium mb-0.5">Official Apply Portal</div>
                    <a
                      href={resolvedApplicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-800 hover:text-green-900 font-semibold break-all inline-flex items-center gap-1"
                    >
                      Apply on Official Website
                      <ExternalLink size={12} className="flex-shrink-0" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            ACTION BAR — linked, not dead buttons
            ═══════════════════════════════════════════ */}
        {(resolvedOfficialSource || resolvedApplicationUrl) && (
          <div className="px-4 py-6 flex gap-3 flex-col md:flex-row">
            {resolvedOfficialSource && (
              <a
                href={resolvedOfficialSource}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-blue-600 text-blue-700 font-semibold py-3 rounded-lg hover:bg-blue-50 transition text-sm"
              >
                <FileText size={16} />
                Read Official Notification
              </a>
            )}
            {resolvedApplicationUrl && !closed && (
              <a
                href={resolvedApplicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-green-700 transition text-sm"
              >
                <Globe size={16} />
                Apply on Official Website
              </a>
            )}
          </div>
        )}

        {/* Warning banner for closed recruitments */}
        {closed && (
          <div className="mx-4 mb-6 bg-gray-50 border border-gray-300 rounded-lg p-4 flex gap-3">
            <AlertCircle size={18} className="text-gray-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600">
              This recruitment is closed. Application submission is no longer available.
              Verify the status on the official notification.
            </p>
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}
