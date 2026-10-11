import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface AddScheduleButtonRowProps {
  setupSubSegment: 'INCOME' | 'EXPENSE';
  onAddSchedule: (mode: 'INCOME' | 'EXPENSE') => void;
  onAddOneOff?: (mode: 'INCOME' | 'EXPENSE') => void;
}

export const AddScheduleButtonRow: React.FC<AddScheduleButtonRowProps> = ({
  setupSubSegment,
  onAddSchedule,
  onAddOneOff,
}) => {
  return (
    <View style={styles.addScheduleRow}>
      <TouchableOpacity
        style={styles.addScheduleBtn}
        onPress={() => onAddSchedule(setupSubSegment)}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={14} color={DESIGN_TOKENS.colors.onAccent} />
        <Text style={styles.addScheduleBtnText} numberOfLines={1}>
          {setupSubSegment === 'INCOME'
            ? t('payday.addIncomeSchedule')
            : t('incomeBillsTabs.addBillSchedule')}
        </Text>
      </TouchableOpacity>

      {onAddOneOff && (
        <TouchableOpacity
          style={styles.oneOffBtn}
          onPress={() => onAddOneOff(setupSubSegment)}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={14} color={DESIGN_TOKENS.colors.primary} />
          <Text style={styles.oneOffBtnText} numberOfLines={1}>
            {setupSubSegment === 'INCOME'
              ? t('incomeBillsTabs.oneOffIncome')
              : t('incomeBillsTabs.oneOffExpense')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  addScheduleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  addScheduleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  addScheduleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.onAccent,
  },
  oneOffBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  oneOffBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
});
