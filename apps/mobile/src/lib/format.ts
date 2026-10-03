/**
 * Currency & Date Formatting Utility Suite
 * 
 * Provides dynamic currency formatting, localized date rendering,
 * and relative date labeling (Today, Yesterday) synchronized with active user locale preferences.
 */

import { t } from '@money-matters/i18n';
import {
  formatCurrency,
  getCurrencySymbol,
  fmtDate as uiFmtDate,
  fmtDateIso as uiFmtDateIso,
} from '@money-matters/ui';

export interface MobileLocaleConfig {
  locale: string;
  timezone: string;
  currency: string;
}

let currentMobileLocaleConfig: MobileLocaleConfig = {
  locale: 'en-AU',
  timezone: 'Australia/Sydney',
  currency: 'AUD',
};

export function setMobileLocaleConfig(cfg: Partial<MobileLocaleConfig>): void {
  currentMobileLocaleConfig = {
    ...currentMobileLocaleConfig,
    ...cfg,
  };
}

export function getMobileLocaleConfig(): MobileLocaleConfig {
  return currentMobileLocaleConfig;
}

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

/**
 * Formats a numeric value or numeric string as standard currency using active mobile locale/currency.
 */
export function formatAUD(
  value: number | string,
  currency?: string,
  locale?: string
): string {
  const c = currency || currentMobileLocaleConfig.currency;
  const l = locale || currentMobileLocaleConfig.locale;
  return formatCurrency(value, l, c);
}

/**
 * Formats a numeric value as compact currency (e.g. $1.5k).
 */
export function formatAUDCompact(
  value: number | string,
  currency?: string,
  locale?: string
): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const c = currency || currentMobileLocaleConfig.currency;
  const l = locale || currentMobileLocaleConfig.locale;
  const sym = getCurrencySymbol(l, c);
  if (isNaN(num)) return `${sym}0`;
  if (Math.abs(num) >= 1000) {
    return `${sym}${(num / 1000).toFixed(1)}k`;
  }
  return `${sym}${num.toFixed(0)}`;
}

/**
 * Returns a timezone-aware ISO date string (YYYY-MM-DD) avoiding off-by-one shifts.
 */
export function formatIsoDate(
  input?: string | Date | number | null,
  timeZone?: string
): string {
  const tz = timeZone || currentMobileLocaleConfig.timezone;
  return uiFmtDateIso(input, tz);
}

export { formatIsoDate as fmtDateIso };

/**
 * Formats a Date or date string into regional locale format.
 */
export function formatDate(
  date: string | Date | null | undefined,
  locale?: string,
  timeZone?: string
): string {
  if (!date) return '';
  const loc = locale || currentMobileLocaleConfig.locale;
  const tz = timeZone || currentMobileLocaleConfig.timezone;
  const formatted = uiFmtDate(date, tz, loc);
  return formatted === 'N/A' ? '' : formatted;
}

/**
 * Formats a Date into relative terms ('Today', 'Yesterday', or localized date).
 */
