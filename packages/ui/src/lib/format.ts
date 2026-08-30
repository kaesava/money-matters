/**
 * Standardized Monetary & Date Formatting Utilities
 */

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  if (num < 0) {
    return `-$${Math.abs(num).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtBalance(value: number | string | null | undefined): string {
  return formatCurrency(value);
}

export function fmtTransactionAmount(
  value: number | string | null | undefined,
  flowType?: 'CREDIT' | 'DEBIT'
): string {
  if (value === null || value === undefined) return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return '$0.00';

  const absStr = Math.abs(num).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (flowType === 'CREDIT' || num > 0) {
    return `+$${absStr}`;
  }
  return `-$${absStr}`;
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

export function fmtDateTime(input: string | Date | number | null | undefined): string {
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
      timeZone: "Australia/Sydney",
    }).format(d);
  } catch {
    return "N/A";
  }
}

