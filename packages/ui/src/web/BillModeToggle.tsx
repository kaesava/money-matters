import React from 'react';
import { t } from '@money-matters/i18n';
import { FormLabel } from './FormLabel';
import { InfoTooltip } from './InfoTooltip';
import { Calendar, Sliders } from 'lucide-react';

export interface BillModeToggleProps {
  value: 'RECURRING' | 'TARGET_BALANCE';
  onChange: (mode: 'RECURRING' | 'TARGET_BALANCE') => void;
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
        <FormLabel className="!mb-0">{t('categories.fundingModeLabel')}</FormLabel>
        <InfoTooltip
          content={
            value === 'RECURRING'
              ? t('categories.fundingModeRecurringDesc')
              : t('categories.fundingModeTargetBalanceDesc')
          }
          align="left"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('RECURRING')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            value === 'RECURRING'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{t('categories.fundingModeRecurring')}</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('TARGET_BALANCE')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            value === 'TARGET_BALANCE'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4 shrink-0" />
          <span>{t('categories.fundingModeTargetBalance')}</span>
        </button>
      </div>
    </div>
  );
}

export default BillModeToggle;
