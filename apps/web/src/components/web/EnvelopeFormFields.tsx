import React from 'react';
import {
  Input,
  FormLabel,
  GenericSelectField,
  DatePickerField,
  AmountField,
  GoalModeToggle,
  BillModeToggle,
} from '@money-matters/ui/web';
import { t } from '@money-matters/i18n';
import { EnvelopeRecurrenceFields } from './EnvelopeRecurrenceFields';
import { EnvelopeEventsToggleSection } from './EnvelopeEventsToggleSection';
import { EnvelopeSurplusTargetField } from './EnvelopeSurplusTargetField';

export interface EnvelopeFormFieldsProps {
  name: string;
  setName: (val: string) => void;
  type: 'EVERYDAY' | 'REGULAR' | 'GOAL';
  setType: (val: 'EVERYDAY' | 'REGULAR' | 'GOAL') => void;
  billMode?: 'SCHEDULED_BILL' | 'FLEXIBLE_BILL';
  setBillMode?: (val: 'SCHEDULED_BILL' | 'FLEXIBLE_BILL') => void;
  bankAccountId: string;
  setBankAccountId: (val: string) => void;
  bankAccountDisabled?: boolean;
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
  frequency?: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  setFrequency?: (val: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY') => void;
  interval?: number;
  setInterval?: (val: number) => void;
  goalStartDate?: string;
  setGoalStartDate?: (val: string) => void;
  calculatedMonthly?: string;
  isSurplusTarget: boolean;
  setIsSurplusTarget: (val: boolean) => void;
  isSurplusDisabled: boolean;
  isEssential?: boolean;
  setIsEssential?: (val: boolean) => void;
  isCommitted?: boolean;
  setIsCommitted?: (val: boolean) => void;
  generateEvents?: boolean;
  setGenerateEvents?: (val: boolean) => void;
  initialGenerateEvents?: boolean;
  hasExistingScheduledEvents?: boolean;
  initialMode?: 'ALL' | 'BILL_SCHEDULE';
  isTargetDateInPast?: boolean;
}

export type CategoryFormFieldsProps = EnvelopeFormFieldsProps;

export function EnvelopeFormFields({
  name,
  setName,
  type,
  setType,
  billMode = 'SCHEDULED_BILL',
  setBillMode,
  bankAccountId,
  setBankAccountId,
  bankAccountDisabled,
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
  isEssential = false,
  setIsEssential,
  isCommitted = false,
  setIsCommitted,
  generateEvents = true,
  setGenerateEvents,
  initialGenerateEvents = true,
  hasExistingScheduledEvents = false,
  initialMode = 'ALL',
  isTargetDateInPast = false,
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

      {initialMode !== 'BILL_SCHEDULE' && (
        <div className="flex flex-col gap-1.5">
          <FormLabel required>{t('categories.poolTypeLabel')}</FormLabel>
          <div className="flex items-center gap-2">
            {poolTypeOptions.map((opt) => {
              const isSelected = type === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isEdit}
                  onClick={() => setType(opt.value as 'EVERYDAY' | 'REGULAR' | 'GOAL')}
                  className={`py-2 px-3.5 text-xs font-bold rounded-xl transition-all border ${
                    isSelected
                      ? 'bg-[#2563eb] text-white border-[#2563eb] shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:text-zinc-900'
                  } ${isEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <GenericSelectField
        label={t('categories.linkedAccountLabel')}
        value={bankAccountId}
        onChange={setBankAccountId}
        options={bankAccountOptions}
        disabled={isEdit || Boolean(bankAccountDisabled)}
        required={!isEdit}
      />

      {isEdit && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed font-semibold">
          {t('categories.immutabilityWarning')}
        </div>
      )}

      {type === 'REGULAR' && (
        <div className="space-y-3">
          {setBillMode && initialMode !== 'BILL_SCHEDULE' && (
            <BillModeToggle
              value={billMode}
              onChange={setBillMode}
            />
          )}

          {billMode === 'FLEXIBLE_BILL' ? (
            <AmountField
              label={t('categories.flexibleTargetAmountLabel')}
              required
              value={targetAmount}
              onChange={setTargetAmount}
              placeholder="150.00"
            />
          ) : (
            <EnvelopeRecurrenceFields
              amountLabel={t('categories.billAmountLabel')}
              amount={targetAmount}
              setAmount={setTargetAmount}
              placeholder="120.00"
              frequency={frequency}
              setFrequency={setFrequency}
              interval={interval}
              setInterval={setInterval}
              startDate={goalStartDate}
              setStartDate={setGoalStartDate}
              endDate={targetDate}
              setEndDate={setTargetDate}
              calculatedMonthly={calculatedMonthly}
            />
          )}

          {setIsEssential && (
            <div className="pt-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(isEssential)}
                  onChange={(e) => setIsEssential(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-[#2563eb] focus:ring-[#2563eb]"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-zinc-800">{t('categories.essentialBillLabel')}</span>
                  <span className="text-[11px] text-zinc-500 font-normal">{t('categories.essentialBillHint')}</span>
                </div>
              </label>
            </div>
          )}

          {billMode === 'SCHEDULED_BILL' && setGenerateEvents && (
            <EnvelopeEventsToggleSection
              generateEvents={generateEvents}
              setGenerateEvents={setGenerateEvents}
              initialGenerateEvents={initialGenerateEvents}
              hasExistingScheduledEvents={hasExistingScheduledEvents}
              isEdit={isEdit}
            />
          )}
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
            <div className="space-y-2">
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
              {isTargetDateInPast && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-xs">
                  {t('categories.targetDateInPastWarning')}
                </div>
              )}
            </div>
          ) : (
            <EnvelopeRecurrenceFields
              amountLabel={t('goalModes.monthlyContribution')}
              amount={targetAmount}
              setAmount={setTargetAmount}
              placeholder="250.00"
              frequency={frequency}
              setFrequency={setFrequency}
              interval={interval}
              setInterval={setInterval}
              startDate={goalStartDate}
              setStartDate={setGoalStartDate}
              endDate={targetDate}
              setEndDate={setTargetDate}
              calculatedMonthly={calculatedMonthly}
            />
          )}

          {setIsCommitted && (
            <div className="pt-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(isCommitted)}
                  onChange={(e) => setIsCommitted(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-[#2563eb] focus:ring-[#2563eb]"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-zinc-800">{t('categories.committedGoalLabel')}</span>
                  <span className="text-[11px] text-zinc-500 font-normal">{t('categories.committedGoalHint')}</span>
                </div>
              </label>
            </div>
          )}
        </>
      )}

      {type !== 'EVERYDAY' && (
        <EnvelopeSurplusTargetField
          isSurplusTarget={isSurplusTarget}
          setIsSurplusTarget={setIsSurplusTarget}
          isSurplusDisabled={isSurplusDisabled}
        />
      )}
    </>
  );
}

export const CategoryFormFields = EnvelopeFormFields;
