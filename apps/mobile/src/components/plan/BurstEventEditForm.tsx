import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  DESIGN_TOKENS,
  AmountInput,
  MobileDatePickerField,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface BurstEventEditFormProps {
  editAmount: string;
  editDate: string;
  isIncome: boolean;
  isFuture: boolean;
  submitting: boolean;
  onEditAmountChange: (val: string) => void;
  onEditDateChange: (val: string) => void;
  onSaveEdit: () => void;
  onMarkPaid: () => void;
  onCancelEdit: () => void;
}

export function BurstEventEditForm({
  editAmount,
  editDate,
  isIncome,
  isFuture,
  submitting,
  onEditAmountChange,
  onEditDateChange,
  onSaveEdit,
  onMarkPaid,
  onCancelEdit,
}: BurstEventEditFormProps) {
  return (
    <View style={styles.editFormBox}>
      <AmountInput
        label={t('common.amount')}
        required
        value={editAmount}
        onChangeText={onEditAmountChange}
      />
      <MobileDatePickerField
        label={t('common.date')}
        required
        value={editDate}
        onChange={onEditDateChange}
      />

      <View style={styles.editActionRow}>
        <TouchableOpacity
          style={styles.saveEditBtn}
          onPress={onSaveEdit}
          disabled={submitting}
        >
          <Text style={styles.saveEditText}>{t('common.save')}</Text>
        </TouchableOpacity>

        {!isFuture && (
          <TouchableOpacity
            style={styles.markPaidConfirmBtn}
            onPress={onMarkPaid}
            disabled={submitting}
          >
            <Text style={styles.markPaidConfirmText}>
              {isIncome ? t('common.runSplit') : t('common.markSpent')}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.cancelEditBtn}
          onPress={onCancelEdit}
          disabled={submitting}
        >
          <Text style={styles.cancelEditText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editFormBox: {
    gap: 8,
    paddingTop: 6,
  },
  editActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  saveEditBtn: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.onPrimary,
  },
  markPaidConfirmBtn: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.successDark,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  markPaidConfirmText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.onPrimary,
  },
  cancelEditBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelEditText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[500],
  },
});
