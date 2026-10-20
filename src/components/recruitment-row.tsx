'use client';

import Link from "next/link";
import type { HomeRecruitmentRow } from "@/lib/queries";
import { recruitmentHref } from "@/lib/recruitment-href";
import { formatDate } from "@/lib/labels";
import { SECTORS } from "@/lib/sectors";

// The one row used everywhere on the homepage and /closing-soon:
// org · vacancies · last date with countdown — the three fields the design
// strategy (2026-10-14) commits to showing on every entry.

const SECTOR_LABEL: Record<string, { en: string; hi: string }> = Object.fromEntries(
  SECTORS.flatMap((s) => s.sectors.map((k) => [k, { en: s.label, hi: s.labelHi }])),
);

export function sectorSlugFor(sector: string): string | null {
  const def = SECTORS.find((s) => (s.sectors as readonly string[]).includes(sector));
  return def?.slug ?? null;
}

export function deadlineLabel(row: HomeRecruitmentRow, isHi: boolean): { text: string; tone: "red" | "amber" | "grey" | "none" } {
  const d = row.daysLeft;
  if (d == null) return { text: isHi ? "अंतिम तिथि घोषित नहीं" : "No last date yet", tone: "none" };
  if (d <= 0) return { text: isHi ? "आज बंद" : "Closes today", tone: "red" };
  if (d === 1) return { text: isHi ? "कल बंद" : "Closes tomorrow", tone: "red" };
  if (d <= 3) return { text: isHi ? `${d} दिन बाकी` : `${d} days left`, tone: "red" };
  if (d <= 14) return { text: isHi ? `${d} दिन बाकी` : `${d} days left`, tone: "amber" };
  return { text: isHi ? `${d} दिन बाकी` : `${d} days left`, tone: "grey" };
}

const TONE: Record<string, string> = {
  red: "bg-red-50 text-red-800",
  amber: "bg-amber-50 text-amber-800",
  grey: "bg-neutral-100 text-neutral-700",
  none: "bg-neutral-100 text-neutral-500",
};

export function RecruitmentRow({
  row,
  isHi,
  badge = "countdown",
}: {
  row: HomeRecruitmentRow;
  isHi: boolean;
  /** "countdown": days-left badge (closing lists). "vacancies": big number on the right (biggest lists). "open": neutral Open badge. */
  badge?: "countdown" | "vacancies" | "open";
}) {
  const dateLocale = isHi ? "hi-IN" : "en-IN";
  const dl = deadlineLabel(row, isHi);
  const orgName = isHi && row.orgNameHi ? row.orgNameHi : row.orgName;
  const sectorLabel = SECTOR_LABEL[row.sector];
  const sectorSlug = sectorSlugFor(row.sector);
  const vac = row.totalVacancies != null ? row.totalVacancies.toLocaleString(dateLocale) : "—";
  const lastDate = row.applicationEndDate ? formatDate(row.applicationEndDate, dateLocale) : "—";

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[96px_minmax(0,1fr)_110px_150px] items-center gap-x-4 gap-y-1 py-3.5 border-t border-black/8 hover:bg-neutral-50 -mx-2 px-2 rounded-md">
      {badge !== "vacancies" && (
        <span className={`order-3 sm:order-none justify-self-start inline-flex h-7 items-center rounded-md px-2.5 text-[13px] font-bold whitespace-nowrap ${badge === "open" ? TONE.grey : TONE[dl.tone]}`}>
          {badge === "open" ? (isHi ? "खुला" : "Open") : dl.text}
        </span>
      )}
      <div className="min-w-0 col-span-2 sm:col-span-1">
        <Link href={recruitmentHref(row)} className="block font-semibold text-[17px] leading-snug text-neutral-900 hover:text-brand-700">
          {row.name}
        </Link>
        <p className="mt-0.5 text-sm text-neutral-600 truncate">
          <Link href={`/exams/${row.orgSlug}`} className="hover:underline">{orgName}</Link>
          {row.postCount > 1 && <> · {row.postCount} {isHi ? "पद प्रकार" : "posts"}</>}
          {sectorLabel && sectorSlug && (
            <> · <Link href={`/categories/${sectorSlug}`} className="hover:underline">{isHi ? sectorLabel.hi : sectorLabel.en}</Link></>
          )}
        </p>
      </div>
      {badge === "vacancies" ? (
        <>
          <span className="order-3 sm:order-none text-sm sm:text-lg font-bold tabular-nums sm:text-right">
            {vac} <span className="sm:hidden font-normal text-neutral-600">{isHi ? "पद" : "vacancies"}</span>
          </span>
          <span className={`order-4 sm:order-none text-sm tabular-nums sm:text-right ${dl.tone === "red" || dl.tone === "amber" ? "font-semibold text-amber-800" : "text-neutral-600"}`}>
            {row.applicationEndDate ? `${lastDate} · ${dl.text}` : dl.text}
          </span>
        </>
      ) : (
        <>
          <span className="order-4 sm:order-none text-sm font-semibold tabular-nums sm:text-right text-neutral-800">
            {vac} <span className="sm:hidden font-normal text-neutral-600">{isHi ? "पद" : "vacancies"}</span>
          </span>
          <span className="hidden sm:block text-sm tabular-nums text-right text-neutral-600">{lastDate}</span>
        </>
      )}
    </li>
  );
}

export function RowListHeader({ isHi, firstCol }: { isHi: boolean; firstCol: string }) {
  return (
    <div className="hidden sm:grid grid-cols-[96px_minmax(0,1fr)_110px_150px] gap-x-4 pb-2 text-[12px] font-bold uppercase tracking-wider text-neutral-500">
      <span>{firstCol}</span>
      <span>{isHi ? "भर्ती" : "Recruitment"}</span>
      <span className="text-right">{isHi ? "रिक्तियां" : "Vacancies"}</span>
      <span className="text-right">{isHi ? "अंतिम तिथि" : "Last date"}</span>
    </div>
  );
}
