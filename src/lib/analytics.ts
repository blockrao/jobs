// Google Analytics 4 event tracking
// Tracks user navigation and engagement patterns across exam hierarchy

export type AnalyticsEvent =
  | 'view_commission_hub'
  | 'view_exam_page'
  | 'click_job_posting'
  | 'view_job_detail'
  | 'search_exam'
  | 'filter_by_commission'
  | 'filter_by_exam';

interface EventParams {
  [key: string]: string | number | boolean;
}

/**
 * Track analytics events with GA4
 * Events help understand:
 * - Which commissions/exams get traffic (for scraper prioritization)
 * - User navigation patterns (commission → exam → job)
 * - Engagement metrics (clicks, views, time spent)
 */
export function trackEvent(eventName: AnalyticsEvent, params?: EventParams) {
  if (typeof window === 'undefined') return;

  // Use gtag if available (GA4 script loaded)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }
}

/**
 * Track commission hub view
 * Used to identify which states/organizations candidates browse
 */
export function trackCommissionView(commissionSlug: string, commissionName: string) {
  trackEvent('view_commission_hub', {
    commission_slug: commissionSlug,
    commission_name: commissionName,
  });
}

/**
 * Track individual exam page view
 * Identifies high-traffic exams for scraper focus
 */
export function trackExamView(examSlug: string, examLabel: string, commissionSlug: string) {
  trackEvent('view_exam_page', {
    exam_slug: examSlug,
    exam_label: examLabel,
    commission_slug: commissionSlug,
  });
}

/**
 * Track job posting click/view
 * Shows which exams drive actual engagement (clicks through to job details)
 */
export function trackJobClick(jobSlug: string, jobTitle: string, examSlug: string) {
  trackEvent('click_job_posting', {
    job_slug: jobSlug,
    job_title: jobTitle,
    exam_slug: examSlug,
  });
}

/**
 * Track searches (if search functionality exists)
 * Identifies candidate search intent and popular keywords
 */
export function trackSearch(searchQuery: string, resultsCount: number) {
  trackEvent('search_exam', {
    search_query: searchQuery,
    results_count: resultsCount,
  });
}
