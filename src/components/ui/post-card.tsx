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
import { Users, Banknote, ChevronRight, FileText } from "lucide-react";

function formatSalary(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    n >= 100000
      ? `₹${(n / 100).toFixed(0).replace(/(\d)(?=(\d\d)+\d$)/g, "$1,")} p.m.`
      : `₹${n.toLocaleString("en-IN")} p.m.`;
  if (min && max && min !== max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max)!);
}

// ── Canonical post card (has its own page) ────────────────────────────────────

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
  index,
}: CanonicalPostCardProps) {
  const href = `/jobs/${recruitmentSlug}/${slug}`;
  const salary = formatSalary(salaryMin, salaryMax);
  const vac = vacancyTotal ?? vacancyDetails?.total ?? null;

  return (
    <Link
      href={href}
      className="group block rounded-xl border border-black/8 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md hover:bg-indigo-50/30 focus-visible:outline-2 focus-visible:outline-indigo-500"
      aria-label={`View details for ${name}`}
    >
      {/* Number badge + name */}
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 group-hover:bg-indigo-200">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-neutral-900 group-hover:text-indigo-900">
            {name}
          </p>
          {positionName && positionName !== name && (
            <p className="mt-0.5 text-xs text-neutral-400">{positionName}</p>
          )}
        </div>
        <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-300 group-hover:text-indigo-400 transition-colors" />
      </div>

      {/* Key facts row */}
      {(vac != null || salary) && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 pl-9">
          {vac != null && (
            <span className="flex items-center gap-1.5 text-xs text-neutral-600">
              <Users className="h-3.5 w-3.5 text-indigo-400" />
              <span>
                <span className="font-semibold text-neutral-800">{vac.toLocaleString("en-IN")}</span>
                {" "}vacancies
              </span>
            </span>
          )}
          {salary && (
            <span className="flex items-center gap-1.5 text-xs text-neutral-600">
              <Banknote className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium text-neutral-700">{salary}</span>
            </span>
          )}
        </div>
      )}

      {/* Category breakdown (compact, only when meaningful) */}
      {vacancyDetails && (vacancyDetails.ur || vacancyDetails.obc || vacancyDetails.sc || vacancyDetails.st) && (
        <div className="mt-2 pl-9 flex flex-wrap gap-x-3 gap-y-0.5">
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
    </Link>
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
