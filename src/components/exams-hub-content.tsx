'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import type { listCommissionsWithExams } from "@/lib/queries";
import { readLocaleCookie, LOCALE_CHANGE_EVENT } from "@/i18n/locale-cookie";
import type { Locale } from "@/i18n/request";

type Commissions = Awaited<ReturnType<typeof listCommissionsWithExams>>;

// Same pattern as home-content.tsx: the page (src/app/exams/page.tsx) stays
// a plain static/ISR server component that only fetches data — every
// commission row already includes nameHi/descriptionHi regardless of
// locale — and this client component decides how to render it based on the
// visitor's saved language cookie.
export function ExamsHubContent({
  commissions,
  openCounts,
}: {
  commissions: Commissions;
  openCounts: Record<number, number>;
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
  const L = {
    heading: isHi ? "परीक्षा अनुसार ब्राउज़ करें" : "Browse by Exam",
    subtitle: isHi
      ? "विभिन्न आयोगों की सरकारी नौकरी परीक्षाओं को देखें और अपना अगला अवसर खोजें।"
      : "Explore government job exams from different commissions and find your next opportunity.",
    none: isHi ? "अभी कोई परीक्षा उपलब्ध नहीं है।" : "No exams available yet.",
    exams: isHi ? "परीक्षाएं" : "exams",
    positionsOpen: isHi ? "पद खुले हैं" : "open",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">{L.heading}</h1>
        <p className="text-neutral-600">{L.subtitle}</p>
      </div>

      {commissions.length === 0 ? (
        <div className="rounded-lg bg-neutral-50 border border-black/10 p-8 text-center">
          <p className="text-neutral-600">{L.none}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {commissions.map((comm) => {
            const openCount = openCounts[comm.id] || 0;
            const nameHi = (comm as any).nameHi as string | null;
            const descriptionHi = (comm as any).descriptionHi as
              | string
              | null;
            const displayName = isHi && nameHi ? nameHi : comm.name;
            const displayDescription =
              isHi && descriptionHi ? descriptionHi : comm.description;
            return (
              <Link key={comm.id} href={`/commissions/${comm.slug}`}>
                <div className="p-6 border border-black/10 rounded-lg hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                      style={{ backgroundColor: comm.color || "#000000" }}
                    />
                    <h2 className="text-lg font-semibold">{displayName}</h2>
                  </div>

                  {displayDescription && (
                    <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                      {displayDescription}
                    </p>
                  )}

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">{comm.exams.length}</span>{" "}
                      {L.exams}
                    </div>
                    {openCount > 0 && (
                      <div className="text-sm text-green-600 font-medium">
                        {isHi
                          ? `${openCount} ${L.positionsOpen}`
                          : `${openCount} position${openCount !== 1 ? "s" : ""} open`}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
