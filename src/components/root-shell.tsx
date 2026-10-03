import "@fontsource-variable/inter";
import "@fontsource-variable/inter/wght-italic.css";
import "@/app/globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { ListingLanguageAssist } from "@/components/listing-language-assist";
import { IntlProvider } from "@/components/intl-provider";
import { NavigationProgressProvider } from "@/components/navigation-progress";
import { buildWebSiteSchema, jsonLdGraph } from "@/lib/structured-data";
import { defaultLocale, getMessages } from "@/i18n/request";

/**
 * The single page shell (<html>, <head>, <body>, header, footer) shared by
 * the two root layouts:
 *
 *   src/app/(default)/layout.tsx   unprefixed English tree   lang="en"
 *   src/app/[locale]/layout.tsx    /hi entity pages          lang from URL
 *
 * There is no layout above these two, so every page is wrapped by exactly
 * one shell. Do not render this component from a nested layout: two shells
 * on one page is the duplicate-header bug this structure exists to prevent.
 *
 * `lang` is decided on the server by the calling root layout (SEO-001
 * step 3). `listingLanguageAssist` is passed only by the unprefixed tree.
 */
export async function RootShell({
  lang,
  listingLanguageAssist = false,
  children,
}: {
  lang: "en" | "hi";
  listingLanguageAssist?: boolean;
  children: React.ReactNode;
}) {
  const siteSchema = jsonLdGraph(buildWebSiteSchema());
  const gaId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

  // Get the default locale messages for root
  const messages = await getMessages(defaultLocale);

  return (
    <html lang={lang} className="h-full antialiased">
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
            {listingLanguageAssist && <ListingLanguageAssist />}
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
