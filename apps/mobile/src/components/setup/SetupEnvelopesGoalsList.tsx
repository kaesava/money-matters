import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, InfoTooltip } from '@money-matters/ui/mobile';
import { EstimatedCategoryItem, UserGoalItem } from '@money-matters/types';
import { formatMobileCurrency, formatDate } from '../../lib/format';

interface SetupEnvelopesGoalsListProps {
  goals: EstimatedCategoryItem[];
  userGoals: UserGoalItem[];
  totalGoalMonthly: number;
  onRemove: (name: string) => void;
  onEditGoal?: (category: EstimatedCategoryItem) => void;
}

export function SetupEnvelopesGoalsList({
  goals,
  userGoals,
  totalGoalMonthly,
  onRemove,
  onEditGoal,
}: SetupEnvelopesGoalsListProps) {
  if (goals.length === 0) return null;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('setup.categories.goalSection')}</Text>
        <Text style={styles.sectionTotal}>
          {t('setup.reviewSummary.monthlyEstBadge', { amount: formatMobileCurrency(totalGoalMonthly) })}
        </Text>
      </View>

      {goals.map((cat) => {
        const userGoal = userGoals.find(
          (g) => g.name.trim().toLowerCase() === cat.name.trim().toLowerCase()
        );
        const isSurplusTarget = Boolean(userGoal?.isSurplusTarget ?? cat.isSurplusTarget);
        const isOngoing =
          userGoal?.fundingMode === 'RECURRING' || (!userGoal?.dueDate && Boolean(userGoal?.budgetFrequency));
        const freq = userGoal?.budgetFrequency || 'MONTHLY';
        const freqSuffix =
          freq === 'WEEKLY'
            ? t('setup.freqSuffixWk')
            : freq === 'FORTNIGHTLY'
            ? t('setup.freqSuffixFn')
            : freq === 'QUARTERLY'
            ? t('setup.freqSuffixQtr')
            : freq === 'ANNUALLY'
            ? t('setup.freqSuffixYr')
            : t('setup.freqSuffixMo');
        const enteredAmt = userGoal?.enteredAmount ?? userGoal?.targetAmount ?? cat.monthlyAud;

        let displayMetric: string;
        if (isOngoing) {
          displayMetric =
            freq === 'MONTHLY'
              ? `${formatMobileCurrency(enteredAmt)} ${t('setup.freqSuffixMo')}`
              : t('setup.reviewSummary.ongoingEstMetric', {
                  entered: formatMobileCurrency(enteredAmt),
                  freqSuffix,
                  monthly: formatMobileCurrency(cat.monthlyAud),
                });
        } else {
          const targetAmt = userGoal?.targetAmount ?? cat.monthlyAud;
          displayMetric = userGoal?.dueDate
            ? t('setup.reviewSummary.targetWithDateMetric', {
                target: formatMobileCurrency(targetAmt),
                date: formatDate(userGoal.dueDate),
                monthly: formatMobileCurrency(cat.monthlyAud),
              })
            : t('setup.reviewSummary.targetNoDateMetric', {
                target: formatMobileCurrency(targetAmt),
                monthly: formatMobileCurrency(cat.monthlyAud),
              });
        }

        return (
          <View key={cat.name} style={styles.row}>
            <View style={styles.infoCol}>
              <View style={styles.titleRow}>
                <Text style={styles.name}>
                  {cat.icon || '🎯'} {cat.name}
                </Text>
                {isSurplusTarget && (
                  <View style={styles.surplusBadge}>
                    <Text style={styles.surplusBadgeText}>{t('setup.goals.surplusTargetBadge')}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.targetSub}>{displayMetric}</Text>
            </View>

            <View style={styles.actionRow}>
              {onEditGoal && (
                <TouchableOpacity
                  onPress={() =>
                    onEditGoal({
                      ...cat,
                      id: userGoal?.id || cat.id,
                      type: 'GOAL',
                      envelopeType: 'GOAL',
                      fundingMode: userGoal?.fundingMode ?? cat.fundingMode ?? 'TARGET_BALANCE',
                      isPriority: userGoal?.isPriority ?? cat.isPriority ?? true,
                      isSurplusTarget,
                      bankAccountId: userGoal?.bankAccountId ?? cat.bankAccountId,
                      targetAmount: userGoal?.targetAmount ?? cat.targetAmount ?? null,
                      enteredAmount: userGoal?.enteredAmount ?? cat.enteredAmount ?? null,
                      endDate: userGoal?.dueDate ?? cat.endDate ?? null,
                      budgetFrequency: userGoal?.budgetFrequency ?? cat.budgetFrequency ?? 'MONTHLY',
                      startDate: userGoal?.startDate ?? cat.startDate ?? null,
                      rrule: userGoal?.rrule ?? cat.rrule ?? null,
                    })
                  }
                  style={styles.editBtn}
                >
                  <Text style={styles.editBtnText}>{t('common.edit')}</Text>
                </TouchableOpacity>
              )}
              {isSurplusTarget ? (
                <InfoTooltip content={t('categories.cannotDeleteSpecialEnvelope')} />
              ) : (
                <TouchableOpacity
                  onPress={() => onRemove(cat.name)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    padding: 14,
    borderRadius: DESIGN_TOKENS.radius.lg,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[100],
    paddingBottom: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
    flex: 1,
  },
  sectionTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[100],
  },
  infoCol: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  surplusBadge: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  surplusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.successDark,
  },
  targetSub: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
  removeBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[400],
    paddingHorizontal: 4,
  },
});
