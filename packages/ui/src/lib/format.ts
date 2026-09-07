/**
 * Standardized Monetary & Date Formatting Utilities
 */

export function formatCurrency(
  value: number | string | null | undefined,
  locale: string = "en-AU",
  currency: string = "AUD"
): string {
  if (value === null || value === undefined) {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(0);
  }
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(0);
  }
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(num);
}

export function fmtBalance(
  value: number | string | null | undefined,
  locale: string = "en-AU",
  currency: string = "AUD"
): string {
  return formatCurrency(value, locale, currency);
}

export function getCurrencySymbol(locale: string = "en-AU", currency: string = "AUD"): string {
  try {
    const parts = new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(0);
    const symbolPart = parts.find((p) => p.type === "currency");
    return symbolPart ? symbolPart.value : "$";
  } catch {
    return "$";
  }
}

export function getCurrencyMinorUnits(currency: string = "AUD"): number {
  switch (currency.toUpperCase()) {
    case "JPY":
    case "KRW":
    case "VND":
    case "CLP":
    case "PYG":
      return 0;
    default:
      return 2;
  }
}

export function fmtTransactionAmount(
  value: number | string | null | undefined,
  flowType?: 'CREDIT' | 'DEBIT',
  locale: string = "en-AU",
  currency: string = "AUD"
): string {
  const num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : 0;
  if (isNaN(num) || num === 0) {
    return formatCurrency(0, locale, currency);
  }

  const absFormatted = formatCurrency(Math.abs(num), locale, currency);
  if (flowType === 'DEBIT' || num < 0) {
    return `-${absFormatted}`;
  }
  if (flowType === 'CREDIT' || num > 0) {
    return `+${absFormatted}`;
  }
  return absFormatted;
}

export function getAmountColorClass(
  value: number | string | null | undefined,
  flowType?: 'CREDIT' | 'DEBIT' | 'BALANCE'
): string {
  const num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : 0;
  if (isNaN(num) || num === 0) return 'text-slate-500 font-semibold';

  if (flowType === 'CREDIT' || (flowType !== 'DEBIT' && num > 0 && flowType !== 'BALANCE')) {
    return 'text-emerald-600 dark:text-emerald-400 font-bold';
  }
  if (flowType === 'DEBIT' || num < 0) {
    return 'text-rose-600 dark:text-rose-400 font-bold';
  }
  return 'text-[#1B2B4B] dark:text-slate-100 font-bold';
}

export function fmtDateTime(
  input: string | Date | number | null | undefined,
  timeZone: string = "Australia/Sydney"
): string {
  if (!input) return "N/A";
  try {
    const d = new Date(input);
    if (isNaN(d.getTime())) return "N/A";
    return new Intl.DateTimeFormat("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone,
    }).format(d);
  } catch {
    return "N/A";
  }
}
