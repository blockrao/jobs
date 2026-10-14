'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HomeRecruitmentRow } from "@/lib/queries";
import { readLocaleCookie, LOCALE_CHANGE_EVENT } from "@/i18n/locale-cookie";
import type { Locale } from "@/i18n/request";
import { pageHref } from "@/lib/pagination";
import { RecruitmentRow, RowListHeader } from "@/components/recruitment-row";

export function ClosingSoonContent({
  rows,
  total,
  page,
  hasNext,
  windowDays,
}: {
  rows: HomeRecruitmentRow[];
  total: number;
  page: number;
  hasNext: boolean;
  windowDays: number;
}) {
  const [locale, setLocale] = useState<Locale>("en");
  useEffect(() => {
    setLocale(readLocaleCookie() ?? "en");
    function onLocaleChange(e: Event) {
      const detail = (e as CustomEvent<Locale>).detail;
      setLocale(detail ?? "en");
    }
    window.addEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
  }, []);
  const isHi = locale === "hi";
  const nf = (n: number) => n.toLocaleString(isHi ? "hi-IN" : "en-IN");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-neutral-500">
        <Link href="/" className="hover:underline">{isHi ? "होम" : "Home"}</Link>
        {" / "}
        <span className="text-neutral-800">{isHi ? "जल्द बंद" : "Closing soon"}</span>
      </nav>
      <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
        {isHi ? `अगले ${windowDays} दिनों में बंद होने वाली सरकारी भर्तियां` : `Government jobs closing in the next ${windowDays} days`}
      </h1>
      <p className="mt-2 max-w-2xl text-neutral-600">
        {isHi
          ? `${nf(total)} अधिसूचनाएं — रिक्तियों के अनुसार क्रम में, ताकि बड़ी भर्तियां पहले दिखें। तारीखें आधिकारिक अधिसूचना से।`
          : `${nf(total)} notifications, biggest first, so the drives with the most vacancies surface before the small ones. Dates come from the official notification; the badge counts down in IST.`}
      </p>

      <div className="mt-8">
        <RowListHeader isHi={isHi} firstCol={isHi ? "समय बाकी" : "Time left"} />
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500 border-t border-black/8 pt-4">{isHi ? "अभी कोई भर्ती बंद नहीं हो रही।" : "Nothing closes in this window right now."}</p>
        ) : (
          <ul>
            {rows.map((r) => <RecruitmentRow key={r.slug} row={r} isHi={isHi} badge="countdown" />)}
          </ul>
        )}
        <div className="border-t border-black/8" />
      </div>

      {(page > 1 || hasNext) && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={pageHref("/closing-soon", {}, page - 1)} className="font-semibold hover:underline">{isHi ? "← पिछला" : "← Previous"}</Link> : <span />}
          <span className="text-neutral-500">{isHi ? `पृष्ठ ${page}` : `Page ${page}`}</span>
          {hasNext ? <Link href={pageHref("/closing-soon", {}, page + 1)} className="font-semibold hover:underline">{isHi ? "अगला →" : "Next →"}</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
