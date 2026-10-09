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
 *   - Recruitment Header: identity, status badge, key stats hero (vacancy + deadline)
 *   - Recruitment Snapshot: key resolver-gated facts only
 *   - Dated milestone timeline: Notification → Application Opens → Application Closes
 *   - Posts / Opportunities: single-column list with per-row vacancy + status colour
 *   - FAQ: conditional — only questions whose answer is a non-null resolver output
 *   - Trust / Source: official notification + apply links
 *
 * Competitor improvements (2026-10-09):
 *   - Vacancy count is a large hero stat, not a table row (YuvaResult pattern)
 *   - "Closing in N days" urgency countdown when deadline ≤ 14 days (FreeJobAlert pattern)
 *   - Per-post status colour badges: Open / Closing Soon / Closed (JobOne.in pattern)
 *   - Stats row beneath title: vacancies + deadline + post count as scannable chips
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
  Clock,
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
  /** Org slug for breadcrumb link — from organizations.slug */
  orgSlug?: string | null;
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

/** Days remaining until a date. Negative = already past. */
const daysUntil = (date: any): number | null => {
  if (!date) return null;
  try {
    const ms = new Date(date).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
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
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
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
  return (
    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded-full border border-gray-200">
      {status}
    </span>
  );
}

/** Per-post status badge with colour coding (JobOne.in pattern) */
function PostStatusBadge({ post, appEndDate }: { post: any; appEndDate?: any }) {
  const status = post.status ?? post.lifecycle_status ?? null;

  // If post has explicit closed/expired status
  if (status) {
    const s = String(status).toLowerCase();
    if (s === 'closed' || s === 'expired') {
      return (
        <span className="inline-block bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200">
          Closed
        </span>
      );
    }
  }

  // Use recruitment deadline for "Closing Soon" signal when post has no individual status
  if (appEndDate) {
    const days = daysUntil(appEndDate);
    if (days !== null && days >= 0 && days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full border border-orange-200">
          <Clock size={10} />
          {days === 0 ? 'Last Day' : `${days}d left`}
        </span>
      );
    }
  }

  if (status) {
    const s = String(status).toLowerCase();
    if (s === 'active' || s === 'open') {
      return (
        <span className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full border border-green-200">
          Open
        </span>
      );
    }
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
  orgSlug,
}: RecruitmentHubProps) {
  const displayOrg = resolvedEmployer ?? recruitment.organizationName ?? null;
  const notificationDate = formatDate(recruitment.notificationDate);
  const appStart = formatDate(recruitment.applicationStartDate);
  const appEnd = formatDate(recruitment.applicationEndDate);
  const closed = isRecruitmentClosed(recruitment.status);

  // Render values already maintained by the admin/data pipeline. Resolvers may
  // enrich these values, but a missing resolver result must not hide stored data.
  // Recruitment-level vacancy total is shown only when explicitly stored; never
  // derive it by summing post-level vacancy records.
  const displayTotalVacancies =
    resolvedTotalVacancies ?? recruitment.totalVacancies ?? null;
  const displayApplicationUrl =
    resolvedApplicationUrl ?? recruitment.officialApplicationUrl ?? recruitment.applyUrl ?? null;
  const displayOfficialSource =
    resolvedOfficialSource ?? recruitment.officialNotificationUrl ?? null;
  const displaySelectionProcess =
    resolvedSelectionProcess ?? recruitment.selectionProcess ?? null;

  // Urgency: days remaining for deadline
  const daysLeft = daysUntil(recruitment.applicationEndDate);
  const isClosingSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14 && !closed;
  const isLastDay = daysLeft === 0;

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

  if (displayTotalVacancies != null) {
    faqItems.push({
      q: 'How many vacancies are available?',
      a: `A total of ${displayTotalVacancies.toLocaleString('en-IN')} vacancies are available across ${posts.length} post${posts.length !== 1 ? 's' : ''}.`,
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

  if (displaySelectionProcess) {
    faqItems.push({
      q: 'What is the selection process?',
      a: displaySelectionProcess,
    });
  }

  if (displayOfficialSource) {
    faqItems.push({
      q: 'Where is the official notification?',
      a: `The official notification is available at the link below in the Sources section.`,
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">

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
                {orgSlug ? (
                  <Link href={`/organizations/${orgSlug}`} className="text-blue-600 hover:text-blue-700 truncate max-w-[120px] md:max-w-xs hidden sm:inline">
                    {displayOrg}
                  </Link>
                ) : (
                  <span className="text-gray-500 truncate max-w-[120px] md:max-w-xs hidden sm:inline">
                    {displayOrg}
                  </span>
                )}
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
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">

        {/* ═══════════════════════════════════════════
            SECTION 1 — RECRUITMENT HEADER
            Hero card: title + stat chips + CTAs
            ═══════════════════════════════════════════ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-6 md:px-8 md:py-8">

          {/* Status badge */}
          <div className="mb-3">
            <StatusBadge status={recruitment.status} />
          </div>

          {/* Recruitment name (h1) */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 leading-tight">
            {recruitment.name}
          </h1>

          {/* Organization */}
          {displayOrg && (
            <p className="text-base text-gray-600 mb-4 font-medium">{displayOrg}</p>
          )}

          {/* ── Hero stat row (YuvaResult pattern) ── */}
          {/* Vacancy count, deadline, post count as scannable chips */}
          <div className="flex flex-wrap gap-3 mb-6">
            {displayTotalVacancies != null && (
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
                <Users size={18} className="text-blue-600 flex-shrink-0" />
                <div>
                  <div className="text-xl font-bold text-blue-700 leading-none">
                    {displayTotalVacancies.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-blue-600 mt-0.5">Total Vacancies</div>
                </div>
              </div>
            )}

            {appEnd && (
              <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 border ${
                closed
                  ? 'bg-gray-50 border-gray-200'
                  : isLastDay
                  ? 'bg-red-50 border-red-300'
                  : isClosingSoon
                  ? 'bg-orange-50 border-orange-300'
                  : 'bg-white border-gray-200'
              }`}>
                <Clock size={18} className={
                  closed ? 'text-gray-400' :
                  isLastDay ? 'text-red-600' :
                  isClosingSoon ? 'text-orange-600' :
                  'text-gray-500'
                } />
                <div>
                  <div className={`text-base font-bold leading-none ${
                    closed ? 'text-gray-500' :
                    isLastDay ? 'text-red-700' :
                    isClosingSoon ? 'text-orange-700' :
                    'text-gray-900'
                  }`}>
                    {closed
                      ? 'Closed'
                      : isLastDay
                      ? 'Last Day!'
                      : isClosingSoon
                      ? `${daysLeft} days left`
                      : appEnd}
                  </div>
                  <div className={`text-xs mt-0.5 ${
                    closed ? 'text-gray-400' :
                    isLastDay ? 'text-red-600' :
                    isClosingSoon ? 'text-orange-600' :
                    'text-gray-500'
                  }`}>
                    {closed ? 'Application closed' : isClosingSoon || isLastDay ? `Closes ${appEnd}` : 'Last date'}
                  </div>
                </div>
              </div>
            )}

            {hasPosts && (
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2.5">
                <Briefcase size={18} className="text-gray-500 flex-shrink-0" />
                <div>
                  <div className="text-xl font-bold text-gray-900 leading-none">{posts.length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Post{posts.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
            )}
          </div>

          {/* One-sentence description — only from authoritative source */}
          {recruitment.description && (
            <p className="text-gray-600 mb-5 leading-relaxed text-sm">{recruitment.description}</p>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
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

            {displayApplicationUrl && !closed && (
              <a
                href={displayApplicationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 transition text-sm"
              >
                Apply Online
                <ExternalLink size={15} />
              </a>
            )}

            {displayOfficialSource && (
              <a
                href={displayOfficialSource}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-50 transition text-sm"
              >
                Official Notification
                <ExternalLink size={15} />
              </a>
            )}
          </div>
        </div>

        {/* Closed warning */}
        {closed && (
          <div className="bg-gray-50 border border-gray-300 rounded-xl px-5 py-4 flex gap-3">
            <AlertCircle size={18} className="text-gray-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600">
              This recruitment is closed. Application submission is no longer available.
              Verify the current status on the official notification.
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTION 2 — RECRUITMENT OVERVIEW TABLE
            Compact details: org, selection process, official links
            ═══════════════════════════════════════════ */}
        {(displayOrg || displaySelectionProcess || displayOfficialSource || displayApplicationUrl || appStart) && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 md:px-8">
            <h2 className="text-base font-bold text-gray-900 mb-3">Recruitment Details</h2>
            <dl className="divide-y divide-gray-100">

              {displayOrg && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Organization</dt>
                  <dd className="text-sm text-gray-900 font-medium">{displayOrg}</dd>
                </div>
              )}

              {recruitment.year && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Year</dt>
                  <dd className="text-sm text-gray-900">{recruitment.year}</dd>
                </div>
              )}

              {appStart && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Apply From</dt>
                  <dd className="text-sm text-gray-900">{appStart}</dd>
                </div>
              )}

              {appEnd && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Last Date</dt>
                  <dd className={`text-sm font-semibold ${closed ? 'text-gray-500' : isClosingSoon ? 'text-orange-700' : 'text-red-700'}`}>
                    {appEnd}
                    {!closed && isClosingSoon && daysLeft !== null && (
                      <span className="ml-2 text-xs font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                        {isLastDay ? 'Last Day' : `${daysLeft} days left`}
                      </span>
                    )}
                    {closed && <span className="ml-2 text-xs font-normal text-gray-400">(Closed)</span>}
                  </dd>
                </div>
              )}

              {displaySelectionProcess && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Selection</dt>
                  <dd className="text-sm text-gray-900">{displaySelectionProcess}</dd>
                </div>
              )}

              {displayOfficialSource && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Notification</dt>
                  <dd className="text-sm">
                    <a href={displayOfficialSource} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
                      View Official PDF <ExternalLink size={12} />
                    </a>
                  </dd>
                </div>
              )}

              {displayApplicationUrl && (
                <div className="flex gap-4 py-2.5">
                  <dt className="text-sm text-gray-500 w-36 flex-shrink-0">Apply Portal</dt>
                  <dd className="text-sm">
                    <a href={displayApplicationUrl} target="_blank" rel="noopener noreferrer"
                      className="text-green-700 hover:text-green-800 font-medium inline-flex items-center gap-1">
                      Official Apply Link <ExternalLink size={12} />
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTION 3 — IMPORTANT DATES TIMELINE
            ═══════════════════════════════════════════ */}
        {hasTimeline && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 md:px-8">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={17} className="text-blue-600" />
              Important Dates
            </h2>
            <ol className="relative border-l-2 border-gray-100 ml-3 space-y-5">
              {notificationDate && (
                <li className="pl-5 relative">
                  <span className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center" />
                  <div className="text-sm font-semibold text-gray-900">{notificationDate}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Notification Published</div>
                </li>
              )}
              {appStart && (
                <li className="pl-5 relative">
                  <span className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center" />
                  <div className="text-sm font-semibold text-gray-900">{appStart}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Application Opens</div>
                </li>
              )}
              {appEnd && (
                <li className="pl-5 relative">
                  <span className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    closed
                      ? 'bg-gray-100 border-gray-400'
                      : isClosingSoon
                      ? 'bg-orange-100 border-orange-400'
                      : 'bg-red-100 border-red-400'
                  }`} />
                  <div className={`text-sm font-semibold ${
                    closed ? 'text-gray-500' : isClosingSoon ? 'text-orange-800' : 'text-red-800'
                  }`}>
                    {appEnd}
                    {!closed && isClosingSoon && daysLeft !== null && (
                      <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded ${
                        isLastDay ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {isLastDay ? 'Last Day!' : `${daysLeft} days left`}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Application Deadline</div>
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
          <div id="posts" className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 md:px-8">
            <h2 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Briefcase size={17} className="text-blue-600" />
              {isSinglePost ? 'Available Post' : `Available Posts (${posts.length})`}
            </h2>
            {!isSinglePost && (
              <p className="text-sm text-gray-500 mb-4">
                Select the post you are interested in to view full details.
              </p>
            )}

            {isSinglePost ? (
              /* Single Post: prominent entry point */
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-5">
                <Link href={`/jobs/${recruitment.slug}/${posts[0].slug}`} className="group block">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition mb-2">
                        {posts[0].name ?? posts[0].position?.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        {posts[0].resolvedVacancyCount != null && (
                          <span className="flex items-center gap-1 font-semibold text-blue-700">
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
                        <PostStatusBadge post={posts[0]} appEndDate={recruitment.applicationEndDate} />
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
              /* Multi-Post: single-column list with per-row vacancy + status colour */
              <div className="mt-3 space-y-2">
                {posts.map((post: any) => {
                  const postVacancies = post.resolvedVacancyCount ?? null;
                  const postName = post.name ?? post.position?.name ?? 'View Post';
                  const locationText = post.position?.locationText ?? post.locationText ?? null;

                  return (
                    <Link
                      key={post.id}
                      href={`/jobs/${recruitment.slug}/${post.slug}`}
                      className="flex items-center justify-between gap-4 px-4 py-3.5 bg-white border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-sm transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        {/* Title */}
                        <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition text-sm truncate mb-1">
                          {postName}
                        </div>
                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          {postVacancies != null && (
                            <span className="flex items-center gap-1 font-medium text-blue-700">
                              <Users size={11} className="text-blue-500" />
                              {postVacancies.toLocaleString('en-IN')} vacancies
                            </span>
                          )}
                          {locationText && (
                            <span className="flex items-center gap-1">
                              <MapPin size={11} className="text-gray-400" />
                              {locationText}
                            </span>
                          )}
                          <PostStatusBadge post={post} appEndDate={recruitment.applicationEndDate} />
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 md:px-8">
            <h2 className="text-base font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {faqItems.map((faq, idx) => (
                <details key={idx} className="group border border-gray-200 rounded-lg overflow-hidden">
                  <summary className="flex items-center justify-between gap-4 px-4 py-3 cursor-pointer select-none hover:bg-gray-50 transition text-sm font-semibold text-gray-900 list-none">
                    <span>{faq.q}</span>
                    <ChevronRight size={15} className="text-gray-400 group-open:rotate-90 transition-transform flex-shrink-0" />
                  </summary>
                  <div className="px-4 pb-4 pt-2 text-sm text-gray-700 leading-relaxed border-t border-gray-100">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            SECTION 6 — OFFICIAL SOURCES
            ═══════════════════════════════════════════ */}
        {(displayOfficialSource || displayApplicationUrl) && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 md:px-8">
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              Official Sources
            </h2>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <p className="text-xs text-green-700">
                Verify all details directly from official sources before applying.
              </p>
              {displayOfficialSource && (
                <div className="flex items-start gap-3">
                  <FileText size={15} className="text-green-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-green-700 font-medium mb-0.5">Official Notification</div>
                    <a href={displayOfficialSource} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-700 hover:text-blue-800 break-all inline-flex items-center gap-1">
                      {displayOfficialSource}
                      <ExternalLink size={12} className="flex-shrink-0" />
                    </a>
                  </div>
                </div>
              )}
              {displayApplicationUrl && (
                <div className="flex items-start gap-3">
                  <Globe size={15} className="text-green-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-green-700 font-medium mb-0.5">Official Apply Portal</div>
                    <a href={displayApplicationUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-green-800 hover:text-green-900 font-semibold break-all inline-flex items-center gap-1">
                      Apply on Official Website
                      <ExternalLink size={12} className="flex-shrink-0" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
