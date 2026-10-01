// Supported locales
export const locales = ['en', 'hi'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export async function getMessages(locale: Locale) {
  try {
    return (
      await (locale === 'hi'
        ? import('./messages/hi.json')
        : import('./messages/en.json'))
    ).default;
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    return {};
  }
}
