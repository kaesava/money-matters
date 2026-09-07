import { z } from "zod";

export interface CurrencyConfig {
  code: string;
  symbol: string;
  minorUnits: number; // 2 for AUD, 0 for JPY
  name: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  AUD: { code: "AUD", symbol: "$", minorUnits: 2, name: "Australian Dollar (AUD)" },
  USD: { code: "USD", symbol: "$", minorUnits: 2, name: "US Dollar (USD)" },
  EUR: { code: "EUR", symbol: "€", minorUnits: 2, name: "Euro (EUR)" },
  GBP: { code: "GBP", symbol: "£", minorUnits: 2, name: "British Pound (GBP)" },
  NZD: { code: "NZD", symbol: "$", minorUnits: 2, name: "New Zealand Dollar (NZD)" },
  CAD: { code: "CAD", symbol: "$", minorUnits: 2, name: "Canadian Dollar (CAD)" },
  JPY: { code: "JPY", symbol: "¥", minorUnits: 0, name: "Japanese Yen (JPY)" },
  SGD: { code: "SGD", symbol: "$", minorUnits: 2, name: "Singapore Dollar (SGD)" },
};

export type SupportedCurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

export interface LocaleOption {
  code: string;
  label: string;
  dateFormatExample: string;
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: "auto", label: "Automatic (Browser)", dateFormatExample: "System Default" },
  { code: "en-AU", label: "English (Australia)", dateFormatExample: "31/12/2026" },
  { code: "en-US", label: "English (United States)", dateFormatExample: "12/31/2026" },
  { code: "en-GB", label: "English (United Kingdom)", dateFormatExample: "31/12/2026" },
  { code: "en-CA", label: "English (Canada)", dateFormatExample: "2026-12-31" },
  { code: "ja-JP", label: "日本語 (Japan)", dateFormatExample: "2026/12/31" },
];

export interface CountryDefaults {
  country: string;
  currency: SupportedCurrencyCode;
  timezone: string;
  locale: string;
}

export const COUNTRY_DEFAULTS: Record<string, CountryDefaults> = {
  AU: { country: "AU", currency: "AUD", timezone: "Australia/Sydney", locale: "en-AU" },
  US: { country: "US", currency: "USD", timezone: "America/New_York", locale: "en-US" },
  GB: { country: "GB", currency: "GBP", timezone: "Europe/London", locale: "en-GB" },
  NZ: { country: "NZ", currency: "NZD", timezone: "Pacific/Auckland", locale: "en-NZ" },
  CA: { country: "CA", currency: "CAD", timezone: "America/Toronto", locale: "en-CA" },
  JP: { country: "JP", currency: "JPY", timezone: "Asia/Tokyo", locale: "ja-JP" },
  SG: { country: "SG", currency: "SGD", timezone: "Asia/Singapore", locale: "en-SG" },
};

export const DEFAULT_COUNTRY = "AU";
export const DEFAULT_CURRENCY: SupportedCurrencyCode = "AUD";
export const DEFAULT_TIMEZONE = "Australia/Sydney";
export const DEFAULT_LOCALE = "en-AU";

export const CurrencyCodeSchema = z.string().length(3).refine(
  (val) => val.toUpperCase() in SUPPORTED_CURRENCIES,
  { message: "Unsupported currency code" }
);
