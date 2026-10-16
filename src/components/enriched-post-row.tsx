'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { RolePost } from '@/db/operations/get-roles';

interface EnrichedPostRowProps {
  post: RolePost;
  isActive: boolean;
  href: string;
  statusLabel: string;
  daysRemaining: number | null;
  isUrgent: boolean;
  notificationUrl?: string;
}

/**
 * Extract fee range from fee note text
 * Example: "SC/ST: NIL; Others: ₹500" → "₹500" or "₹500–1000"
 */
function extractFeeAmount(feeNote: string | null | undefined): string | null {
  if (!feeNote) return null;
  const match = feeNote.match(/₹?\s*(\d+)/);
  if (match) return `₹${match[1]}`;
  return null;
}

/**
 * Extract age range from age note text
 * Example: "Age limit: 20-28 years" → "20-28 yrs"
 */
function extractAgeRange(ageNote: string | null | undefined): string | null {
  if (!ageNote) return null;
  const match = ageNote.match(/(\d+)-(\d+)\s*years?/);
  if (match) return `${match[1]}-${match[2]} yrs`;
  return null;
}

/**
 * EnrichedPostRow — responsive row displaying post with enrichment data
 *
 * Desktop (≥768px): Shows enrichment as inline badges
 * Mobile (<768px): Shows "Details" button that expands to reveal enrichment
 */
export function EnrichedPostRow({
  post,
  isActive,
  href,
  statusLabel,
  daysRemaining,
  isUrgent,
  notificationUrl,
}: EnrichedPostRowProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const feeAmount = extractFeeAmount(post.enrichmentFeeNote);
  const ageRange = extractAgeRange(post.enrichmentAgeNote);
  const hasEnrichment = feeAmount || ageRange || post.enrichmentSelectionProcess;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md hover:border-blue-300 transition-all">
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Post name — primary identity */}
            <Link
              href={href}
              className="font-semibold text-neutral-900 hover:text-blue-700 text-lg leading-snug block mb-1"
            >
              {post.postName}
            </Link>

            {/* Recruitment name — secondary context */}
            <div className="text-sm text-neutral-400 mb-3">
              {post.recruitmentName}
            </div>

            {/* Key facts */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-medium text-neutral-700">{post.organizationName}</span>

              {/* State — only when explicitly set on org */}
              {post.organizationState && (
                <>
                  <span className="text-neutral-300">·</span>
                  <span className="text-neutral-500">{post.organizationState}</span>
                </>
              )}

              {post.vacancyTotal && (
                <>
                  <span className="text-neutral-300">·</span>
                  <span className="text-neutral-600">
                    <span className="font-medium text-neutral-800">{post.vacancyTotal.toLocaleString('en-IN')}</span> vacancies
                  </span>
                </>
              )}
            </div>

            {/* Desktop enrichment badges (hidden on mobile) */}
            {hasEnrichment && (
              <div className="hidden md:flex flex-wrap gap-2 mt-3">
                {feeAmount && (
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-medium border border-amber-200"
                    title={post.enrichmentFeeNote || undefined}
                  >
                    Fee: {feeAmount}
                  </span>
                )}
                {ageRange && (
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 text-xs font-medium border border-blue-200"
                    title={post.enrichmentAgeNote || undefined}
                  >
                    Age: {ageRange}
                  </span>
                )}
                {post.enrichmentSelectionProcess && (
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-50 text-purple-900 text-xs font-medium border border-purple-200 truncate"
                    title={post.enrichmentSelectionProcess}
                  >
                    {post.enrichmentSelectionProcess.split('→')[0].trim()}
                  </span>
                )}
              </div>
            )}

            {/* Pay */}
            {(post.salaryMin || post.salaryMax) && (
              <div className="text-sm text-neutral-500 mt-1.5">
                Pay:{' '}
                <span className="text-neutral-700">
                  {post.salaryMin && `₹${post.salaryMin.toLocaleString('en-IN')}`}
                  {post.salaryMin && post.salaryMax && '–'}
                  {post.salaryMax && `₹${post.salaryMax.toLocaleString('en-IN')}`}
                  /month
                </span>
              </div>
            )}

            {/* Application status — text, not just colour */}
            {statusLabel && (
              <div className={`text-xs mt-2 font-medium ${isUrgent ? 'text-red-600' : 'text-emerald-600'}`}>
                {statusLabel}
              </div>
            )}

            {/* Mobile enrichment expansion button (shown only on mobile) */}
            {hasEnrichment && (
              <button
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="md:hidden mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
                aria-expanded={detailsOpen}
              >
                {detailsOpen ? 'Hide details' : 'Show details'}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  className={`transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                >
                  <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            {/* Mobile enrichment details (expanded) */}
            {hasEnrichment && detailsOpen && (
              <div className="md:hidden mt-3 pt-3 border-t border-neutral-100 space-y-3">
                {post.enrichmentFeeNote && (
                  <div>
                    <div className="text-xs font-medium text-neutral-600 mb-1.5">Fee</div>
                    <p className="text-sm text-neutral-700 leading-relaxed">{post.enrichmentFeeNote}</p>
                  </div>
                )}
                {post.enrichmentAgeNote && (
                  <div>
                    <div className="text-xs font-medium text-neutral-600 mb-1.5">Age Limit</div>
                    <p className="text-sm text-neutral-700 leading-relaxed">{post.enrichmentAgeNote}</p>
                  </div>
                )}
                {post.enrichmentSelectionProcess && (
                  <div>
                    <div className="text-xs font-medium text-neutral-600 mb-1.5">Selection Process</div>
                    <p className="text-sm text-neutral-700 leading-relaxed">{post.enrichmentSelectionProcess}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              View Post
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            {(notificationUrl || post.enrichmentApplyUrl) && (
              <a
                href={notificationUrl || post.enrichmentApplyUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                aria-label={`${notificationUrl ? 'Official notification' : 'Application'} for ${post.recruitmentName}`}
              >
                {notificationUrl ? 'Official notice' : 'Apply'} ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
