'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HomeRecruitmentRow, HomeOrgRow, HomeStats } from "@/lib/queries";
import { readLocaleCookie, LOCALE_CHANGE_EVENT } from "@/i18n/locale-cookie";
import type { Locale } from "@/i18n/request";
import { FEATURED_SECTORS, FEATURED_ORG_TILES, sectorHref } from "@/lib/sectors";
import { RecruitmentRow, RowListHeader } from "@/components/recruitment-row";
import { recruitmentHref } from "@/lib/recruitment-href";
import { SITE_URL } from "@/lib/site";

// Homepage = the deadline desk (HOMEPAGE_DESIGN_STRATEGY_2026_10_14).
// Every block ranks by vacancies × urgency; every row shows org · vacancies ·
// last date. The page (src/app/(default)/page.tsx) stays a static/ISR server
// component; this client component only picks the language from the cookie.

export const HOME_FAQ = [
  {
    q: "How do I find government jobs closing soon?",
    a: "The 'Closing in the next two weeks' list on this page and the Closing Soon page rank every open notification by vacancies and last date, with a live countdown. Dates come from the official notification.",
  },
  {
    q: "What is the difference between a recruitment notification and a post?",
    a: "A recruitment notification covers an entire drive (for example, BPSC TRE-4.0). Each role within that drive — Primary Teacher, Middle School Teacher — is a separate post with its own vacancy count and eligibility criteria.",
  },
  {
    q: "Can I apply for government jobs directly from JobOye?",
    a: "No, and that is deliberate. Each post page links directly to the official application portal on the recruiting body's website. JobOye never charges a fee and is not an intermediary.",
  },
  {
    q: "How often is job data updated on JobOye?",
    a: "New notifications are added daily and pages refresh automatically. Vacancy counts and deadlines reflect the official notification; if you spot an error, contact us.",
  },
  {
    q: "Is JobOye free to use?",
    a: "Yes, completely free. There is no registration, subscription, or fee of any kind.",
  },
];

const CATEGORY_GRID: { label: string; labelHi: string; href: string; emoji: string }[] = [
  ...FEATURED_SECTORS.map((s) => ({ label: s.label, labelHi: s.labelHi, href: sectorHref(s), emoji: s.emoji })),
  ...FEATURED_ORG_TILES,
];

