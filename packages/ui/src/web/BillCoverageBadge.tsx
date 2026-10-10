import React from 'react';
import { t } from '@money-matters/i18n';
import { Badge } from './Badge';

export interface BillCoverageBadgeProps {
  status: 'COVERED' | 'SHORT_BY' | 'NO_SCHEDULE';
  shortfallAmount?: string | number | null;
  className?: string;
}

export function BillCoverageBadge({
  status,
  shortfallAmount,
  className = '',
}: BillCoverageBadgeProps) {
  if (status === 'COVERED') {
    return (
      <Badge variant="success" className={className}>
        {t('billCoverage.covered')}
      </Badge>
    );
  }

  if (status === 'SHORT_BY') {
    const formatted = shortfallAmount != null ? `$${shortfallAmount}` : '$0.00';
    return (
      <Badge variant="danger" className={className}>
        {t('billCoverage.shortBy', { amount: formatted })}
      </Badge>
    );
  }

  return (
    <Badge variant="warning" className={className}>
      {t('billCoverage.noSchedule')}
    </Badge>
  );
}
