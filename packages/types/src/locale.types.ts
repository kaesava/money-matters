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
  INR: { code: "INR", symbol: "₹", minorUnits: 2, name: "Indian Rupee (INR)" },
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
  { code: "en-IN", label: "English (India)", dateFormatExample: "31/12/2026" },
  { code: "en-US", label: "English (United States)", dateFormatExample: "12/31/2026" },
  { code: "en-GB", label: "English (United Kingdom)", dateFormatExample: "31/12/2026" },
  { code: "en-CA", label: "English (Canada)", dateFormatExample: "2026-12-31" },
];

export interface TimezoneOption {
  value: string;
  label: string;
  labelKey?: string;
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  { value: "Australia/Sydney", label: "Sydney / Melbourne / Canberra (AEST/AEDT)", labelKey: "timezones.sydney" },
  { value: "Australia/Brisbane", label: "Brisbane (AEST - No DST)", labelKey: "timezones.brisbane" },
  { value: "Australia/Adelaide", label: "Adelaide (ACST/ACDT)", labelKey: "timezones.adelaide" },
  { value: "Australia/Perth", label: "Perth (AWST)", labelKey: "timezones.perth" },
  { value: "Pacific/Auckland", label: "Auckland / Wellington (NZST/NZDT)", labelKey: "timezones.auckland" },
  { value: "Asia/Kolkata", label: "India / Mumbai / Delhi (IST)", labelKey: "timezones.kolkata" },
  { value: "America/Toronto", label: "Toronto / Montreal (EST/EDT)", labelKey: "timezones.toronto" },
  { value: "America/Vancouver", label: "Vancouver (PST/PDT)", labelKey: "timezones.vancouver" },
  { value: "America/New_York", label: "New York (EST/EDT)", labelKey: "timezones.newYork" },
  { value: "America/Chicago", label: "Chicago (CST/CDT)", labelKey: "timezones.chicago" },
  { value: "America/Denver", label: "Denver (MST/MDT)", labelKey: "timezones.denver" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)", labelKey: "timezones.losAngeles" },
  { value: "Europe/London", label: "London (GMT/BST)", labelKey: "timezones.london" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)", labelKey: "timezones.tokyo" },
  { value: "Asia/Singapore", label: "Singapore (SGT)", labelKey: "timezones.singapore" },
  { value: "UTC", label: "UTC (Universal Coordinated Time)", labelKey: "timezones.utc" },
];

export interface AuStateOption {
  code: string;
  name: string;
}

export const AU_STATES: AuStateOption[] = [
  { code: "NSW", name: "New South Wales (NSW)" },
  { code: "VIC", name: "Victoria (VIC)" },
  { code: "QLD", name: "Queensland (QLD)" },
  { code: "WA", name: "Western Australia (WA)" },
  { code: "SA", name: "South Australia (SA)" },
  { code: "TAS", name: "Tasmania (TAS)" },
  { code: "ACT", name: "Australian Capital Territory (ACT)" },
  { code: "NT", name: "Northern Territory (NT)" },
];

export interface CountryDefaults {
  country: string;
  currency: SupportedCurrencyCode;
  timezone: string;
  locale: string;
  phoneCountryCode: string;
}

export const COUNTRY_DEFAULTS: Record<string, CountryDefaults> = {
  AU: { country: "AU", currency: "AUD", timezone: "Australia/Sydney", locale: "en-AU", phoneCountryCode: "+61" },
  IN: { country: "IN", currency: "INR", timezone: "Asia/Kolkata", locale: "en-IN", phoneCountryCode: "+91" },
  US: { country: "US", currency: "USD", timezone: "America/New_York", locale: "en-US", phoneCountryCode: "+1" },
  GB: { country: "GB", currency: "GBP", timezone: "Europe/London", locale: "en-GB", phoneCountryCode: "+44" },
  NZ: { country: "NZ", currency: "NZD", timezone: "Pacific/Auckland", locale: "en-NZ", phoneCountryCode: "+64" },
  CA: { country: "CA", currency: "CAD", timezone: "America/Toronto", locale: "en-CA", phoneCountryCode: "+1" },
  JP: { country: "JP", currency: "JPY", timezone: "Asia/Tokyo", locale: "ja-JP", phoneCountryCode: "+81" },
  SG: { country: "SG", currency: "SGD", timezone: "Asia/Singapore", locale: "en-SG", phoneCountryCode: "+65" },
};

export const DEFAULT_COUNTRY = "AU";
export const DEFAULT_CURRENCY: SupportedCurrencyCode = "AUD";
export const DEFAULT_TIMEZONE = "Australia/Sydney";
export const DEFAULT_LOCALE = "en-AU";

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_COUNTRIES: CountryOption[] = [
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
];

export function getCountryDefaults(countryCode: string): CountryDefaults {
  const code = countryCode.toUpperCase();
  return COUNTRY_DEFAULTS[code] || COUNTRY_DEFAULTS["AU"];
}

export const CurrencyCodeSchema = z.string().length(3).refine(
  (val) => val.toUpperCase() in SUPPORTED_CURRENCIES,
  { message: "Unsupported currency code" }
);
