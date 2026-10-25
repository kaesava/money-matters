import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { UserGoalItem } from '@money-matters/types';
import { DESIGN_TOKENS, AmountInput, MobileDatePickerField } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatMobileCurrency } from '../../lib/format';

interface SetupGoalCardProps {
  goal: UserGoalItem;
  isRerun?: boolean;
  isDirty?: boolean;
  onUpdate: (id: string, field: keyof UserGoalItem, value: string | number) => void;
  onRemove: (id: string) => void;
  onSave?: (id: string) => Promise<void>;
}

function getMonthsDiff(targetDateStr: string): number {
  if (!targetDateStr) return 12;
  const now = new Date();
  const target = new Date(targetDateStr);
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.max(1, months);
}

function getFrequencyUnitLabel(freq?: string | null): string {
  if (freq === 'WEEKLY') return '/wk';
  if (freq === 'FORTNIGHTLY') return '/fn';
  if (freq === 'ANNUALLY') return '/yr';
  return '/mo';
}

export function SetupGoalCard({
  goal,
  onUpdate,
  onRemove,
}: SetupGoalCardProps) {
  const isOngoing = goal.goalMode === 'ONGOING';
  const months = isOngoing ? 1 : getMonthsDiff(goal.dueDate || '');
  const estMonthly = isOngoing
    ? Math.round(goal.targetAmount || 0)
    : Math.round((goal.targetAmount || 0) / months);
  const unitLabel = getFrequencyUnitLabel(goal.budgetFrequency);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>{goal.icon || '🎯'}</Text>
          <View style={styles.titleTextWrap}>
            <TextInput
              style={styles.nameInput}
              value={goal.name}
              onChangeText={(txt) => onUpdate(goal.id, 'name', txt)}
            />
            {isOngoing && (
              <Text style={styles.ongoingBadgeText}>
                {t('goalModes.ongoing')}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.actionsWrap}>
          <TouchableOpacity onPress={() => onRemove(goal.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.removeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputsRow}>
        <View style={styles.amountCol}>
          <Text style={styles.fieldLabel}>
            {isOngoing ? t('goalModes.monthlyContribution') : t('common.target')}
          </Text>
          <AmountInput
            value={
              isOngoing
                ? goal.enteredAmount !== undefined && goal.enteredAmount !== null
                  ? String(goal.enteredAmount)
                  : goal.monthlyAmount ? String(goal.monthlyAmount) : ''
                : goal.targetAmount ? String(goal.targetAmount) : ''
            }
            onChangeText={(val) => {
              const num = parseFloat(val) || 0;
              if (isOngoing) {
                onUpdate(goal.id, 'enteredAmount', num);
                onUpdate(goal.id, 'monthlyAmount', num);
                onUpdate(goal.id, 'targetAmount', num);
              } else {
                onUpdate(goal.id, 'targetAmount', num);
                onUpdate(goal.id, 'monthlyAmount', Math.round(num / months));
              }
            }}
          />
        </View>
        {!isOngoing && (
          <View style={styles.dateCol}>
            <Text style={styles.fieldLabel}>{t('categories.targetDateLabel')}</Text>
            <MobileDatePickerField
              value={goal.dueDate || ''}
              onChange={(d) => onUpdate(goal.id, 'dueDate', d)}
            />
          </View>
        )}
        <View style={styles.guideBadge}>
          <Text style={styles.guideText}>
            {isOngoing ? `${formatMobileCurrency(goal.enteredAmount || goal.monthlyAmount || 0)}${unitLabel}` : `${formatMobileCurrency(estMonthly)}/mo`}
          </Text>
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
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  titleTextWrap: { flex: 1 },
  icon: { fontSize: 18 },
  nameInput: { fontSize: 14, fontWeight: '700', color: DESIGN_TOKENS.colors.primary, flex: 1 },
  actionsWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineSaveBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
  },
  removeBtn: { fontSize: 14, fontWeight: '700', color: DESIGN_TOKENS.colors.critical, paddingHorizontal: 4 },
  inputsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  amountCol: { flex: 1 },
  dateCol: { flex: 1 },
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
  ongoingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
    marginTop: 2,
  },
});
