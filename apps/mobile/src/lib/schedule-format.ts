import { t } from '@money-matters/i18n';
import { fmtDate as uiFmtDate } from '@money-matters/ui';
import { getMobileLocaleConfig } from './format';

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
  const currentMobileLocaleConfig = getMobileLocaleConfig();
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
