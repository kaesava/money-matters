/**
 * Currency & Date Formatting Utility Suite
 * 
 * Provides AUD currency formatting ($XX.XX and compact $XK), localized en-AU date rendering,
 * and relative date labeling (Today, Yesterday).
 */

/**
 * Formats a numeric value or numeric string as standard AUD currency ($XX.XX).
 *
 * @param value - Amount value to format
 * @returns Formatted currency string
 */
export function formatAUD(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0.00';
  return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats a numeric value as compact AUD currency ($1.5k).
 *
 * @param value - Amount value to format
 * @returns Compact formatted currency string
 */
export function formatAUDCompact(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0';
  if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}k`;
  }
  return `$${num.toFixed(0)}`;
}

/**
 * Formats a Date or date string into en-AU short date string (e.g. '15 Aug 2026').
 *
 * @param date - Date instance or ISO string
 * @returns Formatted date string
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Formats a Date into relative terms ('Today', 'Yesterday', or short date).
 *
 * @param date - Date instance or ISO string
 * @returns Relative date label
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  }
}

