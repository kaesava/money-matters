import { t } from '@money-matters/i18n';

export interface BurstSourceItem {
  id: string;
  name: string;
  amount: string | number;
  rrule?: string | null;
  startDate?: string | null;
  categoryName?: string;
  accountName?: string;
}

export interface BurstEventItem {
  id: string;
  expectedDate: string;
  expectedAmount: string;
  actualAmount?: string | null;
  status: string;
  incomeSourceId?: string | null;
  expenseSourceId?: string | null;
  name?: string | null;
  note?: string | null;
}

export function parseFrequencyLabel(rrule?: string | null): string {
  if (!rrule) return t('forms.oneOff');
  const r = rrule.toUpperCase();
  if (r.includes('FREQ=WEEKLY') && r.includes('INTERVAL=2')) return t('forms.fortnightly');
  if (r.includes('FREQ=WEEKLY')) return t('forms.weekly');
  if (r.includes('FREQ=MONTHLY')) return t('forms.monthly');
  if (r.includes('FREQ=YEARLY') || r.includes('ANNUALLY')) return t('forms.yearly');
  return t('forms.recurring');
}
