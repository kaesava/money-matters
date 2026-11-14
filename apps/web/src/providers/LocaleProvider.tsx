"use client";
import { DEFAULT_TIMEZONE, DEFAULT_LOCALE } from "@money-matters/types";


import React, { createContext, useContext, useEffect, useMemo } from "react";
import { setLanguage, SupportedLanguage } from "@money-matters/i18n";
import {
  formatCurrency,
  fmtDate as formatBaseDate,
  fmtDateMedium as formatBaseDateMedium,
  fmtDateTime as formatBaseDateTime,
  fmtTransactionAmount as formatBaseTxAmount,
  getCurrencySymbol,
  getCurrencyMinorUnits,
  IconVisibilityProvider,
  DateLocaleProvider,
  CurrencyLocaleProvider,
} from "@money-matters/ui";
import { authClient } from "../lib/auth";
import { trpc } from "../lib/trpc";

export interface LocaleContextValue {
  currency: string;
  currencySymbol: string;
  minorUnits: number;
  country: string;
  timezone: string;
  userTimezone: string;
  locale: string;
  language: SupportedLanguage;
  fmt: (value: number | string | null | undefined) => string;
  fmtDate: (date: string | Date | number | null | undefined) => string;
  fmtDateMedium: (date: string | Date | number | null | undefined) => string;
  fmtDateTime: (date: string | Date | number | null | undefined) => string;
  fmtTx: (
    value: number | string | null | undefined,
    flowType?: "CREDIT" | "DEBIT"
  ) => string;
}

const DEFAULT_LOCALE_CONTEXT: LocaleContextValue = {
  currency: "AUD",
  currencySymbol: "$",
  minorUnits: 2,
  country: "AU",
  timezone: DEFAULT_TIMEZONE,
  userTimezone: DEFAULT_TIMEZONE,
  locale: DEFAULT_LOCALE,
  language: "en",
  fmt: (v) => formatCurrency(v, DEFAULT_LOCALE, "AUD"),
  fmtDate: (d) => formatBaseDate(d, DEFAULT_TIMEZONE, DEFAULT_LOCALE),
  fmtDateMedium: (d) => formatBaseDateMedium(d, DEFAULT_TIMEZONE, DEFAULT_LOCALE),
  fmtDateTime: (d) => formatBaseDateTime(d, DEFAULT_TIMEZONE, DEFAULT_LOCALE),
  fmtTx: (v, f) => formatBaseTxAmount(v, f, DEFAULT_LOCALE, "AUD"),
};

const LocaleContext = createContext<LocaleContextValue>(DEFAULT_LOCALE_CONTEXT);

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, {
    enabled: !!session?.user,
    staleTime: 60_000,
  });

  const pref = userPrefQuery.data;

  const language = (pref?.language as SupportedLanguage) || "en";
  const rawLocale = pref?.locale || "auto";

  const resolvedLocale = useMemo(() => {
    if (rawLocale === "auto") {
      if (typeof navigator !== "undefined" && navigator.language) {
        return navigator.language;
      }
      return DEFAULT_LOCALE;
    }
    return rawLocale;
  }, [rawLocale]);

  const currency = pref?.currency || "AUD";
  const country = pref?.country || "AU";
  const timezone = pref?.tenantTimezone || pref?.timezone || DEFAULT_TIMEZONE;
  const userTimezone = pref?.timezone || timezone;

  const currencySymbol = useMemo(
    () => getCurrencySymbol(resolvedLocale, currency),
    [resolvedLocale, currency]
  );
  const minorUnits = useMemo(
    () => getCurrencyMinorUnits(currency),
    [currency]
  );

  useEffect(() => {
    if (language) {
      setLanguage(language);
    }
  }, [language]);

  const value: LocaleContextValue = useMemo(() => {
    return {
      currency,
      currencySymbol,
      minorUnits,
      country,
      timezone,
      userTimezone,
      locale: resolvedLocale,
      language,
      fmt: (val) => formatCurrency(val, resolvedLocale, currency),
      fmtDate: (d) => formatBaseDate(d, userTimezone, resolvedLocale),
      fmtDateMedium: (d) => formatBaseDateMedium(d, userTimezone, resolvedLocale),
      fmtDateTime: (d) => formatBaseDateTime(d, userTimezone, resolvedLocale),
      fmtTx: (val, flowType) =>
        formatBaseTxAmount(val, flowType, resolvedLocale, currency),
    };
  }, [
    currency,
    currencySymbol,
    minorUnits,
    country,
    timezone,
    userTimezone,
    resolvedLocale,
    language,
  ]);

  return (
    <LocaleContext.Provider value={value}>
      <CurrencyLocaleProvider
        currency={currency}
        currencySymbol={currencySymbol}
        minorUnits={minorUnits}
        locale={resolvedLocale}
      >
        <DateLocaleProvider locale={resolvedLocale} timeZone={userTimezone}>
          <IconVisibilityProvider initialShowIcons={pref?.showIcons ?? true}>
            {children}
          </IconVisibilityProvider>
        </DateLocaleProvider>
      </CurrencyLocaleProvider>
    </LocaleContext.Provider>
  );
}
