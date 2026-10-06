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
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface CategoryFormFieldsProps {
  name: string;
  setName: (v: string) => void;
  nameError: string;
  setNameError: (v: string) => void;
  type: 'GOAL' | 'REGULAR' | 'EVERYDAY';
  setType: (v: 'GOAL' | 'REGULAR' | 'EVERYDAY') => void;
  targetAmount: string;
  setTargetAmount: (v: string) => void;
  targetDate: string;
  setTargetDate: (v: string) => void;
  bankAccountId: string;
  setBankAccountId: (v: string) => void;
  isSurplusTarget: boolean;
  setIsSurplusTarget: (v: boolean) => void;
  isEdit: boolean;
  isSurplusDisabled: boolean;
  typeOptions: Array<{ key: string; label: string }>;
  bankOptions: Array<{ key: string; label: string }>;
}

export const CategoryFormFields: React.FC<CategoryFormFieldsProps> = ({
  name,
  setName,
  nameError,
  setNameError,
  type,
  setType,
  targetAmount,
  setTargetAmount,
  targetDate,
  setTargetDate,
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

      {(type === 'REGULAR' || type === 'EVERYDAY') && (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>{t('categories.calculatedTarget')}</Text>
          <Text style={styles.noticeDesc}>{t('categories.calculatedTargetNotice')}</Text>
        </View>
      )}

      {type === 'GOAL' && (
        <>
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
});
