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

          <AmountField
            label={goalMode === 'ONGOING' ? t('goalModes.monthlyContribution') : t('categories.targetAmountLabel')}
            required
            value={targetAmount}
            onChange={setTargetAmount}
            placeholder={goalMode === 'ONGOING' ? '250.00' : '10000.00'}
          />

          {goalMode === 'TARGET_DATE' && (
            <DatePickerField
              label={t('categories.targetCompletionDate')}
              required
              value={targetDate}
              onChange={setTargetDate}
            />
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
