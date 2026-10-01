import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { IntlProvider } from "@/components/intl-provider";
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
    languages: {
      en: `${SITE_URL}/en`,
      hi: `${SITE_URL}/hi`,
      "x-default": SITE_URL,
    },
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
        {/* Hreflang for search engines */}
        <link rel="alternate" hrefLang="en" href={`${SITE_URL}/en`} />
        <link rel="alternate" hrefLang="hi" href={`${SITE_URL}/hi`} />
        <link rel="alternate" hrefLang="x-default" href={SITE_URL} />

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
        <IntlProvider locale={defaultLocale} messages={messages as Record<string, any>}>
          <AnalyticsTracker />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </IntlProvider>
      </body>
    </html>
  );
}
