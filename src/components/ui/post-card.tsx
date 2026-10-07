/**
 * PostCard — a single post entry in a recruitment notice hub page.
 *
 * Renders as a distinct visual card for each advertised post in a notice.
 * Works in two modes:
 *   - Canonical: post has its own DB row + slug → card is fully clickable,
 *     links to /jobs/[recruitment-slug]/[post-slug].
 *   - Legacy: post name comes from postNames string[] on the posting →
 *     card is informational only (no dedicated page exists yet).
 *
 * The card is always a complete visual unit regardless of mode, so the
 * hub page never collapses posts into a plain list.
 */

import Link from "next/link";
import { Users, Banknote, ChevronRight, FileText, CalendarDays, Briefcase, ArrowUpRight } from "lucide-react";

function formatSalary(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")} p.m.`;
  if (min && max && min !== max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max)!);
}

// ── Canonical post card (has its own page) ────────────────────────────────────

function formatEmploymentType(type?: string | null): string | null {
  if (!type) return null;
  const map: Record<string, string> = {
    FULL_TIME: "Full-time",
    PART_TIME: "Part-time",
    TEMPORARY: "Contract / Fixed-term",
    PERMANENT: "Permanent",
    CONTRACTOR: "Consultancy",
    DEPUTATION: "Deputation",
    APPRENTICESHIP: "Apprenticeship",
    INTERNSHIP: "Internship",
    FELLOWSHIP: "Fellowship",
    INTERN: "Intern",
    OTHER: "Other",
  };
  return map[type] ?? type;
}

interface CanonicalPostCardProps {
  name: string;
  slug: string;
  recruitmentSlug: string;
  vacancyTotal?: number | null;
  vacancyDetails?: {
    ur?: number; ews?: number; obc?: number; sc?: number; st?: number; total?: number;
  } | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  positionName?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  qualificationText?: string | null;
  educationCategory?: string | null;
  applyUrl?: string | null;
  employmentType?: string | null;
  index: number;
}

export function CanonicalPostCard({
  name,
  slug,
  recruitmentSlug,
  vacancyTotal,
  vacancyDetails,
  salaryMin,
  salaryMax,
  positionName,
  ageMin,
  ageMax,
  qualificationText,
  educationCategory,
  applyUrl,
  employmentType,
  index,
}: CanonicalPostCardProps) {
  const href = `/jobs/${recruitmentSlug}/${slug}`;
  const salary = formatSalary(salaryMin, salaryMax);
  const vac = vacancyTotal ?? vacancyDetails?.total ?? null;
  const ageLabel = ageMin && ageMax
    ? `${ageMin}–${ageMax} years`
    : ageMax
    ? `Up to ${ageMax} years`
    : ageMin
    ? `${ageMin}+ years`
    : null;
  const empType = formatEmploymentType(employmentType);

  // Count how many facts we have for layout decisions
  const facts = [salary, vac != null ? "vac" : null, ageLabel, empType].filter(Boolean);

  return (
    <div className="rounded-xl border border-black/8 bg-white shadow-sm overflow-hidden">
      {/* Header row: number + name + arrow link */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-3">
        <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-neutral-900">{name}</p>
          {positionName && positionName !== name && (
            <p className="mt-0.5 text-xs text-neutral-400">{positionName}</p>
          )}
          {qualificationText && (
            <p className="mt-1 text-xs text-neutral-500 leading-snug" title={qualificationText}>
              <span className="font-medium text-neutral-600">Qualification: </span>
              {qualificationText.length > 120 ? qualificationText.slice(0, 117) + "…" : qualificationText}
            </p>
          )}
        </div>
        <Link
          href={href}
          className="ml-2 flex-shrink-0 text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5 whitespace-nowrap"
          aria-label={`Full details for ${name}`}
        >
          Details
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Facts grid */}
      {facts.length > 0 && (
        <div className="grid grid-cols-2 gap-px bg-black/5 border-t border-black/5 mx-5 rounded-lg overflow-hidden mb-4">
          {salary && (
            <div className="bg-white px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-neutral-400 font-medium mb-0.5">Pay</p>
              <p className="text-sm font-semibold text-emerald-700 leading-tight">{salary}</p>
            </div>
          )}
          {vac != null && (
            <div className="bg-white px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-neutral-400 font-medium mb-0.5">Vacancies</p>
              <p className="text-sm font-semibold text-neutral-800 leading-tight">{vac.toLocaleString("en-IN")}</p>
            </div>
          )}
          {ageLabel && (
            <div className="bg-white px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-neutral-400 font-medium mb-0.5">Age limit</p>
              <p className="text-sm font-semibold text-neutral-800 leading-tight">{ageLabel}</p>
            </div>
          )}
          {empType && (
            <div className="bg-white px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-neutral-400 font-medium mb-0.5">Type</p>
              <p className="text-sm font-semibold text-neutral-800 leading-tight">{empType}</p>
            </div>
          )}
        </div>
      )}

      {/* Category breakdown */}
      {vacancyDetails && (vacancyDetails.ur || vacancyDetails.obc || vacancyDetails.sc || vacancyDetails.st) && (
        <div className="px-5 pb-3 flex flex-wrap gap-x-3 gap-y-0.5">
          {vacancyDetails.ur != null && vacancyDetails.ur > 0 && (
            <span className="text-[11px] text-neutral-400">UR {vacancyDetails.ur}</span>
          )}
          {vacancyDetails.ews != null && vacancyDetails.ews > 0 && (
            <span className="text-[11px] text-neutral-400">EWS {vacancyDetails.ews}</span>
          )}
          {vacancyDetails.obc != null && vacancyDetails.obc > 0 && (
            <span className="text-[11px] text-neutral-400">OBC {vacancyDetails.obc}</span>
          )}
          {vacancyDetails.sc != null && vacancyDetails.sc > 0 && (
            <span className="text-[11px] text-neutral-400">SC {vacancyDetails.sc}</span>
          )}
          {vacancyDetails.st != null && vacancyDetails.st > 0 && (
            <span className="text-[11px] text-neutral-400">ST {vacancyDetails.st}</span>
          )}
        </div>
      )}

      {/* CTA footer */}
      <div className="flex items-center gap-3 px-5 pb-5 pt-1">
        {applyUrl && (
          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Apply Now
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          View full details
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ── Legacy post card (postName string only; no dedicated page) ────────────────

interface LegacyPostCardProps {
  name: string;
  index: number;
}

export function LegacyPostCard({ name, index }: LegacyPostCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-black/8 bg-white p-5 shadow-sm">
      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-neutral-900">{name}</p>
        <p className="mt-1 text-xs text-neutral-400 flex items-center gap-1">
          <FileText className="h-3 w-3" />
          Detailed page coming soon — see the official notification
        </p>
      </div>
    </div>
  );
}
