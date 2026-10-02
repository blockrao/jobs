'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import type { getCommissionBySlug, getPostingsByCommission } from "@/lib/queries";
import { readLocaleCookie, LOCALE_CHANGE_EVENT } from "@/i18n/locale-cookie";
import type { Locale } from "@/i18n/request";

type Commission = NonNullable<Awaited<ReturnType<typeof getCommissionBySlug>>>;
type Postings = Awaited<ReturnType<typeof getPostingsByCommission>>;

// Same pattern as home-content.tsx: the page
// (src/app/commissions/[commission_slug]/page.tsx) stays a plain
// static/SSG server component that only fetches data — every row already
// includes nameHi/labelHi/descriptionHi regardless of locale — and this
// client component decides how to render it based on the visitor's saved
// language cookie, instead of the page reading cookies() server-side
// (which would force it off static generation).
export function CommissionContent({
  commission,
  allPostings,
}: {
  commission: Commission;
  allPostings: Postings;
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

  const commissionNameHi = (commission as any).nameHi as string | null;
  const commissionDescriptionHi = (commission as any).descriptionHi as
    | string
    | null;
  const displayCommissionName =
    isHi && commissionNameHi ? commissionNameHi : commission.name;
  const displayCommissionDescription =
    isHi && commissionDescriptionHi
      ? commissionDescriptionHi
      : commission.description;

  const L = {
    backToExams: isHi ? "← सभी परीक्षाओं पर वापस जाएं" : "← Back to all exams",
    exams: isHi ? "परीक्षाएं" : "Exams",
    position: isHi ? "पद" : "position",
    positions: isHi ? "पद" : "positions",
    open: isHi ? "खुले हैं" : "open",
    salary: isHi ? "वेतन" : "Salary",
    eligibility: isHi ? "पात्रता" : "Eligibility",
    allOpenPositions: isHi ? "सभी खुली पोस्टिंग" : "All Open Positions",
    noPositions: isHi
      ? "अभी कोई खुली पोस्टिंग नहीं — जल्द ही फिर देखें।"
      : "No open positions at the moment. Check back soon!",
  };

  const postingsByExam = new Map<number, number>();
  allPostings.forEach((posting) => {
    if (posting.exam) {
      postingsByExam.set(
        posting.exam.id,
        (postingsByExam.get(posting.exam.id) || 0) + 1,
      );
    }
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <Link href="/exams" className="text-sm text-neutral-600 hover:underline">
          {L.backToExams}
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            aria-hidden="true"
            className="w-6 h-6 rounded-full"
            style={{ backgroundColor: commission.color || "#000000" }}
          />
          <h1 className="text-3xl font-bold tracking-tight">
            {displayCommissionName}
          </h1>
        </div>
        {displayCommissionDescription && (
          <p className="text-neutral-600">{displayCommissionDescription}</p>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">
          {L.exams} ({commission.exams.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {commission.exams.map((exam) => {
            const openCount = postingsByExam.get(exam.id) || 0;
            const labelHi = (exam as any).labelHi as string | null;
            const eligibilityHi = (exam as any).eligibilityHi as
              | string
              | null;
            const displayLabel = isHi && labelHi ? labelHi : exam.label;
            const displayEligibility =
              isHi && eligibilityHi ? eligibilityHi : exam.eligibility;
            return (
              <Link key={exam.id} href={`/exams/${exam.slug}`}>
                <div className="p-4 border border-black/10 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                  <h3 className="font-semibold text-base mb-2">
                    {displayLabel}
                  </h3>
                  <div className="text-sm text-neutral-600 space-y-1">
                    {openCount > 0 && (
                      <p>
                        <span className="font-medium text-green-600">
                          {openCount}{" "}
                          {openCount !== 1 ? L.positions : L.position}
                        </span>{" "}
                        {L.open}
                      </p>
                    )}
                    {exam.salaryMin && (
                      <p>
                        {L.salary}: ₹{exam.salaryMin.toLocaleString("en-IN")} - ₹
                        {exam.salaryMax?.toLocaleString("en-IN")}
                      </p>
                    )}
                    {displayEligibility && (
                      <p className="text-xs">
                        {L.eligibility}: {displayEligibility}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">
          {L.allOpenPositions} ({allPostings.length})
        </h2>
        {allPostings.length === 0 ? (
          <div className="rounded-lg bg-neutral-50 border border-black/10 p-8 text-center">
            <p className="text-neutral-600">{L.noPositions}</p>
          </div>
        ) : (
          <ul className="divide-y divide-black/10">
            {allPostings.map((posting) => {
              const titleHi = (posting as any).titleHi as string | null;
              const orgNameHi = (posting.organization as any).nameHi as
                | string
                | null;
              const examLabelHi = (posting.exam as any)?.labelHi as
                | string
                | null
                | undefined;
              const displayTitle = isHi && titleHi ? titleHi : posting.title;
              const displayOrgName =
                isHi && orgNameHi ? orgNameHi : posting.organization.name;
              const displayExamLabel =
                isHi && examLabelHi ? examLabelHi : posting.exam?.label;
              const detailHref =
                isHi && titleHi
                  ? `/hi/jobs/${posting.slug}`
                  : `/jobs/${posting.slug}`;
              return (
                <li key={posting.id} className="py-4">
                  <Link
                    href={detailHref}
                    className="text-base font-semibold hover:underline block"
                  >
                    {displayTitle}
                  </Link>
                  <p className="text-sm text-neutral-600 mt-1">
                    {displayOrgName}
                    {posting.locationCity ? ` · ${posting.locationCity}` : ""} ·{" "}
                    <span className="text-xs bg-neutral-100 px-2 py-1 rounded">
                      {displayExamLabel}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
