import type { Metadata } from 'next';
import { IntlProvider } from '@/components/intl-provider';
import { RootShell } from '@/components/root-shell';
import { htmlLang } from '@/lib/seo';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { locales, defaultLocale, type Locale, getMessages } from '@/i18n/request';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

type IntlMessages = { [key: string]: string | IntlMessages };

// This segment is reserved for actual locale-aware route families only.
// Legacy root-level exam slugs are handled by the build-generated allowlist
// in src/proxy.ts and canonical exam pages live under /exams/[slug].
// Do not add a page directly at [locale]/page.tsx: that would make arbitrary
// one-segment paths compete with locale semantics again.

export async function generateMetadata(
  { params }: LocaleLayoutProps,
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

// This is a root layout for localized route families. It sets the document
// language from the URL and provides the matching translation messages.
// The unprefixed route group has its own root layout; do not add a parent
// src/app/layout.tsx without reconciling the two root layouts and shell.

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
    <RootShell lang={htmlLang(locale)}>
      <IntlProvider locale={resolvedLocale} messages={messages as IntlMessages}>
        {children}
      </IntlProvider>
    </RootShell>
  );
}
