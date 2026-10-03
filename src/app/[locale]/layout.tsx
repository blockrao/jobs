import type { Metadata } from 'next';
import { IntlProvider } from '@/components/intl-provider';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { locales, defaultLocale, type Locale, getMessages } from '@/i18n/request';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

// No generateStaticParams here anymore. This layout's dynamic segment
// ("locale") is shared with two very different kinds of routes now — the
// real en/hi locale pages (articles/exams/organizations/jobs subtrees)
// AND the exam leaf page at [locale]/page.tsx, whose "locale" values are
// actually exam slugs (see that file's comment for why they share a
// folder name at all). A generateStaticParams here that only returned
// ['en','hi'] would be actively wrong for the exam page's slugs, and
// every route under this layout is already server-rendered on demand
// (ƒ Dynamic, not statically generated — confirmed via `next build`), so
// this was never achieving build-time prerendering in the first place.

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
    // No canonical here: each page under this layout sets its own through
    // src/lib/seo.
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
//
// This layout also wraps [locale]/page.tsx (the exam detail leaf — see its
// own file comment for why it lives in this folder), whose "locale" param
// value is actually an exam slug like "ssc-cgl-2026", never "en" or "hi".
// It used to notFound() here whenever locale wasn't a recognized value,
// which would have 404'd every single exam page. Falling back to
// defaultLocale's messages instead is a no-op for that page (it doesn't
// use next-intl translations at all) and, for the genuine /en or /hi
// subtree pages, only changes behavior for a URL with an outright invalid
// locale segment (e.g. /xx/articles/foo) — that now renders with English
// text instead of 404ing, which is a strictly more forgiving fallback, not
// a loss of real functionality.
export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;
  const resolvedLocale = locales.includes(locale as Locale)
    ? (locale as Locale)
    : defaultLocale;

  const messages = await getMessages(resolvedLocale);

  return (
    <IntlProvider locale={resolvedLocale} messages={messages as Record<string, any>}>
      {children}
    </IntlProvider>
  );
}
