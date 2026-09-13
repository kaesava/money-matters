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
export function formatHealthStatus(status?: string | null): string {
  if (!status) return 'On Track';
  switch (status.toUpperCase()) {
    case 'GREEN':
      return 'On Track';
    case 'AMBER':
      return 'Needs Attention';
    case 'RED':
      return 'Behind';
    default:
      return status;
  }
}

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

import { t } from '@money-matters/i18n';
import { fmtDate as uiFmtDate } from '@money-matters/ui';

/**
 * Formats a Date or date string into regional locale format.
 *
 * @param date - Date instance or ISO string
 * @param locale - BCP-47 locale code (e.g. 'en-CA', 'en-AU')
 * @param timeZone - IANA timezone identifier
 * @returns Formatted date string
 */
export function formatDate(date: string | Date, locale: string = 'en-AU', timeZone: string = 'Australia/Sydney'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return uiFmtDate(d, timeZone, locale);
}

/**
 * Formats a Date into relative terms ('Today', 'Yesterday', or localized date).
 *
 * @param date - Date instance or ISO string
 * @param locale - BCP-47 locale code
 * @param timeZone - IANA timezone identifier
 * @returns Relative date label
 */
export function formatRelativeDate(date: string | Date, locale: string = 'en-AU', timeZone: string = 'Australia/Sydney'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return t('common.today', { defaultValue: 'Today' });
  } else if (d.toDateString() === yesterday.toDateString()) {
    return t('common.yesterday', { defaultValue: 'Yesterday' });
  } else {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone }).format(d);
  }
}

/**
 * Schedule Recurrence & Aussie Lingo Formatting Utility
 */
export interface ScheduleDetail {
  isRecurring: boolean;
  badgeText: string;
  detailText: string;
  frequencyLabel: string;
}

export function formatScheduleDetail(rrule?: string | null, startDate?: string | null): ScheduleDetail {
  const isRecurring = Boolean(rrule && rrule.trim().length > 0);

  const fmtDate = (dStr?: string | null) => {
    if (!dStr) return null;
    try {
      const parts = dStr.split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch { /* invalid date string — fall through and return raw dStr */ }
    return dStr;
  };

  const formattedDate = fmtDate(startDate);

  if (!isRecurring) {
    return {
      isRecurring: false,
      badgeText: 'One-off',
      detailText: formattedDate ? `Expected ${formattedDate}` : 'One-off schedule',
      frequencyLabel: 'One-off',
    };
  }

  let frequencyLabel = 'Recurring';
  if (rrule?.includes('INTERVAL=2') && rrule?.includes('WEEKLY')) {
    frequencyLabel = 'Fortnightly';
  } else if (rrule?.includes('FREQ=WEEKLY')) {
    frequencyLabel = 'Weekly';
  } else if (rrule?.includes('FREQ=MONTHLY')) {
    frequencyLabel = 'Monthly';
  } else if (rrule?.includes('FREQ=YEARLY') || rrule?.includes('ANNUALLY')) {
    frequencyLabel = 'Annually';
  }

  return {
    isRecurring: true,
    badgeText: frequencyLabel,
    detailText: formattedDate ? `Kicks off ${formattedDate}` : frequencyLabel,
    frequencyLabel,
  };
}

