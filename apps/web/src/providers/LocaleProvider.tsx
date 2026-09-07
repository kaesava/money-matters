"use client";

import React, { createContext, useContext, useEffect, useMemo } from "react";
import { setLanguage, SupportedLanguage } from "@money-matters/i18n";
import {
  formatCurrency,
  fmtDate as formatBaseDate,
  fmtDateTime as formatBaseDateTime,
  fmtTransactionAmount as formatBaseTxAmount,
  getCurrencySymbol,
  getCurrencyMinorUnits,
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
  timezone: "Australia/Sydney",
  userTimezone: "Australia/Sydney",
  locale: "en-AU",
  language: "en",
  fmt: (v) => formatCurrency(v, "en-AU", "AUD"),
  fmtDate: (d) => formatBaseDate(d, "Australia/Sydney", "en-AU"),
  fmtDateTime: (d) => formatBaseDateTime(d, "Australia/Sydney"),
  fmtTx: (v, f) => formatBaseTxAmount(v, f, "en-AU", "AUD"),
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
      return language === "ja" ? "ja-JP" : "en-AU";
    }
    return rawLocale;
  }, [rawLocale, language]);

  const currency = pref?.currency || "AUD";
  const country = pref?.country || "AU";
  const timezone = pref?.tenantTimezone || pref?.timezone || "Australia/Sydney";
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
      fmtDate: (d) => formatBaseDate(d, timezone, resolvedLocale),
      fmtDateTime: (d) => formatBaseDateTime(d, userTimezone),
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
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
