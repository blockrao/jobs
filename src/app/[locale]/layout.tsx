import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { IntlProvider } from '@/components/intl-provider';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { locales, type Locale, getMessages } from '@/i18n/request';

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
      // organizations/jobs) sets its own correct alternates.canonical for
      // its actual path, which replaces this. No languages/hreflang block
      // here: /en and /hi have no page of their own (see root layout.tsx) —
      // each child page's generateMetadata sets the real hreflang pair once
      // that page's translated counterpart exists.
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

// NOTE: this layout is nested UNDER the root layout (src/app/layout.tsx),
// which already renders the single <html>/<head>/<body> shell, Header,
// Footer, AnalyticsTracker and the WebSite JSON-LD schema for every route in
// the app — including everything under this [locale] segment. This layout
// used to redeclare all of that itself, which meant every /en or /hi page
// rendered TWO nested <html>/<body> trees (browsers silently merge the
// second set into the first during HTML parsing, but React's virtual DOM
// still thinks it rendered two independent trees). The visible symptom: two
// separate Header/LanguageSwitcher component instances existed per page —
// the outer one from root layout, permanently stuck on next-intl's
// defaultLocale ('en') since root layout never knows this segment's locale
// param. Clicking the switcher while it was actually the OUTER instance
// (always believing the current locale was 'en') on an already-/hi/ page
// produced /hi/hi/... links, plus duplicate GA page-view hits and duplicate
// WebSite schema blocks on every page. Fixed by having this layout do only
// what's genuinely locale-specific — validate the locale and provide the
// next-intl context — and nothing structural.
export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages(locale as Locale);

  return (
    <IntlProvider locale={locale as Locale} messages={messages as Record<string, any>}>
      {children}
    </IntlProvider>
  );
}
