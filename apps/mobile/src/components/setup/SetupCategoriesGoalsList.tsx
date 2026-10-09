import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { EstimatedCategoryItem, UserGoalItem } from '@money-matters/types';

interface SetupCategoriesGoalsListProps {
  goals: EstimatedCategoryItem[];
  userGoals: UserGoalItem[];
  totalGoalMonthly: number;
  onRemove: (name: string) => void;
}

export function SetupCategoriesGoalsList({
  goals,
  userGoals,
  totalGoalMonthly,
  onRemove,
}: SetupCategoriesGoalsListProps) {
  if (goals.length === 0) return null;

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('setup.categories.goalSection')}</Text>
        <Text style={styles.sectionTotal}>${totalGoalMonthly.toLocaleString()}/mo</Text>
      </View>

      {goals.map((cat) => {
        const isSurplusTarget =
          cat.name.toLowerCase().includes('emergency') ||
          cat.name.toLowerCase().includes('reserve') ||
          cat.name.toLowerCase().includes('surplus');
        const userGoal = userGoals.find(
          (g) => g.name.trim().toLowerCase() === cat.name.trim().toLowerCase()
        );
        const targetStr = userGoal
          ? `$${(userGoal.targetAmount || 0).toLocaleString()}`
          : `$${cat.monthlyAud.toLocaleString()}`;

        return (
          <View key={cat.name} style={styles.row}>
            <View style={styles.infoCol}>
              <View style={styles.titleRow}>
                <Text style={styles.name}>
                  {cat.icon || '🎯'} {cat.name}
                </Text>
                {isSurplusTarget && (
                  <View style={styles.surplusBadge}>
                    <Text style={styles.surplusBadgeText}>Surplus Target</Text>
                  </View>
                )}
              </View>
              <Text style={styles.targetSub}>
                Target: {targetStr}
                {userGoal?.dueDate ? ` • By ${userGoal.dueDate}` : ''}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => onRemove(cat.name)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.removeBtn}>✕</Text>
            </TouchableOpacity>
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
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  surplusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  targetSub: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
  },
  removeBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[400],
    paddingHorizontal: 4,
  },
});
