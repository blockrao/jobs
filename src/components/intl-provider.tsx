'use client';

import { ReactNode } from 'react';
import { IntlErrorCode, NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { Locale } from '@/i18n/request';

export function IntlProvider({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale: Locale;
  messages: AbstractIntlMessages;
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
