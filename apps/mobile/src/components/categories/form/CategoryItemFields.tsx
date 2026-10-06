import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import {
  DESIGN_TOKENS,
  MobileInput,
  AmountInput,
  ChipSelect,
  FormLabel,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

type FrequencyOption = 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY';

interface CategoryItemFieldsProps {
  name: string;
  setName: (v: string) => void;
  enteredAmount: string;
  setEnteredAmount: (v: string) => void;
  frequency: FrequencyOption;
  setFrequency: (f: FrequencyOption) => void;
  isEssential: boolean;
  setIsEssential: (v: boolean) => void;
  calculatedMonthly: string;
  isEdit: boolean;
  freqOptions: Array<{ key: string; label: string }>;
}

export const CategoryItemFields: React.FC<CategoryItemFieldsProps> = ({
  name,
  setName,
  enteredAmount,
  setEnteredAmount,
  frequency,
  setFrequency,
  isEssential,
  setIsEssential,
  calculatedMonthly,
  isEdit,
  freqOptions,
}) => {
  return (
    <View style={styles.form}>
      <MobileInput
        label={t('categories.nameLabel')}
        required
        placeholder={t('categories.namePlaceholder')}
        value={name}
        onChangeText={setName}
        autoFocus={!isEdit}
      />

      <AmountInput
        label={t('categories.targetAmountLabel')}
        required
        placeholder="0.00"
        value={enteredAmount}
        onChangeText={setEnteredAmount}
      />

      <View style={styles.inputGroup}>
        <FormLabel>{t('categories.frequencyLabel')}</FormLabel>
        <ChipSelect
          options={freqOptions}
          value={frequency}
          onChange={(val) => setFrequency(val as FrequencyOption)}
        />
      </View>

      {enteredAmount && parseFloat(enteredAmount) > 0 && frequency !== 'MONTHLY' && (
        <View style={styles.equivBanner}>
          <Text style={styles.equivLabel}>{t('categories.monthlyEquivalent')}</Text>
          <Text style={styles.equivVal}>${calculatedMonthly} / mo</Text>
        </View>
      )}

      <View style={styles.switchRow}>
        <View style={styles.switchTextCol}>
          <Text style={styles.switchLabel}>{t('categories.prioritiseCategory')}</Text>
          <Text style={styles.switchSubtext}>
            {t('categories.priorityCategoryInfo')}
          </Text>
        </View>
        <Switch
          value={isEssential}
          onValueChange={setIsEssential}
          trackColor={{ false: DESIGN_TOKENS.colors.slate[200], true: DESIGN_TOKENS.colors.accent }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  form: {
    gap: 14,
    paddingBottom: 10,
  },
  inputGroup: {
    gap: 4,
  },
  equivBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  equivLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.accentDark,
  },
  equivVal: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.accent,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  switchTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  switchSubtext: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.subtleText,
    marginTop: 2,
  },
});
