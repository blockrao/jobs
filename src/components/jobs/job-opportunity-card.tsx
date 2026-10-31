import Link from "next/link";

export type JobOpportunityCardProps = {
  postName: string;
  organizationName: string;
  organizationHref: string;
  recruitmentName: string;
  recruitmentHref: string;
  detailHref: string;
  statusLabel: string;
  urgent: boolean;
  vacancyTotal?: number | null;
  deadlineLabel: string;
  daysLeft?: number | null;
};

function organizationInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Canonical JobOye opportunity card.
 *
 * This is the shared presentation contract for discovery hubs and search
 * listings. Callers must pass only facts already selected and validated by
 * their canonical data query; the component does not infer eligibility,
 * source verification, vacancy counts or lifecycle.
 */
export function JobOpportunityCard({
  postName,
  organizationName,
  organizationHref,
  recruitmentName,
  recruitmentHref: recruitmentUrl,
  detailHref,
  statusLabel,
  urgent,
  vacancyTotal,
  deadlineLabel,
  daysLeft,
}: JobOpportunityCardProps) {
  const initials = organizationInitials(organizationName);

  return (
    <article className="group overflow-hidden rounded-[1.35rem] border border-slate-200/90 bg-white p-3.5 shadow-sm shadow-slate-900/[0.025] transition duration-200 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-900/[0.06] sm:rounded-2xl sm:p-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 sm:gap-4">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-sm font-bold tracking-wide text-indigo-700 sm:h-12 sm:w-12"
          >
            {initials || "JO"}
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <span className={urgent
              ? "inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700"
              : "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"
            }>
              {statusLabel}
            </span>
            {vacancyTotal != null && vacancyTotal > 0 && (
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {vacancyTotal.toLocaleString("en-IN")} vacancies
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 min-w-0 sm:mt-2">
          <h3 className="text-lg font-bold leading-6 tracking-tight text-slate-950">
            <Link
              href={detailHref}
              className="rounded-sm decoration-2 underline-offset-4 transition group-hover:text-indigo-700 group-hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {postName}
            </Link>
          </h3>

          <div className="mt-1.5 space-y-1 text-[15px] leading-5 text-slate-600 sm:flex sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1 sm:space-y-0 sm:text-sm">
            <Link href={organizationHref} className="block font-semibold text-slate-700 hover:text-indigo-700 hover:underline sm:inline">
              {organizationName}
            </Link>
            <span aria-hidden="true" className="hidden text-slate-300 sm:inline">·</span>
            <Link href={recruitmentUrl} className="block min-w-0 hover:text-indigo-700 hover:underline sm:inline">
              {recruitmentName}
            </Link>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-slate-600 sm:text-sm">
              <span aria-hidden="true" className="text-slate-400">◷</span>
              <span className="font-medium text-slate-500">Deadline</span>
              <span className={urgent ? "font-bold text-rose-700" : "font-semibold text-slate-800"}>{deadlineLabel}</span>
            </span>
            {urgent && daysLeft != null && (
              <span className="shrink-0 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700">
                {daysLeft === 0 ? "Last day" : `${daysLeft} days left`}
              </span>
            )}
          </div>

          <div className="mt-3">
            <Link
              href={detailHref}
              className="flex min-h-11 w-full items-center justify-center gap-1 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 hover:text-indigo-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:w-auto sm:justify-start sm:bg-transparent sm:px-2 sm:py-1 sm:hover:bg-indigo-50"
            >
              View job details <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
