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
    case 'BILL':
      return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' };
    case 'GOAL':
      return { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857' };
    case 'EVERYDAY':
    default:
      return { bg: '#FAF5FF', border: '#E9D5FF', text: '#7E22CE' };
  }
}

export function getEnvelopeBadgeInfo(envelope: MobileEnvelopeOption) {
  const rawType = envelope.envelopeType || envelope.poolType || '';
  const fundingMode = envelope.fundingMode;

  if (rawType === 'EVERYDAY') return { label: t('categories.everydayBadge'), tagKey: 'EVERYDAY' };
  if (rawType === 'BILL') {
    const isTargetBalance = fundingMode === 'TARGET_BALANCE';
    return {
      label: isTargetBalance ? t('categories.targetBalanceBadge') : t('categories.recurringBadge'),
      tagKey: 'BILL',
    };
  }
  if (rawType === 'GOAL') {
    const isRecurring = fundingMode === 'RECURRING';
    return {
      label: isRecurring ? t('categories.recurringBadge') : t('categories.targetBalanceBadge'),
      tagKey: 'GOAL',
    };
  }
  return { label: t('categories.everydayBadge'), tagKey: 'EVERYDAY' };
}
