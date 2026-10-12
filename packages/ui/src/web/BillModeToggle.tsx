import React from 'react';
import { t } from '@money-matters/i18n';
import { FormLabel } from './FormLabel';
import { InfoTooltip } from './InfoTooltip';
import { Calendar, Sliders } from 'lucide-react';

export interface BillModeToggleProps {
  value: 'SCHEDULED_BILL' | 'FLEXIBLE_BILL';
  onChange: (mode: 'SCHEDULED_BILL' | 'FLEXIBLE_BILL') => void;
  disabled?: boolean;
}

export function BillModeToggle({
  value,
  onChange,
  disabled = false,
}: BillModeToggleProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <FormLabel className="!mb-0">{t('categories.billModeLabel')}</FormLabel>
        <InfoTooltip
          content={
            value === 'SCHEDULED_BILL'
              ? t('categories.tooltips.scheduledBill')
              : t('categories.tooltips.flexibleBill')
          }
          align="left"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('SCHEDULED_BILL')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            value === 'SCHEDULED_BILL'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{t('categories.billModeScheduled')}</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('FLEXIBLE_BILL')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            value === 'FLEXIBLE_BILL'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4 shrink-0" />
          <span>{t('categories.billModeFlexible')}</span>
        </button>
      </div>
    </div>
  );
}

export default BillModeToggle;
