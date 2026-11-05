import React from 'react';
import { t } from '@money-matters/i18n';
import { Badge, BadgeProps } from './Badge';
import { useCurrencyLocale } from '../hooks/CurrencyLocaleContext';
import { formatCurrency } from '../lib/format';

export interface MobileBillCoverageBadgeProps {
  status: 'COVERED' | 'SHORT_BY' | 'NO_SCHEDULE';
  shortfallAmount?: string | number | null;
  style?: BadgeProps['style'];
}

export function MobileBillCoverageBadge({
  status,
  shortfallAmount,
  style,
}: MobileBillCoverageBadgeProps) {
  const { locale, currency } = useCurrencyLocale();

  if (status === 'COVERED') {
    return (
      <Badge variant="success" style={style}>
        {t('billCoverage.covered')}
      </Badge>
    );
  }

  if (status === 'SHORT_BY') {
    const formatted = formatCurrency(shortfallAmount ?? 0, locale, currency);
    return (
      <Badge variant="danger" style={style}>
        {t('billCoverage.shortBy', { amount: formatted })}
      </Badge>
    );
  }

  return (
    <Badge variant="warning" style={style}>
      {t('billCoverage.noSchedule')}
    </Badge>
  );
}
