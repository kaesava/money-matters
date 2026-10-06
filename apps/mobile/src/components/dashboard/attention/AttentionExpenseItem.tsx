import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../../lib/format';
import type { AttentionItem } from '../../AttentionItemsList';

interface AttentionExpenseItemProps {
  readonly item: AttentionItem;
  readonly daysAwayText: string;
  readonly isOverdue: boolean;
  readonly onMarkPaid: (item: AttentionItem) => void;
  readonly onSkipExpense?: (item: AttentionItem) => void;
  readonly onTopUpShortfall?: (item: AttentionItem) => void;
}

export const AttentionExpenseItem: React.FC<AttentionExpenseItemProps> = ({
  item,
  daysAwayText,
  isOverdue,
  onMarkPaid,
  onSkipExpense,
  onTopUpShortfall,
}) => {
  const showOverdue = item.isOverdue || isOverdue;
  const catBal = item.categoryBalance ?? 0;
  const shortfall = item.expectedAmount - catBal;
  const isFunded = shortfall <= 0;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemLeft}>
        <View style={styles.titleWithBadge}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          <View
            style={[
              styles.badge,
              showOverdue ? styles.overdueBadge : styles.dueSoonBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                showOverdue ? styles.overdueBadgeText : styles.dueSoonBadgeText,
              ]}
            >
              {showOverdue ? t('common.overdue') : t('common.dueSoon')}
            </Text>
          </View>
        </View>

        <Text style={styles.itemMeta}>
          <Text style={styles.amountText}>{formatAUD(item.expectedAmount)}</Text>
          {' · '}
          <Text style={showOverdue ? styles.overdueDateText : styles.normalDateText}>
            {daysAwayText}
          </Text>
          {' '}({formatDate(item.expectedDate)})
        </Text>

        {item.categoryName ? (
          <Text style={styles.categorySubText}>
            {item.categoryName}
            {typeof item.categoryBalance === 'number' && (
              <Text style={styles.categoryBalText}>
                {' '}{t('dashboard.upcomingExpensesTransfers.availableSuffix', {
                  amount: formatAUD(item.categoryBalance),
                })}
              </Text>
            )}
            {' · '}
            {isFunded ? (
              <Text style={styles.fundedText}>
                {t('dashboard.attention.categoryFunded')}
              </Text>
            ) : (
              <Text
                style={styles.shortText}
                onPress={() => onTopUpShortfall?.(item)}
              >
                {t('dashboard.attention.categoryShort', {
                  amount: formatAUD(shortfall),
                })}
              </Text>
            )}
          </Text>
        ) : null}
      </View>

      <View style={styles.actionColumn}>
        <TouchableOpacity
          style={styles.actionPrimaryBtn}
          onPress={() => onMarkPaid(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.actionPrimaryBtnText}>
            {t('common.markSpent')}
          </Text>
        </TouchableOpacity>

        {onSkipExpense && (
          <TouchableOpacity
            style={styles.deleteLink}
            onPress={() => onSkipExpense(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteLinkText}>{t('common.delete')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  itemCard: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemLeft: {
    flex: 1,
    gap: 3,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: DESIGN_TOKENS.radius.sm,
  },
  overdueBadge: {
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
  },
  overdueBadgeText: {
    color: DESIGN_TOKENS.colors.criticalDark,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dueSoonBadge: {
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
  },
  dueSoonBadgeText: {
    color: DESIGN_TOKENS.colors.warningDark,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  itemMeta: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  amountText: {
    fontWeight: '800',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
  },
  normalDateText: {
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  overdueDateText: {
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.burnRed,
  },
  categorySubText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  categoryBalText: {
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  fundedText: {
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.successDark,
  },
  shortText: {
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.burnRed,
  },
  actionColumn: {
    alignItems: 'flex-end',
    gap: 6,
  },
  actionPrimaryBtn: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: DESIGN_TOKENS.radius.default,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actionPrimaryBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accent,
  },
  deleteLink: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  deleteLinkText: {
    fontSize: 10,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[400],
  },
});
