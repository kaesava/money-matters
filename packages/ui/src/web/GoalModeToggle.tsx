import React from 'react';
import { t } from '@money-matters/i18n';
import { FormLabel } from './FormLabel';
import { InfoTooltip } from './InfoTooltip';
import { Calendar, Repeat } from 'lucide-react';

export interface GoalModeToggleProps {
  value: 'TARGET_DATE' | 'ONGOING';
  onChange: (mode: 'TARGET_DATE' | 'ONGOING') => void;
  disabled?: boolean;
}

export function GoalModeToggle({
  value,
  onChange,
  disabled = false,
}: GoalModeToggleProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <FormLabel className="!mb-0">{t('goalModes.modeLabel')}</FormLabel>
        <InfoTooltip
          content={
            value === 'TARGET_DATE'
              ? t('goalModes.targetDateDesc')
              : t('goalModes.ongoingDesc')
          }
          align="left"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('TARGET_DATE')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            value === 'TARGET_DATE'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{t('goalModes.targetDate')}</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange('ONGOING')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            value === 'ONGOING'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
          }`}
        >
          <Repeat className="w-4 h-4 shrink-0" />
          <span>{t('goalModes.ongoing')}</span>
        </button>
      </div>
    </div>
  );
}
