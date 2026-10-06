import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface AddScheduleButtonRowProps {
  setupSubSegment: 'INCOME' | 'EXPENSE';
  onAddSchedule: (mode: 'INCOME' | 'EXPENSE') => void;
}

export const AddScheduleButtonRow: React.FC<AddScheduleButtonRowProps> = ({
  setupSubSegment,
  onAddSchedule,
}) => {
  return (
    <View style={styles.addScheduleRow}>
      <TouchableOpacity
        style={styles.addScheduleBtn}
        onPress={() => onAddSchedule(setupSubSegment)}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={15} color={DESIGN_TOKENS.colors.onAccent} />
        <Text style={styles.addScheduleBtnText}>
          {setupSubSegment === 'INCOME'
            ? t('payday.addIncomeSchedule')
            : t('payday.addExpenseSchedule')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  addScheduleRow: {
    marginBottom: 14,
  },
  addScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  addScheduleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.onAccent,
  },
});
