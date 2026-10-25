import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  DESIGN_TOKENS,
  MobileInput,
  ChipSelect,
  FormLabel,
  AmountInput,
  DatePickerField,
  MobileCheckbox,
  MobileGoalModeToggle,
  MobileBillModeToggle,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { EnvelopeRecurrenceFields } from './EnvelopeRecurrenceFields';

export interface EnvelopeFormFieldsProps {
  name: string;
  setName: (v: string) => void;
  nameError: string;
  setNameError: (v: string) => void;
  type: 'GOAL' | 'REGULAR' | 'EVERYDAY';
  setType: (v: 'GOAL' | 'REGULAR' | 'EVERYDAY') => void;
  safetyBufferFloor: string;
  setSafetyBufferFloor: (v: string) => void;
  targetAmount: string;
  setTargetAmount: (v: string) => void;
  targetDate: string;
  setTargetDate: (v: string) => void;
  goalMode?: 'TARGET_DATE' | 'ONGOING';
  setGoalMode?: (v: 'TARGET_DATE' | 'ONGOING') => void;
  billMode?: 'SCHEDULED_BILL' | 'FLEXIBLE_BILL';
  setBillMode?: (v: 'SCHEDULED_BILL' | 'FLEXIBLE_BILL') => void;
  frequency?: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY';
  setFrequency?: (v: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY') => void;
  interval?: number;
  setInterval?: (v: number) => void;
  goalStartDate?: string;
  setGoalStartDate?: (v: string) => void;
  endDate?: string;
  setEndDate?: (v: string) => void;
  calculatedMonthly?: string;
  bankAccountId: string;
  setBankAccountId: (v: string) => void;
  bankDisabled?: boolean;
  isSurplusTarget: boolean;
  setIsSurplusTarget: (v: boolean) => void;
  isEdit: boolean;
  isSurplusDisabled: boolean;
  typeOptions: Array<{ key: string; label: string }>;
  bankOptions: Array<{ key: string; label: string }>;
}

export type CategoryFormFieldsProps = EnvelopeFormFieldsProps;

export const EnvelopeFormFields: React.FC<EnvelopeFormFieldsProps> = ({
  name,
  setName,
  nameError,
  setNameError,
  type,
  setType,
  safetyBufferFloor,
  setSafetyBufferFloor,
  targetAmount,
  setTargetAmount,
  targetDate,
  setTargetDate,
  goalMode = 'TARGET_DATE',
  setGoalMode,
  billMode = 'SCHEDULED_BILL',
  setBillMode,
  frequency = 'MONTHLY',
  setFrequency,
  interval = 1,
  setInterval,
  goalStartDate = '',
  setGoalStartDate,
  endDate = '',
  setEndDate,
  calculatedMonthly = '0.00',
  bankAccountId,
  setBankAccountId,
  bankDisabled = false,
  isSurplusTarget,
  setIsSurplusTarget,
  isEdit,
  isSurplusDisabled,
  typeOptions,
  bankOptions,
}) => {
  return (
    <View style={styles.content}>
      <MobileInput
        label={t('categories.poolNameLabel')}
        required
        value={name}
        onChangeText={(val) => {
          setName(val);
          if (nameError) setNameError('');
        }}
        placeholder={t('categories.placeholderPoolName')}
        error={nameError}
        autoFocus={!isEdit}
      />

      <View style={styles.formGroup}>
        <FormLabel required>{t('categories.poolTypeLabel')}</FormLabel>
        <ChipSelect
          options={typeOptions}
          value={type}
          onChange={(val) => setType(val as 'GOAL' | 'REGULAR' | 'EVERYDAY')}
          disabled={isEdit}
        />
      </View>

      <View style={styles.formGroup}>
        <FormLabel required={!isEdit}>{t('categories.linkedAccountLabel')}</FormLabel>
        <ChipSelect
          options={bankOptions}
          value={bankAccountId}
          onChange={setBankAccountId}
          disabled={isEdit || bankDisabled}
        />
      </View>

      {isEdit && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {t('categories.immutabilityWarning')}
          </Text>
        </View>
      )}

      {type === 'REGULAR' && (
        <View style={styles.billSection}>
          {setBillMode && (
            <MobileBillModeToggle
              value={billMode}
              onChange={setBillMode}
            />
          )}

          {billMode === 'FLEXIBLE_BILL' ? (
            <AmountInput
              label={t('categories.flexibleTargetAmountLabel')}
              required
              value={targetAmount}
              onChangeText={setTargetAmount}
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
              endDate={endDate}
              setEndDate={setEndDate}
              calculatedMonthly={calculatedMonthly}
            />
          )}
        </View>
      )}

      {type === 'EVERYDAY' && (
        <AmountInput
          label={t('categories.safetyBufferFloorLabel')}
          value={safetyBufferFloor}
          onChangeText={setSafetyBufferFloor}
          placeholder="0.00"
        />
      )}

      {type === 'GOAL' && (
        <>
          {setGoalMode && (
            <MobileGoalModeToggle value={goalMode} onChange={setGoalMode} />
          )}

          {goalMode === 'TARGET_DATE' ? (
            <View style={styles.goalInputsCol}>
              <AmountInput
                label={t('categories.targetAmountLabel')}
                required
                value={targetAmount}
                onChangeText={setTargetAmount}
                placeholder="10000.00"
              />
              <DatePickerField
                label={t('categories.targetCompletionDate')}
                required
                value={targetDate}
                onChange={setTargetDate}
              />
            </View>
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
              calculatedMonthly={calculatedMonthly}
            />
          )}
        </>
      )}

      {type !== 'EVERYDAY' && (
        <View style={styles.surplusRow}>
          <MobileCheckbox
            checked={isSurplusTarget}
            onChange={setIsSurplusTarget}
            disabled={isSurplusDisabled}
            label={t('categories.sweepSurplus')}
          />
          {isSurplusDisabled && (
            <Text style={styles.surplusDisabledText}>
              {t('categories.shortfallTargetDisabledWarning')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 14,
  },
  formGroup: {
    gap: 4,
  },
  warningBox: {
    padding: 12,
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.warningBorder,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.warningDark,
    lineHeight: 16,
  },
  surplusRow: {
    paddingTop: 4,
    gap: 4,
  },
  surplusDisabledText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.subtleText,
    paddingLeft: 30,
  },
  goalInputsCol: {
    gap: 12,
  },
  billSection: {
    gap: 12,
  },
});

export const CategoryFormFields = EnvelopeFormFields;
