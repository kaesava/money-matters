import { getTenantDateString } from "../../lib/format";
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { UserGoalItem } from '@money-matters/types';
import { DESIGN_TOKENS, AmountInput, MobileDatePickerField, InfoTooltip } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { getMobileLocaleConfig } from '../../lib/format';

interface SetupGoalCardProps {
  goal: UserGoalItem;
  onUpdate: (id: string, field: keyof UserGoalItem, value: string | number) => void;
  onRemove: () => void;
}

function getMonthsDiff(targetDateStr: string): number {
  if (!targetDateStr) return 12;
  const now = new Date();
  const target = new Date(targetDateStr);
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.max(1, months);
}

function getFrequencyLabel(freq?: string | null): string {
  if (freq === 'WEEKLY') return t('categories.frequencyWeekly');
  if (freq === 'FORTNIGHTLY') return t('categories.frequencyFortnightly');
  if (freq === 'QUARTERLY') return t('setup.frequencyQuarterly');
  if (freq === 'ANNUALLY') return t('categories.frequencyAnnually');
  return t('categories.frequencyMonthly');
}

function renderGoalIcon(iconName?: string | null) {
  const icon = iconName || 'target';
  switch (icon) {
    case 'shield':
      return <Feather name="shield" size={18} color={DESIGN_TOKENS.colors.accent} />;
    case 'plane':
      return <Feather name="send" size={18} color={DESIGN_TOKENS.colors.accent} />;
    case 'car':
      return <Feather name="truck" size={18} color={DESIGN_TOKENS.colors.accent} />;
    case 'laptop':
      return <Feather name="monitor" size={18} color={DESIGN_TOKENS.colors.accent} />;
    case 'book':
      return <Feather name="book-open" size={18} color={DESIGN_TOKENS.colors.accent} />;
    case 'trending-up':
      return <Feather name="trending-up" size={18} color={DESIGN_TOKENS.colors.accent} />;
    default:
      return <Feather name="target" size={18} color={DESIGN_TOKENS.colors.accent} />;
  }
}

export function SetupGoalCard({
  goal,
  onUpdate,
  onRemove,
}: SetupGoalCardProps) {
  const isOngoing = goal.fundingMode === 'RECURRING';
  const months = isOngoing ? 1 : getMonthsDiff(goal.dueDate || '');
  const rawAmt = goal.enteredAmount !== undefined && goal.enteredAmount !== null ? goal.enteredAmount : (goal.monthlyAmount || 0);
  const freq = goal.budgetFrequency || 'MONTHLY';
  const isSurplusTarget = Boolean(goal.isSurplusTarget);
  const tz = getMobileLocaleConfig().timezone;
  const todayStr = getTenantDateString(new Date(), { timezone: tz });
  const isPast = Boolean(!isOngoing && goal.dueDate && goal.dueDate < todayStr);

  const handleFrequencyChange = (newFreq: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY') => {
    onUpdate(goal.id, 'budgetFrequency', newFreq);
    onUpdate(goal.id, 'enteredAmount', rawAmt);
    const monthly = newFreq === 'WEEKLY'
      ? Math.round((rawAmt * 52) / 12)
      : newFreq === 'FORTNIGHTLY'
      ? Math.round((rawAmt * 26) / 12)
      : newFreq === 'QUARTERLY'
      ? Math.round((rawAmt * 4) / 12)
      : newFreq === 'ANNUALLY'
      ? Math.round(rawAmt / 12)
      : Math.round(rawAmt);
    onUpdate(goal.id, 'monthlyAmount', monthly);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconBox}>{renderGoalIcon(goal.icon)}</View>
          <View style={{ flex: 1 }}>
            <TextInput
              style={styles.nameInput}
              value={goal.name}
              onChangeText={(txt) => onUpdate(goal.id, 'name', txt)}
            />
            {isSurplusTarget && (
              <Text style={styles.surplusBadgeText}>{t('setup.reviewSummary.surplusTargetHelp')}</Text>
            )}
            {isPast && (
              <Text style={styles.pastDateText}>{t('categories.goalPastDateWarning')}</Text>
            )}
          </View>
        </View>
        {isSurplusTarget ? (
          <InfoTooltip content={t('categories.cannotDeleteSpecialEnvelope')} />
        ) : (
          <TouchableOpacity
            onPress={onRemove}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.removeBtnTouch}
          >
            <Feather name="x" size={16} color={DESIGN_TOKENS.colors.critical} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.inputsRow}>
        <View style={styles.amountCol}>
          <Text style={styles.fieldLabel}>
            {isOngoing ? t('setup.goals.recurringContributionLabel') : t('common.target')}
          </Text>
          <AmountInput
            value={
              isOngoing
                ? goal.enteredAmount !== undefined && goal.enteredAmount !== null
                  ? String(goal.enteredAmount)
                  : goal.monthlyAmount ? String(goal.monthlyAmount) : ''
                : goal.targetAmount ? String(goal.targetAmount) : ''
            }
            containerStyle={styles.amountInputContainer}
            style={styles.amountInput}
            onChangeText={(val) => {
              const num = parseFloat(val) || 0;
              if (isOngoing) {
                const currentFreq = goal.budgetFrequency || 'MONTHLY';
                const monthly = currentFreq === 'WEEKLY'
                  ? Math.round((num * 52) / 12)
                  : currentFreq === 'FORTNIGHTLY'
                  ? Math.round((num * 26) / 12)
                  : currentFreq === 'QUARTERLY'
                  ? Math.round((num * 4) / 12)
                  : currentFreq === 'ANNUALLY'
                  ? Math.round(num / 12)
                  : Math.round(num);
                onUpdate(goal.id, 'enteredAmount', num);
                onUpdate(goal.id, 'monthlyAmount', monthly);
              } else {
                onUpdate(goal.id, 'targetAmount', num);
                onUpdate(goal.id, 'monthlyAmount', Math.round(num / months));
              }
            }}
          />
        </View>

        {!isOngoing ? (
          <View style={styles.dateCol}>
            <Text style={styles.fieldLabel}>{t('categories.targetDateLabel')}</Text>
            <MobileDatePickerField
              compact
              value={goal.dueDate || ''}
              onChange={(d) => {
                onUpdate(goal.id, 'dueDate', d);
                const m = getMonthsDiff(d);
                onUpdate(goal.id, 'monthlyAmount', Math.round((goal.targetAmount || 0) / m));
              }}
            />
          </View>
        ) : (
          <View style={styles.freqCol}>
            <Text style={styles.fieldLabel}>{t('categories.recurrence')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.freqChipsRow}>
              {(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => handleFrequencyChange(f)}
                  style={[styles.freqChip, freq === f && styles.freqChipActive]}
                >
                  <Text style={[styles.freqChipText, freq === f && styles.freqChipTextActive]}>
                    {getFrequencyLabel(f)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  surplusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.successDark,
    marginTop: 2,
  },
  pastDateText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.warning,
    marginTop: 2,
  },
  removeBtnTouch: {
    padding: 4,
  },
  inputsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  amountCol: {
    flex: 1,
  },
  dateCol: {
    flex: 1,
  },
  freqCol: {
    flex: 1.1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
    marginBottom: 4,
    height: 16,
  },
  amountInputContainer: {
    marginBottom: 0,
  },
  amountInput: {
    height: 42,
    paddingVertical: 0,
    fontSize: 13,
  },
  freqChipsRow: {
    flexDirection: 'row',
    gap: 4,
    height: 42,
    alignItems: 'center',
  },
  freqChip: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  freqChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  freqChipTextActive: {
    color: '#1D4ED8',
  },
});
