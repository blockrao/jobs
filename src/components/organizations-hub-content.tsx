'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { readLocaleCookie, LOCALE_CHANGE_EVENT } from "@/i18n/locale-cookie";
import type { Locale } from "@/i18n/request";

type OrgWithStats = {
  id: number;
  slug: string;
  name: string;
  nameHi?: string | null;
  description?: string | null;
  descriptionHi?: string | null;
  logoUrl?: string | null;
  roles?: string[] | null;
  recruitmentCount: number;
  examCount: number;
};

const ROLE_LABELS: Record<string, string> = {
  EXAM_AUTHORITY: "Exam Authority",
  RECRUITING_BODY: "Recruiting Body",
  COMMISSION: "Commission",
};

const ROLE_LABELS_HI: Record<string, string> = {
  EXAM_AUTHORITY: "परीक्षा प्राधिकरण",
  RECRUITING_BODY: "भर्ती संस्था",
  COMMISSION: "आयोग",
};

// Same pattern as home-content.tsx: the page (src/app/organizations/page.tsx)
// stays a plain static/ISR server component that only fetches data, and
// this client component decides how to render it based on the visitor's
// saved language cookie.
export function OrganizationsHubContent({
  orgsWithStats,
}: {
  orgsWithStats: OrgWithStats[];
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
  const roleLabels = isHi ? ROLE_LABELS_HI : ROLE_LABELS;
  const L = {
    heading: isHi ? "सरकारी संगठन" : "Government Organizations",
    subtitle: isHi
      ? "सरकारी नौकरी परीक्षाएं और भर्ती अभियान संचालित करने वाले संगठनों, आयोगों और प्राधिकरणों को देखें।"
      : "Explore recruitment organizations, commissions, and authorities that conduct government job exams and recruitment drives.",
    none: isHi
      ? "अभी कोई संगठन उपलब्ध नहीं है।"
      : "No organizations available yet.",
    campaigns: isHi ? "अभियान" : "Campaigns",
    exams: isHi ? "परीक्षाएं" : "Exams",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{L.heading}</h1>
        <p className="text-lg text-gray-600">{L.subtitle}</p>
      </div>

      {orgsWithStats.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-lg">
          <p className="text-gray-600">{L.none}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orgsWithStats.map((org) => {
            const displayName = isHi && org.nameHi ? org.nameHi : org.name;
            const displayDescription =
              isHi && org.descriptionHi ? org.descriptionHi : org.description;
            // Only link into the Hindi org page when it actually has Hindi
            // content, same discipline as home-content.tsx.
            const href =
              isHi && org.nameHi
                ? `/hi/organizations/${org.slug}`
                : `/organizations/${org.slug}`;
            return (
              <Link key={org.id} href={href} className="block">
                <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow h-full flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    {org.logoUrl && (
                      <img
                        src={org.logoUrl}
                        alt={displayName}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-grow">
                      <h2 className="text-xl font-semibold text-blue-600 hover:underline">
                        {displayName}
                      </h2>
                    </div>
                  </div>

                  {displayDescription && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-grow">
                      {displayDescription}
                    </p>
                  )}

                  {org.roles && org.roles.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {org.roles.map((role) => (
                        <span
                          key={role}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                        >
                          {roleLabels[role] || role.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-100 flex justify-between">
                    {org.recruitmentCount > 0 && (
                      <div className="text-sm">
                        <div className="text-gray-600 text-xs">
                          {L.campaigns}
                        </div>
                        <div className="font-semibold">
                          {org.recruitmentCount}
                        </div>
                      </div>
                    )}
                    {org.examCount > 0 && (
                      <div className="text-sm">
                        <div className="text-gray-600 text-xs">{L.exams}</div>
                        <div className="font-semibold">{org.examCount}</div>
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
