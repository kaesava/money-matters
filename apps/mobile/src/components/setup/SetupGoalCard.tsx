import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { UserGoalItem } from '@money-matters/types';
import { DESIGN_TOKENS, AmountInput } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface SetupGoalCardProps {
  goal: UserGoalItem;
  onUpdate: (id: string, field: keyof UserGoalItem, value: string | number) => void;
  onRemove: (id: string) => void;
}

function getMonthsDiff(targetDateStr: string): number {
  if (!targetDateStr) return 12;
  const now = new Date();
  const target = new Date(targetDateStr);
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.max(1, months);
}

export function SetupGoalCard({ goal, onUpdate, onRemove }: SetupGoalCardProps) {
  const months = getMonthsDiff(goal.dueDate);
  const estMonthly = Math.round((goal.targetAmount || 0) / months);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>{goal.icon || '🎯'}</Text>
          <TextInput
            style={styles.nameInput}
            value={goal.name}
            onChangeText={(txt) => onUpdate(goal.id, 'name', txt)}
          />
        </View>
        <TouchableOpacity onPress={() => onRemove(goal.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.removeBtn}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputsRow}>
        <View style={styles.amountCol}>
          <Text style={styles.fieldLabel}>{t('common.target')}</Text>
          <AmountInput
            value={goal.targetAmount ? String(goal.targetAmount) : ''}
            onChangeText={(val) => {
              const num = parseFloat(val) || 0;
              onUpdate(goal.id, 'targetAmount', num);
              onUpdate(goal.id, 'monthlyAmount', Math.round(num / months));
            }}
          />
        </View>
        <View style={styles.guideBadge}>
          <Text style={styles.guideText}>Est. ${estMonthly}/mo</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  icon: { fontSize: 18 },
  nameInput: { fontSize: 14, fontWeight: '700', color: DESIGN_TOKENS.colors.primary, flex: 1 },
  removeBtn: { fontSize: 14, fontWeight: '700', color: '#EF4444', paddingHorizontal: 4 },
  inputsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  amountCol: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: DESIGN_TOKENS.colors.textMuted, marginBottom: 4 },
  guideBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  guideText: { fontSize: 11, fontWeight: '700', color: '#15803D' },
});
