import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import {
  DESIGN_TOKENS,
  MobileInput,
  ChipSelect,
  FormLabel,
  AmountInput,
  DatePickerField,
  MobileCheckbox,
  MobileGoalModeToggle,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

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
  calculatedMonthly?: string;
  bankAccountId: string;
  setBankAccountId: (v: string) => void;
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
  calculatedMonthly = '0.00',
  bankAccountId,
  setBankAccountId,
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
          disabled={isEdit}
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
          <View style={styles.formGroup}>
            <FormLabel>{t('categories.billModeLabel')}</FormLabel>
            <ChipSelect
              options={[
                { key: 'SCHEDULED_BILL', label: t('categories.billModeScheduled') },
                { key: 'FLEXIBLE_BILL', label: t('categories.billModeFlexible') },
              ]}
              value={billMode}
              onChange={(val) => setBillMode?.(val as 'SCHEDULED_BILL' | 'FLEXIBLE_BILL')}
            />
            <Text style={styles.billModeDesc}>
              {billMode === 'SCHEDULED_BILL'
                ? t('categories.tooltips.scheduledBill')
                : t('categories.tooltips.flexibleBill')}
            </Text>
          </View>

          {billMode === 'FLEXIBLE_BILL' ? (
            <AmountInput
              label={t('categories.flexibleTargetAmountLabel')}
              required
              value={targetAmount}
              onChangeText={setTargetAmount}
              placeholder="150.00"
            />
          ) : (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>{t('categories.calculatedTarget')}</Text>
              <Text style={styles.noticeDesc}>{t('categories.calculatedTargetNotice')}</Text>
            </View>
          )}
        </View>
      )}

      {type === 'EVERYDAY' && (
        <>
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>{t('categories.calculatedTarget')}</Text>
            <Text style={styles.noticeDesc}>{t('categories.calculatedTargetNotice')}</Text>
          </View>
          <AmountInput
            label={t('categories.safetyBufferFloorLabel')}
            value={safetyBufferFloor}
            onChangeText={setSafetyBufferFloor}
            placeholder="0.00"
          />
        </>
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
            <View style={styles.goalInputsCol}>
              <AmountInput
                label={t('goalModes.monthlyContribution')}
                required
                value={targetAmount}
                onChangeText={setTargetAmount}
                placeholder="250.00"
              />

              <View style={styles.formGroup}>
                <FormLabel>{t('categories.frequencyLabel')}</FormLabel>
                <ChipSelect
                  options={[
                    { key: 'WEEKLY', label: t('categories.frequencyWeekly') },
                    { key: 'FORTNIGHTLY', label: t('categories.frequencyFortnightly') },
                    { key: 'MONTHLY', label: t('categories.frequencyMonthly') },
                    { key: 'ANNUALLY', label: t('categories.frequencyAnnually') },
                  ]}
                  value={frequency}
                  onChange={(val) => setFrequency?.(val as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY')}
                />
              </View>

              <View style={styles.formGroup}>
                <FormLabel>{t('forms.every')}</FormLabel>
                <View style={styles.intervalRow}>
                  <TextInput
                    style={styles.intervalInput}
                    keyboardType="numeric"
                    value={interval === 0 ? '' : String(interval)}
                    onChangeText={(val) => {
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
                  />
                  <Text style={styles.intervalUnit}>
                    {frequency === 'WEEKLY'
                      ? t('forms.weeks')
                      : frequency === 'FORTNIGHTLY'
                      ? t('forms.fortnights')
                      : frequency === 'MONTHLY'
                      ? t('forms.months')
                      : t('forms.years')}
                  </Text>
                </View>
              </View>

              <DatePickerField
                label={t('forms.firstDate')}
                value={goalStartDate}
                onChange={(val) => setGoalStartDate?.(val)}
              />

              {targetAmount && parseFloat(targetAmount) > 0 && (frequency !== 'MONTHLY' || interval > 1) && (
                <View style={styles.equivBanner}>
                  <Text style={styles.equivLabel}>{t('categories.monthlyEquivalent')}</Text>
                  <Text style={styles.equivVal}>${calculatedMonthly} / mo</Text>
                </View>
              )}
            </View>
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
  noticeCard: {
    padding: 12,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    gap: 4,
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  noticeDesc: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
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
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  intervalInput: {
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
    minWidth: 80,
  },
  intervalUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  equivBanner: {
    padding: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  equivLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  equivVal: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accent,
    fontFamily: 'monospace',
  },
  billSection: {
    gap: 12,
  },
  billModeDesc: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
});

export const CategoryFormFields = EnvelopeFormFields;

