'use client';

import Link from 'next/link';
import { trackJobClick } from '@/lib/analytics';

interface JobPostingLinkProps {
  href: string;
  slug: string;
  title: string;
  examSlug: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper around Link that tracks job posting clicks for analytics
 * Helps identify which job postings drive engagement
 */
export function JobPostingLink({
  href,
  slug,
  title,
  examSlug,
  children,
  className,
}: JobPostingLinkProps) {
  const handleClick = () => {
    trackJobClick(slug, title, examSlug);
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
