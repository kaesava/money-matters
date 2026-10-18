import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import {
  DESIGN_TOKENS,
  FormLabel,
  AmountInput,
  ChipSelect,
  DatePickerField,
} from '@money-matters/ui/mobile';
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

export const EnvelopeRecurrenceFields: React.FC<EnvelopeRecurrenceFieldsProps> = ({
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
}) => {
  const showMonthlyEquiv =
    Boolean(amount && parseFloat(amount) > 0 && (frequency !== 'MONTHLY' || interval > 1));

  return (
    <View style={styles.container}>
      <AmountInput
        label={amountLabel}
        required
        value={amount}
        onChangeText={setAmount}
        placeholder={placeholder}
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

      <View style={styles.inlineRow}>
        <View style={styles.everyCol}>
          <FormLabel required>{t('forms.every')}</FormLabel>
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
            <Text style={styles.intervalUnit} numberOfLines={1}>
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

        <View style={styles.dateCol}>
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
        </View>
      </View>

      {showMonthlyEquiv && (
        <View style={styles.equivBanner}>
          <Text style={styles.equivLabel}>{t('categories.monthlyEquivalent')}</Text>
          <Text style={styles.equivVal}>${calculatedMonthly} / mo</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  formGroup: {
    gap: 4,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  everyCol: {
    flex: 1,
    gap: 4,
  },
  dateCol: {
    flex: 1.25,
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  intervalInput: {
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
    width: 52,
    textAlign: 'center',
  },
  intervalUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
    flexShrink: 1,
  },
  equivBanner: {
    padding: 10,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  equivLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  equivVal: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accent,
    fontFamily: 'monospace',
  },
});