export function formatRelativeDate(
  date: string | Date | null | undefined,
  locale?: string,
  timeZone?: string
): string {
  if (!date) return '';
  const loc = locale || currentMobileLocaleConfig.locale;
  const tz = timeZone || currentMobileLocaleConfig.timezone;
  
  let d: Date;
  if (typeof date === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [year, month, day] = date.split('-').map(Number);
      d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    } else {
      d = new Date(date);
    }
  } else {
    d = date;
  }
  if (isNaN(d.getTime())) return '';
  
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return t('common.today');
  } else if (d.toDateString() === yesterday.toDateString()) {
    return t('common.yesterday');
  } else {
    return new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short', timeZone: tz }).format(d);
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

export function formatScheduleDetail(
  rrule?: string | null,
  startDate?: string | null,
  locale?: string,
  timeZone?: string
): ScheduleDetail {
  const loc = locale || currentMobileLocaleConfig.locale;
  const tz = timeZone || currentMobileLocaleConfig.timezone;
  const isRecurring = Boolean(rrule && rrule.trim().length > 0);

  let formattedDate: string | null = null;
  if (startDate) {
    const formatted = uiFmtDate(startDate, tz, loc);
    formattedDate = formatted === 'N/A' ? startDate : formatted;
  }

  if (!isRecurring) {
    const dateText = formattedDate || '';
    return {
      isRecurring: false,
      badgeText: 'One-off',
      detailText: dateText
        ? t('schedules.oneOffOn', { date: dateText })
        : 'One-off schedule',
      frequencyLabel: 'One-off',
    };
  }

  // Parse FREQ and INTERVAL from rrule (e.g. "FREQ=MONTHLY;INTERVAL=3")
  const freqMatch = rrule?.match(/FREQ=([A-Z]+)/);
  const intervalMatch = rrule?.match(/INTERVAL=(\d+)/);
  const freq = freqMatch ? freqMatch[1] : '';
  const interval = intervalMatch ? parseInt(intervalMatch[1], 10) : 1;

  const numberWordMap: Record<number, string> = {
    2: t('schedules.num2'),
    3: t('schedules.num3'),
    4: t('schedules.num4'),
    5: t('schedules.num5'),
    6: t('schedules.num6'),
    7: t('schedules.num7'),
    8: t('schedules.num8'),
    9: t('schedules.num9'),
    10: t('schedules.num10'),
    11: t('schedules.num11'),
    12: t('schedules.num12'),
  };

  const getIntervalWord = (n: number) => numberWordMap[n] || String(n);

  let frequencyLabel = 'Recurring';
  let detailText = '';
  const dateText = formattedDate || '';

  if (freq === 'DAILY') {
    frequencyLabel = 'Daily';
    if (!dateText) {
      detailText = frequencyLabel;
    } else if (interval > 1) {
      detailText = t('schedules.everyIntervalFrom', {
        interval: getIntervalWord(interval),
        unit: t('schedules.days'),
        date: dateText,
      });
    } else {
      detailText = t('schedules.everyUnitFrom', { unit: t('schedules.day'), date: dateText });
    }
  } else if (freq === 'WEEKLY') {
    if (interval === 2) {
      frequencyLabel = 'Fortnightly';
      detailText = dateText ? t('schedules.fortnightlyFrom', { date: dateText }) : frequencyLabel;
    } else if (interval > 1) {
      frequencyLabel = `Every ${interval} weeks`;
      detailText = dateText
        ? t('schedules.everyIntervalFrom', {
            interval: getIntervalWord(interval),
            unit: t('schedules.weeks'),
            date: dateText,
          })
        : frequencyLabel;
    } else {
      frequencyLabel = 'Weekly';
      detailText = dateText ? t('schedules.weeklyFrom', { date: dateText }) : frequencyLabel;
    }
  } else if (freq === 'MONTHLY') {
    if (interval > 1) {
      frequencyLabel = `Every ${interval} months`;
      detailText = dateText
        ? t('schedules.everyIntervalFrom', {
            interval: getIntervalWord(interval),
            unit: t('schedules.months'),
            date: dateText,
          })
        : frequencyLabel;
    } else {
      frequencyLabel = 'Monthly';
      detailText = dateText ? t('schedules.monthlyFrom', { date: dateText }) : frequencyLabel;
    }
  } else if (freq === 'YEARLY' || rrule?.includes('ANNUALLY')) {
    if (interval > 1) {
      frequencyLabel = `Every ${interval} years`;
      detailText = dateText
        ? t('schedules.everyIntervalFrom', {
            interval: getIntervalWord(interval),
            unit: t('schedules.years'),
            date: dateText,
          })
        : frequencyLabel;
    } else {
      frequencyLabel = 'Annually';
      detailText = dateText ? t('schedules.annuallyFrom', { date: dateText }) : frequencyLabel;
    }
  } else {
    detailText = formattedDate ? `from ${formattedDate}` : frequencyLabel;
  }

  return {
    isRecurring: true,
    badgeText: frequencyLabel,
    detailText: detailText.trim(),
    frequencyLabel,
  };
}

