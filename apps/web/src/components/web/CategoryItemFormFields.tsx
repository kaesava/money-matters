import React from 'react';
import { Input, GenericSelectField, AmountField, InfoTooltip, DatePickerField } from '@money-matters/ui/web';
import { t } from '@money-matters/i18n';

export type FrequencyOption = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY';

export interface CategoryItemFormFieldsProps {
  name: string;
  setName: (val: string) => void;
  selectedPoolId: string;
  setSelectedPoolId: (val: string) => void;
  availablePools: Array<{ id: string; name: string; poolType: string }>;
  isEdit: boolean;
  isBillsPool: boolean;
  enteredAmount: string;
  setEnteredAmount: (val: string) => void;
  frequency: FrequencyOption;
  setFrequency: (val: FrequencyOption) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  calculatedMonthly: string;
  isEssential: boolean;
  setIsEssential: (val: boolean) => void;
}

export function CategoryItemFormFields({
  name,
  setName,
  selectedPoolId,
  setSelectedPoolId,
  availablePools,
  isEdit,
  isBillsPool,
  enteredAmount,
  setEnteredAmount,
  frequency,
  setFrequency,
  startDate,
  setStartDate,
  calculatedMonthly,
  isEssential,
  setIsEssential,
}: CategoryItemFormFieldsProps) {
  return (
    <>
      <Input
        label={t('categories.nameLabel')}
        required
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Groceries, Electricity, Fuel"
      />

      <GenericSelectField
        label={t('categories.targetPoolLabel')}
        required
        disabled={isEdit}
        value={selectedPoolId}
        onChange={setSelectedPoolId}
        placeholder={t('categories.selectPool')}
        options={availablePools.map((p) => ({
          value: p.id,
          label: `${p.name} (${p.poolType === 'EVERYDAY' ? 'Everyday' : 'Bills'})`,
        }))}
      />

      {isEdit && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed font-semibold">
          {t('categories.immutabilityWarningCategory')}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 items-start">
        <div>
          <AmountField
            label={t('categories.targetAmountLabel')}
            required
            value={enteredAmount}
            onChange={setEnteredAmount}
            placeholder="150.00"
          />
        </div>
        <div>
          <GenericSelectField
            label={t('categories.frequencyLabel')}
            value={frequency}
            onChange={(val) => setFrequency(val as FrequencyOption)}
            options={[
              { value: 'WEEKLY', label: t('categories.frequencyWeekly') },
              { value: 'FORTNIGHTLY', label: t('categories.frequencyFortnightly') },
              { value: 'MONTHLY', label: t('categories.frequencyMonthly') },
              { value: 'ANNUALLY', label: t('categories.frequencyAnnually') },
            ]}
          />
        </div>
      </div>

      {isBillsPool && (
        <DatePickerField
          label={t('categories.nextDueDateLabel')}
          hint={t('categories.nextDueDateHint')}
          required
          value={startDate}
          onChange={setStartDate}
        />
      )}

      {enteredAmount && parseFloat(enteredAmount) > 0 && frequency !== 'MONTHLY' && (
        <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] font-semibold text-blue-900 flex items-center justify-between font-mono">
          <span>{t('categories.monthlyEquivalent')}</span>
          <span className="font-bold text-[#2563eb]">${calculatedMonthly} / mo</span>
        </div>
      )}

      <label className="flex items-center gap-2 pt-1 cursor-pointer">
        <input
          type="checkbox"
          checked={isEssential}
          onChange={(e) => setIsEssential(e.target.checked)}
          className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb]"
        />
        <span className="font-bold text-zinc-800 flex items-center gap-1.5">
          <span>{t('categories.prioritiseCategory')}</span>
          <InfoTooltip
            title={t('categories.prioritiseCategory')}
            content={t('categories.priorityCategoryInfo')}
          />
        </span>
      </label>
    </>
  );
}
