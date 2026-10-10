'use client';

import { ReactNode } from 'react';
import { IntlErrorCode, NextIntlClientProvider } from 'next-intl';
import { Locale, getMessages } from '@/i18n/request';

export function IntlProvider({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale: Locale;
  messages: Awaited<ReturnType<typeof getMessages>>;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(error) => {
        if (error.code === IntlErrorCode.MISSING_MESSAGE) {
          console.warn('Missing message:', error);
        }
      }}
      timeZone="Asia/Kolkata"
      now={new Date()}
    >
      {children}
    </NextIntlClientProvider>
  );
}
