import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface CategoryData {
  id: string;
  name: string;
  monthlyAmount: string | null;
  enteredAmount?: string | null;
  budgetFrequency?: string | null;
  isEssential?: boolean | null;
}

interface CategoryDetailOverviewCardProps {
  category: CategoryData;
  onEditCategory: () => void;
}

export function CategoryDetailOverviewCard({
  category,
  onEditCategory,
}: CategoryDetailOverviewCardProps) {
  return (
    <View style={styles.categoryCard}>
      <View style={styles.cardHeader}>
        <View style={styles.flex1}>
          <View style={styles.tagsRow}>
            <Text style={styles.categoryBadge}>{t('dashboard.breakdown')}</Text>
            {category.isEssential && (
              <View style={styles.essentialBadge}>
                <Text style={styles.essentialText}>{t('categories.essentialBadge')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.catTitle}>{category.name}</Text>
          <Text style={styles.catFreq}>
            {category.budgetFrequency || t('categories.frequencyMonthly')}
          </Text>
        </View>
        <View style={styles.balanceCol}>
          <Text style={styles.balanceLabel}>{t('common.budget')}</Text>
          <Text style={styles.balanceAmount}>
            ${parseFloat(category.monthlyAmount || '0').toFixed(2)}/mo
          </Text>
          {category.enteredAmount &&
            category.budgetFrequency &&
            category.budgetFrequency !== 'MONTHLY' && (
              <Text style={styles.catSubAmount}>
                (${parseFloat(category.enteredAmount).toFixed(2)}/{category.budgetFrequency.toLowerCase()})
              </Text>
            )}
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onEditCategory}
          activeOpacity={0.7}
        >
          <Feather name="edit-2" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
          <Text style={styles.actionBtnText}>{t('categories.editCategory')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  categoryCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  essentialBadge: {
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  essentialText: {
    fontSize: 9,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.burnRed,
  },
  catTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: DESIGN_TOKENS.colors.primary,
  },
  catFreq: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[500],
    marginTop: 2,
  },
  catSubAmount: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[400],
    fontFamily: 'monospace',
    marginTop: 1,
  },
  balanceCol: { alignItems: 'flex-end' },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[400],
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: 10,
    paddingVertical: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
});