export function HomeContent({
  stats,
  closingSoon,
  closingMonthCount,
  biggest,
  open,
  orgs,
  sectorCounts,
}: {
  stats: HomeStats;
  closingSoon: HomeRecruitmentRow[];
  closingMonthCount: number;
  biggest: HomeRecruitmentRow[];
  open: HomeRecruitmentRow[];
  orgs: HomeOrgRow[];
  sectorCounts: Record<string, number>;
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

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQ.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  // ItemList of the closing-soon block: lets search engines and answer engines
  // read the ranked list and its canonical URLs directly.
  const closingListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Government jobs closing in the next two weeks",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: closingSoon.length,
    itemListElement: closingSoon.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: r.name,
      url: `${SITE_URL}${recruitmentHref(r)}`,
    })),
  };

  const sectionTitle = "font-semibold text-2xl tracking-tight text-neutral-900";
  const viewAll = "text-sm font-semibold text-brand-600 hover:underline";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {closingSoon.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(closingListJsonLd) }} />
      )}

      <div className="mx-auto max-w-6xl px-4">

        {/* ── Hero: compact, functional ──────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 lg:gap-12 items-end pt-8 pb-8 sm:pt-11 sm:pb-9">
          <div className="flex flex-col gap-4">
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-brand-600">
              {isHi ? "भारत की सरकारी नौकरियां" : "Government jobs in India"}
            </p>
            <h1 className="text-[28px] sm:text-[40px] lg:text-[44px] font-bold leading-[1.12] tracking-tight text-neutral-900">
              {isHi
                ? "हर खुली सरकारी रिक्ति — अंतिम तिथि और आधिकारिक आवेदन लिंक के साथ।"
                : "Every open sarkari vacancy, with the last date and the official apply link."}
            </h1>
            <p className="text-base sm:text-lg text-neutral-600 max-w-xl">
              {isHi
                ? "अधिसूचना से सीधे तथ्य — रिक्तियां, पात्रता, शुल्क, तारीखें। कोई एजेंट नहीं, कोई शुल्क नहीं।"
                : "Facts straight from the notification — vacancies, eligibility, fee, dates. No agents, no middlemen, never a charge."}
            </p>
            <form action="/search" method="get" className="flex gap-2 max-w-xl mt-1">
              <label htmlFor="home-q" className="sr-only">{isHi ? "नौकरी खोजें" : "Search jobs"}</label>
              <input
                id="home-q"
                type="search"
                name="q"
                placeholder={isHi ? "पद, परीक्षा या विभाग खोजें" : "Search a post, exam or department — e.g. “junior engineer”, “BPSC”"}
                className="min-w-0 flex-1 h-12 rounded-lg border border-black/20 px-4 text-base focus:outline-none focus:ring-2 focus:ring-brand-600/30"
              />
              <button type="submit" className="h-12 shrink-0 rounded-lg bg-brand-600 px-5 text-base font-bold text-white hover:bg-brand-700">
                {isHi ? "खोजें" : "Search"}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/closing-soon" className="flex flex-col gap-1 rounded-xl border border-red-200 bg-red-50 px-4 py-4 hover:border-red-300">
              <span className="font-bold text-[28px] sm:text-[34px] leading-none tabular-nums text-red-800">{stats.closing7dPosts > 0 ? nf(stats.closing7dPosts) : "—"}</span>
              <span className="text-[13px] sm:text-sm font-semibold text-red-900">{isHi ? "पद 7 दिन में बंद" : "posts close within 7 days"}</span>
            </Link>
            <Link href="/jobs" className="flex flex-col gap-1 rounded-xl border border-black/8 bg-neutral-50 px-4 py-4 hover:border-black/20">
              <span className="font-bold text-[28px] sm:text-[34px] leading-none tabular-nums text-neutral-900">{stats.totalVacancies > 0 ? nf(stats.totalVacancies) : "—"}</span>
              <span className="text-[13px] sm:text-sm font-semibold text-neutral-600">{isHi ? "रिक्तियां खुली" : "vacancies open now"}</span>
            </Link>
            <Link href="/jobs" className="flex flex-col gap-1 rounded-xl border border-black/8 bg-neutral-50 px-4 py-4 hover:border-black/20">
              <span className="font-bold text-[28px] sm:text-[34px] leading-none tabular-nums text-neutral-900">{stats.liveRecruitments > 0 ? nf(stats.liveRecruitments) : "—"}</span>
              <span className="text-[13px] sm:text-sm font-semibold text-neutral-600">{isHi ? "सक्रिय अधिसूचनाएं" : "live notifications"}</span>
            </Link>
            <Link href="/categories" className="flex flex-col gap-1 rounded-xl border border-black/8 bg-neutral-50 px-4 py-4 hover:border-black/20">
              <span className="font-bold text-[28px] sm:text-[34px] leading-none tabular-nums text-neutral-900">{FEATURED_SECTORS.length}</span>
              <span className="text-[13px] sm:text-sm font-semibold text-neutral-600">{isHi ? "श्रेणियां · UPSC व SSC" : "sectors · UPSC & SSC hubs"}</span>
            </Link>
          </div>
        </section>

        {/* ── Closing in the next two weeks ─────────────────────── */}
        {closingSoon.length > 0 && (
          <section id="closing" className="pt-2 pb-10">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
              <h2 className={sectionTitle}>{isHi ? "अगले दो सप्ताह में बंद" : "Closing in the next two weeks"}</h2>
              <Link href="/closing-soon" className={viewAll}>
                {isHi ? `इस महीने बंद होने वाली सभी ${nf(closingMonthCount)} →` : `All ${nf(closingMonthCount)} closing this month →`}
              </Link>
            </div>
            <RowListHeader isHi={isHi} firstCol={isHi ? "समय बाकी" : "Time left"} />
            <ul>
              {closingSoon.map((r) => <RecruitmentRow key={r.slug} row={r} isHi={isHi} badge="countdown" />)}
            </ul>
            <p className="mt-3 pt-3 border-t border-black/8 text-sm text-neutral-500">
              {isHi
                ? "14 दिनों में बंद होने वाली अधिसूचनाओं में रिक्तियों के अनुसार क्रम, ताकि बड़ी भर्तियां पहले दिखें। तारीखें आधिकारिक अधिसूचना से।"
                : "Ranked by vacancies among notifications closing within 14 days, so the biggest drives surface first. Dates come from the official notification; the badge counts down in IST."}
            </p>
          </section>
        )}

        {/* ── Biggest + categories ──────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-10 lg:gap-12 pt-2 pb-10">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
              <h2 className={sectionTitle}>{isHi ? "अभी खुली सबसे बड़ी भर्तियां" : "Biggest recruitments open now"}</h2>
              <Link href="/jobs" className={viewAll}>{isHi ? "सभी देखें →" : "All notifications →"}</Link>
            </div>
            <ul>
              {biggest.map((r) => <RecruitmentRow key={r.slug} row={r} isHi={isHi} badge="vacancies" />)}
            </ul>
            <div className="border-t border-black/8" />
          </div>

          <aside id="sectors" className="flex flex-col gap-2.5">
            <h2 className="text-xl font-semibold text-neutral-900 mb-1">{isHi ? "श्रेणी अनुसार देखें" : "Browse by category"}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
              {CATEGORY_GRID.map((cat) => {
                const def = FEATURED_SECTORS.find((s) => sectorHref(s) === cat.href);
                const count = def ? def.sectors.reduce((n, k) => n + (sectorCounts[k] ?? 0), 0) : null;
                return (
                  <Link
                    key={cat.href}
                    href={cat.href}
                    className="flex items-center justify-between gap-2 rounded-xl border border-black/12 bg-white px-4 py-3.5 font-semibold text-[15px] hover:border-brand-600/50 hover:bg-brand-50"
                  >
                    <span className="truncate"><span className="mr-2" aria-hidden>{cat.emoji}</span>{isHi ? cat.labelHi : cat.label}</span>
                    {count != null && count > 0 && <span className="tabular-nums text-sm font-semibold text-neutral-500">{nf(count)}</span>}
                  </Link>
                );
              })}
            </div>
          </aside>
        </section>

        {/* ── Open notifications ────────────────────────────────── */}
        {open.length > 0 && (
          <section className="pt-2 pb-10">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3">
              <h2 className={sectionTitle}>{isHi ? "खुली अधिसूचनाएं" : "Open notifications"}</h2>
              <div className="flex gap-2 overflow-x-auto max-w-full pb-1">
                <span className="inline-flex h-8 items-center rounded-full bg-neutral-900 px-3 text-sm font-semibold text-white whitespace-nowrap">{isHi ? "सभी" : "All"}</span>
                {FEATURED_SECTORS.map((s) => (
                  <Link key={s.slug} href={sectorHref(s)} className="inline-flex h-8 items-center rounded-full border border-black/12 px-3 text-sm font-semibold whitespace-nowrap hover:border-brand-600/50">
                    {isHi ? s.labelHi : s.label}
                  </Link>
                ))}
              </div>
            </div>
            <ul>
              {open.map((r) => <RecruitmentRow key={r.slug} row={r} isHi={isHi} badge="open" />)}
            </ul>
            <div className="border-t border-black/8" />
            <div className="flex justify-center mt-5">
              <Link href="/jobs" className="inline-flex h-11 items-center rounded-lg border-[1.5px] border-neutral-900 px-6 text-sm font-bold hover:bg-neutral-50">
                {isHi ? `सभी ${nf(stats.liveRecruitments)} अधिसूचनाएं देखें` : `View all ${nf(stats.liveRecruitments)} live notifications`}
              </Link>
            </div>
          </section>
        )}

        {/* ── Who is hiring ─────────────────────────────────────── */}
        {orgs.length > 0 && (
          <section id="orgs" className="pt-2 pb-11 flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className={sectionTitle}>{isHi ? "कौन भर्ती कर रहा है" : "Who is hiring"}</h2>
              <Link href="/organizations" className={viewAll}>{isHi ? "सभी संगठन →" : "All organisations →"}</Link>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {orgs.map((o) => (
                <Link key={o.slug} href={`/organizations/${o.slug}`} className="inline-flex h-10 items-center gap-2 rounded-full border border-black/12 bg-white px-3.5 text-[15px] font-semibold hover:border-brand-600/50">
                  <span className="max-w-[260px] truncate">{isHi && o.nameHi ? o.nameHi : o.name}</span>
                  <span className="tabular-nums text-neutral-500">{nf(o.vacancies)}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Trust ─────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 py-9 border-t border-black/8">
          <TrustItem
            icon={<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4zM9 12l2 2 4-4" />}
            title={isHi ? "हर तथ्य आधिकारिक अधिसूचना से" : "Every fact from the official notification"}
            body={isHi ? "रिक्तियां, तारीखें, शुल्क और पात्रता भर्ती संस्था की अपनी PDF से — कभी अनुमान नहीं, कभी किसी और पोर्टल से नहीं।" : "Vacancies, dates, fees and eligibility are taken from the recruiting body's own PDF — never guessed, never copied from another portal."}
          />
          <TrustItem
            icon={<path d="M14 3h7v7M21 3l-9 9M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />}
            title={isHi ? "आधिकारिक वेबसाइट पर आवेदन करें" : "Apply on the official website"}
            body={isHi ? "हर पद सीधे सरकारी पोर्टल से जुड़ा है। JobOye कोई आवेदन, शुल्क या साइनअप नहीं लेता।" : "Each post links straight to the government portal. JobOye never takes an application, a fee or a signup."}
          />
          <TrustItem
            icon={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>}
            title={isHi ? "अंतिम तिथि, गिनती के साथ" : "Last date, counted down"}
            body={isHi ? "हर पद का एक स्थायी पेज जो बताता है कितने दिन बचे हैं — और विंडो बंद होने के बाद भी सच बताता है।" : "One permanent page per post that tells you how many days are left, and stays honest after the window closes."}
          />
        </section>

        {/* ── FAQ ───────────────────────────────────────────────── */}
        <section className="pb-14 max-w-3xl">
          <h2 className="text-xl font-semibold text-neutral-900 mb-3">{isHi ? "आम सवाल" : "Common questions"}</h2>
          <div className="border-b border-black/8">
            {HOME_FAQ.map(({ q, a }) => (
              <details key={q} className="border-t border-black/8 py-3.5 group">
                <summary className="cursor-pointer font-semibold text-neutral-900 list-none flex justify-between gap-4">
                  {q}
                  <span className="text-neutral-400 group-open:rotate-45 transition-transform" aria-hidden>+</span>
                </summary>
                <p className="mt-2 text-[15px] text-neutral-600">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function TrustItem({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600" aria-hidden="true">{icon}</svg>
      <h3 className="font-semibold text-[17px] text-neutral-900">{title}</h3>
      <p className="text-[15px] text-neutral-600">{body}</p>
    </div>
  );
}
