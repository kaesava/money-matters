import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  DESIGN_TOKENS,
  MobileInput,
  ChipSelect,
  FormLabel,
  AmountInput,
  MobileBillModeToggle,
  MobileCheckbox,
  RecurrenceFrequency,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { EnvelopeRecurrenceFields } from './EnvelopeRecurrenceFields';
import { EnvelopeEventsToggleSection } from './EnvelopeEventsToggleSection';
import { EnvelopeSurplusTargetField } from './EnvelopeSurplusTargetField';
import { EnvelopeGoalFields } from './EnvelopeGoalFields';

export interface EnvelopeFormFieldsProps {
  name: string; setName: (v: string) => void;
  nameError: string; setNameError: (v: string) => void;
  type: 'GOAL' | 'REGULAR' | 'EVERYDAY'; setType: (v: 'GOAL' | 'REGULAR' | 'EVERYDAY') => void;
  safetyBufferFloor: string; setSafetyBufferFloor: (v: string) => void;
  targetAmount: string; setTargetAmount: (v: string) => void;
  targetDate: string; setTargetDate: (v: string) => void;
  goalMode?: 'TARGET_DATE' | 'ONGOING'; setGoalMode?: (v: 'TARGET_DATE' | 'ONGOING') => void;
  billMode?: 'SCHEDULED_BILL' | 'FLEXIBLE_BILL'; setBillMode?: (v: 'SCHEDULED_BILL' | 'FLEXIBLE_BILL') => void;
  frequency?: RecurrenceFrequency; setFrequency?: (v: RecurrenceFrequency) => void;
  interval?: number; setInterval?: (v: number) => void;
  goalStartDate?: string; setGoalStartDate?: (v: string) => void;
  endDate?: string; setEndDate?: (v: string) => void;
  calculatedMonthly?: string;
  bankAccountId: string; setBankAccountId: (v: string) => void;
  bankDisabled?: boolean;
  isSurplusTarget: boolean; setIsSurplusTarget: (v: boolean) => void;
  isEssential?: boolean; setIsEssential?: (v: boolean) => void;
  isCommitted?: boolean; setIsCommitted?: (v: boolean) => void;
  isEdit: boolean;
  isSurplusDisabled: boolean;
  hideTypeOptions?: boolean;
  hideBillModeToggle?: boolean;
  generateEvents?: boolean; setGenerateEvents?: (v: boolean) => void;
  initialGenerateEvents?: boolean;
  hasExistingScheduledEvents?: boolean;
  typeOptions: Array<{ key: string; label: string }>;
  bankOptions: Array<{ key: string; label: string }>;
  isTargetDateInPast?: boolean;
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
  isEssential = false,
  setIsEssential,
  isCommitted = false,
  setIsCommitted,
  isEdit,
  isSurplusDisabled,
  hideTypeOptions = false,
  hideBillModeToggle = false,
  generateEvents = true,
  setGenerateEvents,
  initialGenerateEvents = true,
  hasExistingScheduledEvents = false,
  typeOptions,
  bankOptions,
  isTargetDateInPast = false,
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

      {!hideTypeOptions && (
        <View style={styles.formGroup}>
          <FormLabel required>{t('categories.poolTypeLabel')}</FormLabel>
          <ChipSelect
            options={typeOptions}
            value={type}
            onChange={(val) => setType(val as 'GOAL' | 'REGULAR' | 'EVERYDAY')}
            disabled={isEdit}
          />
        </View>
      )}

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
          {setBillMode && !hideBillModeToggle && (
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

          {setIsEssential && (
            <View style={styles.checkboxContainer}>
              <MobileCheckbox
                checked={Boolean(isEssential)}
                onChange={setIsEssential}
                label={t('categories.essentialBillLabel')}
              />
              <Text style={styles.checkboxHint}>{t('categories.essentialBillHint')}</Text>
            </View>
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
        <View style={styles.goalSection}>
          <EnvelopeGoalFields
            goalMode={goalMode}
            setGoalMode={setGoalMode}
            targetAmount={targetAmount}
            setTargetAmount={setTargetAmount}
            targetDate={targetDate}
            setTargetDate={setTargetDate}
            isTargetDateInPast={isTargetDateInPast}
            frequency={frequency}
            setFrequency={setFrequency}
            interval={interval}
            setInterval={setInterval}
            goalStartDate={goalStartDate}
            setGoalStartDate={setGoalStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            calculatedMonthly={calculatedMonthly}
          />

          {setIsCommitted && (
            <View style={styles.checkboxContainer}>
              <MobileCheckbox
                checked={Boolean(isCommitted)}
                onChange={setIsCommitted}
                label={t('categories.committedGoalLabel')}
              />
              <Text style={styles.checkboxHint}>{t('categories.committedGoalHint')}</Text>
            </View>
          )}
        </View>
      )}

      {type !== 'EVERYDAY' && (
        <EnvelopeSurplusTargetField
          isSurplusTarget={isSurplusTarget}
          setIsSurplusTarget={setIsSurplusTarget}
          isSurplusDisabled={isSurplusDisabled}
        />
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
  billSection: {
    gap: 12,
  },
  goalSection: {
    gap: 12,
  },
  checkboxContainer: {
    paddingTop: 4,
    gap: 2,
  },
  checkboxHint: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.subtleText,
    paddingLeft: 30,
  },
});

export const CategoryFormFields = EnvelopeFormFields;
