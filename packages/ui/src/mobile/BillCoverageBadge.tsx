import React from 'react';
import { t } from '@money-matters/i18n';
import { Badge, BadgeProps } from './Badge';

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
  if (status === 'COVERED') {
    return (
      <Badge variant="success" style={style}>
        {t('billCoverage.covered')}
      </Badge>
    );
  }

  if (status === 'SHORT_BY') {
    const formatted = shortfallAmount != null ? `$${shortfallAmount}` : '$0.00';
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
