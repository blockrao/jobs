import type { Metadata } from 'next';
import { IntlProvider } from '@/components/intl-provider';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import { buildWebSiteSchema, jsonLdGraph } from '@/lib/structured-data';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { locales, type Locale, getMessages } from '@/i18n/request';
import '@/app/globals.css';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(
  { params }: LocaleLayoutProps,
  parent: any
): Promise<Metadata> {
  const { locale } = await params;
  const canonicalUrl = new URL(SITE_URL);
  canonicalUrl.pathname = `/${locale}`;

  const translations: Record<string, string> = {
    en: `${SITE_NAME} — Govt & Private Job Notifications, Results, Guides`,
    hi: 'JobOye — सरकारी और निजी नौकरी सूचनाएं, परिणाम, गाइड',
  };

  const descriptions: Record<string, string> = {
    en: 'Latest government and private job notifications across India — admit cards, exam dates, answer keys, results, and in-depth guides, all in one place.',
    hi: 'भारत भर में नवीनतम सरकारी और निजी नौकरी सूचनाएं — प्रवेश पत्र, परीक्षा तारीखें, उत्तर कुंजी, परिणाम और विस्तृत गाइड, सब एक जगह।',
  };

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: translations[locale as keyof typeof translations] || translations['en'],
      template: `%s | ${SITE_NAME}`,
    },
    description: descriptions[locale as keyof typeof descriptions] || descriptions['en'],
    alternates: {
      // Fallback only — every page under this layout (articles/exams/
      // organizations) sets its own correct alternates.canonical for its
      // actual path, which replaces this. No languages/hreflang block: see
      // the note in the <head> above.
      canonical: canonicalUrl.toString(),
    },
    openGraph: {
      title: translations[locale as keyof typeof translations] || translations['en'],
      description: descriptions[locale as keyof typeof descriptions] || descriptions['en'],
      url: canonicalUrl.toString(),
      locale: locale === 'hi' ? 'hi_IN' : 'en_US',
      alternateLocale: locale === 'hi' ? 'en_US' : 'hi_IN',
      type: 'website',
      siteName: SITE_NAME,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    return <div>Invalid locale</div>;
  }

  // Get messages for this locale
  const messages = await getMessages(locale as Locale);

  const siteSchema = jsonLdGraph(buildWebSiteSchema());
  const gaId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

  return (
    <html lang={locale} className="h-full antialiased">
      <head>
        {/* No manual hreflang <link> tags here: they previously pointed at
            the bare /en and /hi roots (no page exists there — see
            root layout.tsx) regardless of which actual page rendered them.
            Each child page's own generateMetadata sets its correct
            alternates.canonical; a real hreflang pair (this article/exam/org
            page in the other language) can be added once that counterpart
            page exists and both sides can link to each other. */}

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
        <IntlProvider locale={locale as Locale} messages={messages as Record<string, any>}>
          <AnalyticsTracker />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </IntlProvider>
      </body>
    </html>
  );
}
