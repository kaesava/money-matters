'use client';

import React, { createContext, useContext } from 'react';

export interface CurrencyLocaleContextValue {
  currency: string;
  currencySymbol: string;
  minorUnits: number;
  locale: string;
}

const DEFAULT_CURRENCY_LOCALE: CurrencyLocaleContextValue = {
  currency: 'AUD',
  currencySymbol: '$',
  minorUnits: 2,
  locale: 'en-AU',
};

const CurrencyLocaleContext = createContext<CurrencyLocaleContextValue>(DEFAULT_CURRENCY_LOCALE);

export interface CurrencyLocaleProviderProps {
  currency?: string;
  currencySymbol?: string;
  minorUnits?: number;
  locale?: string;
  children: React.ReactNode;
}

export function CurrencyLocaleProvider({
  currency = 'AUD',
  currencySymbol = '$',
  minorUnits = 2,
  locale = 'en-AU',
  children,
}: CurrencyLocaleProviderProps) {
  const value = React.useMemo(
    () => ({
      currency: currency || 'AUD',
      currencySymbol: currencySymbol || '$',
      minorUnits: minorUnits !== undefined ? minorUnits : 2,
      locale: locale === 'auto' ? 'en-AU' : locale || 'en-AU',
    }),
    [currency, currencySymbol, minorUnits, locale]
  );

  return (
    <CurrencyLocaleContext.Provider value={value}>
      {children}
    </CurrencyLocaleContext.Provider>
  );
}

export function useCurrencyLocale(): CurrencyLocaleContextValue {
  return useContext(CurrencyLocaleContext);
}
