import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  AmountInput,
  MobileDatePickerField,
  MobileInput,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export interface MobileIncomeEventInlineCardProps {
  sourceName: string;
  onSourceNameChange: (name: string) => void;
  actualAmount: string;
  onActualAmountChange: (amount: string) => void;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  isReadOnly: boolean;
  onDeleteIncome: () => void;
  onBack: () => void;
}

export const MobileIncomeEventInlineCard: React.FC<MobileIncomeEventInlineCardProps> = ({
  sourceName,
  onSourceNameChange,
  actualAmount,
  onActualAmountChange,
  selectedDate,
  onSelectedDateChange,
  isReadOnly,
  onDeleteIncome,
  onBack,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backBtn}
        activeOpacity={0.7}
      >
        <Feather name="arrow-left" size={16} color={DESIGN_TOKENS.colors.slate[600]} />
        <Text style={styles.backBtnText}>{t('common.back')}</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.fieldsContainer}>
          <MobileInput
            label={t('paydayDrawer.incomeSourceLabel')}
            required
            value={sourceName}
            editable={!isReadOnly}
            onChangeText={onSourceNameChange}
          />

          <AmountInput
            label={t('paydayDrawer.incomeAmountLabel')}
            required
            value={actualAmount}
            editable={!isReadOnly}
            onChangeText={onActualAmountChange}
          />

          <MobileDatePickerField
            label={t('paydayDrawer.incomeDate')}
            required
            value={selectedDate}
            disabled={isReadOnly}
            onChange={onSelectedDateChange}
          />
        </View>

        <View style={styles.deleteRow}>
          <TouchableOpacity
            onPress={onDeleteIncome}
            disabled={isReadOnly}
            activeOpacity={0.7}
            style={styles.deleteBtn}
          >
            <Feather
              name="trash-2"
              size={14}
              color={isReadOnly ? DESIGN_TOKENS.colors.slate[300] : DESIGN_TOKENS.colors.slate[400]}
            />
            <Text
              style={[
                styles.deleteBtnText,
                isReadOnly && styles.deleteBtnTextDisabled,
              ]}
            >
              {t('common.delete')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  fieldsContainer: {
    gap: 12,
  },
  deleteRow: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    alignItems: 'flex-start',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[400],
  },
  deleteBtnTextDisabled: {
    color: DESIGN_TOKENS.colors.slate[300],
  },
});
