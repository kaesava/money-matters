'use client';

import React, { createContext, useContext } from 'react';

export interface DateLocaleContextValue {
  locale: string;
  timeZone: string;
}

const DEFAULT_DATE_LOCALE: DateLocaleContextValue = {
  locale: 'en-AU',
  timeZone: 'Australia/Sydney',
};

const DateLocaleContext = createContext<DateLocaleContextValue>(DEFAULT_DATE_LOCALE);

export interface DateLocaleProviderProps {
  locale?: string;
  timeZone?: string;
  children: React.ReactNode;
}

export function DateLocaleProvider({
  locale = 'en-AU',
  timeZone = 'Australia/Sydney',
  children,
}: DateLocaleProviderProps) {
  const value = React.useMemo(
    () => ({
      locale: locale === 'auto' ? 'en-AU' : locale,
      timeZone: timeZone || 'Australia/Sydney',
    }),
    [locale, timeZone]
  );

  return (
    <DateLocaleContext.Provider value={value}>
      {children}
    </DateLocaleContext.Provider>
  );
}

export function useDateLocale(): DateLocaleContextValue {
  return useContext(DateLocaleContext);
}
