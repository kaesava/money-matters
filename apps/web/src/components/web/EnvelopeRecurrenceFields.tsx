import React from 'react';
import { AmountField, GenericSelectField, DatePickerField, FormLabel } from '@money-matters/ui/web';
import { t } from '@money-matters/i18n';

export interface EnvelopeRecurrenceFieldsProps {
  amountLabel: string;
  amount: string;
  setAmount: (val: string) => void;
  placeholder?: string;
  frequency: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY';
  setFrequency?: (val: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY') => void;
  interval: number;
  setInterval?: (val: number) => void;
  startDate: string;
  setStartDate?: (val: string) => void;
  endDate?: string;
  setEndDate?: (val: string) => void;
  calculatedMonthly: string;
}

export function EnvelopeRecurrenceFields({
  amountLabel,
  amount,
  setAmount,
  placeholder = '100.00',
  frequency,
  setFrequency,
  interval,
  setInterval,
  startDate,
  setStartDate,
  endDate = '',
  setEndDate,
  calculatedMonthly,
}: EnvelopeRecurrenceFieldsProps) {
  const frequencyOptions = [
    { value: 'WEEKLY', label: t('categories.frequencyWeekly') },
    { value: 'FORTNIGHTLY', label: t('categories.frequencyFortnightly') },
    { value: 'MONTHLY', label: t('categories.frequencyMonthly') },
    { value: 'ANNUALLY', label: t('categories.frequencyAnnually') },
  ];

  const unitLabel =
    frequency === 'WEEKLY'
      ? t('forms.weeks')
      : frequency === 'FORTNIGHTLY'
      ? t('forms.fortnights')
      : frequency === 'MONTHLY'
      ? t('forms.months')
      : t('forms.years');

  const showMonthlyEquiv =
    Boolean(amount && parseFloat(amount) > 0 && (frequency !== 'MONTHLY' || interval > 1));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 items-start">
        <AmountField
          label={amountLabel}
          required
          value={amount}
          onChange={setAmount}
          placeholder={placeholder}
        />
        <GenericSelectField
          label={t('categories.frequencyLabel')}
          value={frequency}
          onChange={(val) => setFrequency?.(val as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY')}
          options={frequencyOptions}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_1fr] gap-3 items-start">
        <div className="flex flex-col gap-1">
          <FormLabel required>{t('forms.every')}</FormLabel>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="365"
              value={interval === 0 ? '' : interval}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setInterval?.(0);
                } else {
                  const parsed = parseInt(val, 10);
                  if (!isNaN(parsed) && parsed >= 1) {
                    setInterval?.(Math.min(365, parsed));
                  }
                }
              }}
              onBlur={() => {
                if (interval === 0 || isNaN(interval)) {
                  setInterval?.(1);
                }
              }}
              className="ui-input w-16 px-2.5 py-2.5 text-xs font-bold text-center"
            />
            <span className="text-xs font-bold text-zinc-500 shrink-0">
              {unitLabel}
            </span>
          </div>
        </div>

        <DatePickerField
          label={t('forms.firstDate')}
          required
          value={startDate}
          onChange={(val) => setStartDate?.(val)}
        />
        <DatePickerField
          label={t('forms.endDate')}
          value={endDate}
          onChange={(val) => setEndDate?.(val)}
        />
      </div>

      {showMonthlyEquiv && (
        <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] font-semibold text-blue-900 flex items-center justify-between font-mono">
          <span>{t('categories.monthlyEquivalent')}</span>
          <span className="font-bold text-[#2563eb]">${calculatedMonthly} / mo</span>
        </div>
      )}
    </div>
  );
}
