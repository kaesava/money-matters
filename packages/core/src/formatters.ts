export interface FormatterTenant {
  country?: string | null;
  timezone?: string | null;
}

export const DEFAULT_TENANT_FORMATTER: FormatterTenant = {
  country: "AU",
  timezone: "Australia/Sydney",
};

export function getLocaleFromCountry(countryCode?: string | null): string {
  if (!countryCode) return "en-AU";
  return `en-${countryCode}`;
}

export function getCurrencyFromCountry(countryCode?: string | null): string {
  switch (countryCode) {
    case "US":
      return "USD";
    case "GB":
      return "GBP";
    case "NZ":
      return "NZD";
    case "AU":
    default:
      return "AUD";
  }
}

/**
 * Returns YYYY-MM-DD date string formatted according to tenant timezone.
 * Uses en-CA locale for ISO-style YYYY-MM-DD format.
 */
export function getTenantDateString(
  date: Date = new Date(),
  tenant: FormatterTenant = DEFAULT_TENANT_FORMATTER
): string {
  const timezone = tenant?.timezone || DEFAULT_TENANT_FORMATTER.timezone!;
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(date);
}

/**
 * Format a number/string as currency based on tenant country rules.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  tenant: FormatterTenant = DEFAULT_TENANT_FORMATTER,
  options?: Intl.NumberFormatOptions
): string {
  if (amount == null) return "";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "";

  const locale = getLocaleFromCountry(tenant?.country);
  const currency = getCurrencyFromCountry(tenant?.country);

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    ...options,
  }).format(num);
}

/**
 * Format a date object/string based on tenant timezone rules.
 */
export function formatDate(
  date: Date | string | null | undefined,
  tenant: FormatterTenant = DEFAULT_TENANT_FORMATTER,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;

  const locale = getLocaleFromCountry(tenant?.country);
  const timezone = tenant?.timezone || DEFAULT_TENANT_FORMATTER.timezone!;

  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(d);
}

/**
 * Format a datetime object/string based on tenant timezone rules.
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  tenant: FormatterTenant = DEFAULT_TENANT_FORMATTER,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;

  const locale = getLocaleFromCountry(tenant?.country);
  const timezone = tenant?.timezone || DEFAULT_TENANT_FORMATTER.timezone!;

  return new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(d);
}
