import { t } from '@money-matters/i18n';
import type { MobileEnvelopeOption } from './MobileEnvelopePickerItem';

export function formatPoolBalance(
  val?: string | number | null,
  currencySymbol = '$',
  locale = 'en-AU'
): string | null {
  if (val === undefined || val === null || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return null;
  return `${currencySymbol}${num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getBadgeStyle(tagKey: string) {
  switch (tagKey) {
    case 'SCHEDULED_BILL':
      return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' };
    case 'FLEXIBLE_BILL':
      return { bg: '#F0F9FF', border: '#BAE6FD', text: '#0369A1' };
    case 'TARGET_GOAL':
      return { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857' };
    case 'ONGOING_GOAL':
      return { bg: '#F0FDFA', border: '#99F6E4', text: '#0F766E' };
    case 'EVERYDAY':
    default:
      return { bg: '#FAF5FF', border: '#E9D5FF', text: '#7E22CE' };
  }
}

export function getEnvelopeBadgeInfo(envelope: MobileEnvelopeOption) {
  const rawType = envelope.envelopeType || envelope.poolType || '';
  if (rawType === 'EVERYDAY') return { label: t('categories.everydayBadge'), tagKey: 'EVERYDAY' };
  if (rawType === 'FLEXIBLE_BILL') return { label: t('categories.flexibleBillBadge'), tagKey: 'FLEXIBLE_BILL' };
  if (rawType === 'SCHEDULED_BILL' || rawType === 'REGULAR') return { label: t('categories.scheduledBillBadge'), tagKey: 'SCHEDULED_BILL' };
  if (rawType === 'ONGOING_GOAL' || envelope.goalMode === 'ONGOING') return { label: t('categories.ongoingGoalBadge'), tagKey: 'ONGOING_GOAL' };
  if (rawType === 'TARGET_GOAL' || rawType === 'GOAL' || rawType.includes('GOAL')) return { label: t('categories.targetDateGoalBadge'), tagKey: 'TARGET_GOAL' };
  return { label: t('categories.everydayBadge'), tagKey: 'EVERYDAY' };
}
