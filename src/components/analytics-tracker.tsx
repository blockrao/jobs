'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackCommissionView, trackExamView } from '@/lib/analytics';

/**
 * Client-side analytics tracker
 * Automatically tracks page views based on route patterns
 */
export function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Extract route information and track accordingly
    const parts = pathname.split('/').filter(Boolean);

    if (parts.length === 0) {
      // Home page - already tracked by GA4 page_view
      return;
    }

    if (parts[0] === 'commissions' && parts[1]) {
      // Commission hub page: /commissions/[slug]
      const commissionSlug = parts[1];
      // Decode URI component and format for display
      const commissionName = decodeURIComponent(commissionSlug)
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      trackCommissionView(commissionSlug, commissionName);
    } else if (parts[0] && parts.length === 1) {
      // Exam page: /[exam_slug]
      const examSlug = parts[0];
      // Note: Commission slug would need to be extracted from database
      // For now, we'll just track the exam slug
      const examName = decodeURIComponent(examSlug)
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      trackExamView(examSlug, examName, '');
    }
  }, [pathname]);

  return null; // This component doesn't render anything
}
