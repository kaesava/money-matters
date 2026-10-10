import React from 'react';
import { Input, GenericSelectField, DatePickerField, AmountField, InfoTooltip, GoalModeToggle } from '@money-matters/ui/web';
import { t } from '@money-matters/i18n';

export interface CategoryFormFieldsProps {
  name: string;
  setName: (val: string) => void;
  type: 'EVERYDAY' | 'REGULAR' | 'GOAL';
  setType: (val: 'EVERYDAY' | 'REGULAR' | 'GOAL') => void;
  bankAccountId: string;
  setBankAccountId: (val: string) => void;
  bankAccountOptions: Array<{ value: string; label: string }>;
  poolTypeOptions: Array<{ value: string; label: string }>;
  isEdit: boolean;
  safetyBufferFloor: string;
  setSafetyBufferFloor: (val: string) => void;
  targetAmount: string;
  setTargetAmount: (val: string) => void;
  targetDate: string;
  setTargetDate: (val: string) => void;
  goalMode: 'TARGET_DATE' | 'ONGOING';
  setGoalMode: (val: 'TARGET_DATE' | 'ONGOING') => void;
  frequency?: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY';
  setFrequency?: (val: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY') => void;
  interval?: number;
  setInterval?: (val: number) => void;
  goalStartDate?: string;
  setGoalStartDate?: (val: string) => void;
  calculatedMonthly?: string;
  isSurplusTarget: boolean;
  setIsSurplusTarget: (val: boolean) => void;
  isSurplusDisabled: boolean;
}

export function CategoryFormFields({
  name,
  setName,
  type,
  setType,
  bankAccountId,
  setBankAccountId,
  bankAccountOptions,
  poolTypeOptions,
  isEdit,
  safetyBufferFloor,
  setSafetyBufferFloor,
  targetAmount,
  setTargetAmount,
  targetDate,
  setTargetDate,
  goalMode,
  setGoalMode,
  frequency = 'MONTHLY',
  setFrequency,
  interval = 1,
  setInterval,
  goalStartDate = '',
  setGoalStartDate,
  calculatedMonthly = '0.00',
  isSurplusTarget,
  setIsSurplusTarget,
  isSurplusDisabled,
}: CategoryFormFieldsProps) {
  return (
    <>
      <Input
        label={t('categories.poolNameLabel')}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('categories.placeholderPoolName')}
        autoFocus
      />

      <GenericSelectField
        label={t('categories.poolTypeLabel')}
        value={type}
        onChange={(val) => setType(val as 'EVERYDAY' | 'REGULAR' | 'GOAL')}
        options={poolTypeOptions}
        disabled={isEdit}
        required
      />

      <GenericSelectField
        label={t('categories.linkedAccountLabel')}
        value={bankAccountId}
        onChange={setBankAccountId}
        options={bankAccountOptions}
        disabled={isEdit}
        required={!isEdit}
      />

      {isEdit && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed font-semibold">
          {t('categories.immutabilityWarning')}
        </div>
      )}

      {(type === 'REGULAR' || type === 'EVERYDAY') && (
        <div className="p-3 bg-slate-50 border border-zinc-200 rounded-xl text-zinc-600 text-[11px] leading-relaxed">
          <span className="font-bold text-[#1B2B4B] block mb-0.5">{t('categories.calculatedTarget')}</span>
          {t('categories.calculatedTargetNotice')}
        </div>
      )}

      {type === 'EVERYDAY' && (
        <AmountField
          label={t('categories.safetyBufferFloorLabel')}
          value={safetyBufferFloor}
          onChange={setSafetyBufferFloor}
          placeholder="0.00"
        />
      )}

      {type === 'GOAL' && (
        <>
          <GoalModeToggle value={goalMode} onChange={setGoalMode} />

          {goalMode === 'TARGET_DATE' ? (
            <div className="grid grid-cols-2 gap-3 items-start">
              <AmountField
                label={t('categories.targetAmountLabel')}
                required
                value={targetAmount}
                onChange={setTargetAmount}
                placeholder="10000.00"
              />
              <DatePickerField
                label={t('categories.targetCompletionDate')}
                required
                value={targetDate}
                onChange={setTargetDate}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 items-start">
                <AmountField
                  label={t('goalModes.monthlyContribution')}
                  required
                  value={targetAmount}
                  onChange={setTargetAmount}
                  placeholder="250.00"
                />
                <GenericSelectField
                  label={t('categories.frequencyLabel')}
                  value={frequency}
                  onChange={(val) => setFrequency?.(val as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY')}
                  options={[
                    { value: 'WEEKLY', label: t('categories.frequencyWeekly') },
                    { value: 'FORTNIGHTLY', label: t('categories.frequencyFortnightly') },
                    { value: 'MONTHLY', label: t('categories.frequencyMonthly') },
                    { value: 'ANNUALLY', label: t('categories.frequencyAnnually') },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-start">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    {t('forms.every')}
                  </label>
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
                      className="px-4 py-2.5 text-xs font-bold rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] text-zinc-900 w-full"
                    />
                    <span className="text-xs font-bold text-zinc-500 shrink-0">
                      {frequency === 'WEEKLY'
                        ? t('forms.weeks')
                        : frequency === 'FORTNIGHTLY'
                        ? t('forms.fortnights')
                        : frequency === 'MONTHLY'
                        ? t('forms.months')
                        : t('forms.years')}
                    </span>
                  </div>
                </div>

                <DatePickerField
                  label={t('forms.firstDate')}
                  value={goalStartDate}
                  onChange={(val) => setGoalStartDate?.(val)}
                />
              </div>

              {targetAmount && parseFloat(targetAmount) > 0 && (frequency !== 'MONTHLY' || interval > 1) && (
                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] font-semibold text-blue-900 flex items-center justify-between font-mono">
                  <span>{t('categories.monthlyEquivalent')}</span>
                  <span className="font-bold text-[#2563eb]">${calculatedMonthly} / mo</span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {type !== 'EVERYDAY' && (
        <div className="pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSurplusTarget}
              disabled={isSurplusDisabled}
              onChange={(e) => setIsSurplusTarget(e.target.checked)}
              className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb] disabled:opacity-50"
            />
            <span className="font-bold text-zinc-800 flex items-center gap-1.5">
              <span>{t('categories.sweepSurplus')}</span>
              <InfoTooltip content={t('categories.shortfallTargetTooltip')} align="left" />
            </span>
          </label>
        </div>
      )}
    </>
  );
}
