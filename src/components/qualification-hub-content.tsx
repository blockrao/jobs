"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { QualificationHub } from "@/lib/qualifications";
import type { QualificationPostRow } from "@/lib/queries";
import { readLocaleCookie, LOCALE_CHANGE_EVENT } from "@/i18n/locale-cookie";
import type { Locale } from "@/i18n/request";
import { pageHref } from "@/lib/pagination";
import { postHref, recruitmentHref } from "@/lib/recruitment-href";

function PostRow({ row, isHi }: { row: QualificationPostRow; isHi: boolean }) {
  const href = row.recruitmentSlug
    ? row.postSlug
      ? postHref({ recruitmentSlug: row.recruitmentSlug, slug: row.postSlug })
      : recruitmentHref({ slug: row.recruitmentSlug })
    : "#";

  const endDate = row.applicationEndDate ? new Date(row.applicationEndDate) : null;
  const now = new Date();
  const daysLeft = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / 86_400_000) : null;

  return (
    <li className="flex items-start justify-between gap-4 border-b border-black/8 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <Link
          href={href}
          className="font-medium text-neutral-900 hover:text-red-600 hover:underline line-clamp-2"
        >
          {row.postName ?? "Untitled post"}
        </Link>
        {row.orgName && (
          <p className="mt-0.5 text-sm text-neutral-500 truncate">{row.orgName}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
        {row.vacancyTotal != null && row.vacancyTotal > 0 && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
            {row.vacancyTotal.toLocaleString("en-IN")} posts
          </span>
        )}
        {daysLeft != null && daysLeft >= 0 && (
          <span
            className={`text-xs font-medium ${
              daysLeft <= 3
                ? "text-red-600"
                : daysLeft <= 7
                ? "text-orange-500"
                : "text-neutral-500"
            }`}
          >
            {daysLeft === 0
              ? (isHi ? "आज बंद" : "closes today")
              : daysLeft === 1
              ? (isHi ? "1 दिन बाकी" : "1 day left")
              : (isHi ? `${daysLeft} दिन बाकी` : `${daysLeft} days left`)}
          </span>
        )}
        {endDate && daysLeft != null && daysLeft < 0 && (
          <span className="text-xs text-neutral-400">
            {isHi ? "बंद हो गई" : "closed"}
          </span>
        )}
      </div>
    </li>
  );
}

export function QualificationHubContent({
  hub,
  rows,
  total,
  page,
  hasNext,
}: {
  hub: QualificationHub;
  rows: QualificationPostRow[];
  total: number;
  page: number;
  hasNext: boolean;
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

  const basePath = `/qualifications/${hub.slug}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm text-neutral-500">
        <Link href="/" className="hover:underline">
          {isHi ? "होम" : "Home"}
        </Link>
        {" / "}
        <Link href="/qualifications" className="hover:underline">
          {isHi ? "योग्यता अनुसार नौकरी" : "Jobs by Qualification"}
        </Link>
        {" / "}
        <span className="text-neutral-800">{hub.shortLabel}</span>
      </nav>

      {/* Heading */}
      <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
        {hub.label}
      </h1>
      <p className="mt-2 max-w-2xl text-neutral-600">{hub.description}</p>

      {total > 0 && (
        <p className="mt-1 text-sm text-neutral-500">
          {total.toLocaleString("en-IN")}{" "}
          {isHi ? "सक्रिय रिक्तियां" : `active ${total === 1 ? "vacancy" : "vacancies"}`}
        </p>
      )}

      {/* List */}
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white shadow-sm">
        {/* Header row */}
        <div className="flex items-center justify-between border-b border-black/8 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          <span>{isHi ? "पद" : "Post"}</span>
          <span>{isHi ? "रिक्तियां / बंद होने की तारीख" : "Vacancies / Closing date"}</span>
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-8 text-sm text-neutral-500">
            {isHi
              ? "इस समय इस श्रेणी में कोई सक्रिय भर्ती नहीं है।"
              : "No active recruitments in this category right now. Check back soon."}
          </p>
        ) : (
          <ul className="px-4">
            {rows.map((r) => (
              <PostRow key={r.postId} row={r} isHi={isHi} />
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {(page > 1 || hasNext) && (
        <nav
          aria-label="Pagination"
          className="mt-6 flex items-center justify-between text-sm"
        >
          {page > 1 ? (
            <Link
              href={pageHref(basePath, {}, page - 1)}
              className="font-semibold hover:underline"
            >
              {isHi ? "← पिछला" : "← Previous"}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-neutral-500">
            {isHi ? `पृष्ठ ${page}` : `Page ${page}`}
          </span>
          {hasNext ? (
            <Link
              href={pageHref(basePath, {}, page + 1)}
              className="font-semibold hover:underline"
            >
              {isHi ? "अगला →" : "Next →"}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      {/* Cross-link to qualification index */}
      <p className="mt-8 text-sm text-neutral-500">
        <Link href="/qualifications" className="text-red-600 hover:underline">
          ← {isHi ? "सभी योग्यताएं देखें" : "Browse all qualification categories"}
        </Link>
      </p>
    </div>
  );
}
