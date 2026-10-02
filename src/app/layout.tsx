import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/inter/wght-italic.css";
import "./globals.css";

// Replaces the previous Arial/Helvetica system-font fallback (the
// unmodified Next.js starter default) with a real typeface. Uses
// @fontsource (npm-installed static font files bundled into the build)
// rather than next/font/google, which fetches from fonts.googleapis.com
// at build time — that fetch isn't guaranteed to succeed in every build
// environment (it failed outright in this sandbox's restricted-egress
// shell), so self-hosting from npm removes that dependency entirely. The
// font's own CSS sets `font-family: "Inter Variable", ...`, referenced by
// globals.css's `body` rule.
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { HtmlLangSync } from "@/components/html-lang-sync";
import { IntlProvider } from "@/components/intl-provider";
import { NavigationProgressProvider } from "@/components/navigation-progress";
import { buildWebSiteSchema, jsonLdGraph } from "@/lib/structured-data";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { defaultLocale, getMessages } from "@/i18n/request";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Govt & Private Job Notifications, Results, Guides`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Latest government and private job notifications across India — admit cards, exam dates, answer keys, results, and in-depth guides, all in one place.",
  alternates: {
    canonical: "/",
    // No hreflang languages block here: /en and /hi have no page of their
    // own (only /en/articles/[slug], /en/exams/[slug], etc. under
    // src/app/[locale]/ resolve). A broken hreflang target is worse than
    // none — add this back once a root page exists per locale, or scope it
    // per-route in each [locale] segment that actually has one.
  },
  openGraph: {
    title: `${SITE_NAME} — Govt & Private Job Notifications, Results, Guides`,
    description: "Latest government and private job notifications across India — admit cards, exam dates, answer keys, results, and in-depth guides, all in one place.",
    url: SITE_URL,
    type: "website",
    siteName: SITE_NAME,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const siteSchema = jsonLdGraph(buildWebSiteSchema());
  const gaId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

  // Get the default locale messages for root
  const messages = await getMessages(defaultLocale);

  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Google Analytics 4 */}
        {gaId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
        <NavigationProgressProvider>
          <IntlProvider locale={defaultLocale} messages={messages as Record<string, any>}>
            <HtmlLangSync />
            <AnalyticsTracker />
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </IntlProvider>
        </NavigationProgressProvider>
      </body>
    </html>
  );
}
