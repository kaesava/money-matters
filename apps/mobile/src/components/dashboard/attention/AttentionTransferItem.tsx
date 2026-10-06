import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../../lib/format';
import type { AttentionItem } from '../../AttentionItemsList';

interface AttentionTransferItemProps {
  readonly item: AttentionItem;
  readonly daysAwayText: string;
  readonly isOverdue: boolean;
  readonly onExecuteTransfer?: (item: AttentionItem) => void;
  readonly onDeleteTransfer?: (item: AttentionItem) => void;
}

export const AttentionTransferItem: React.FC<AttentionTransferItemProps> = ({
  item,
  daysAwayText,
  isOverdue,
  onExecuteTransfer,
  onDeleteTransfer,
}) => {
  const showOverdue = item.isOverdue || isOverdue;

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
              showOverdue ? styles.overdueBadge : styles.transferBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                showOverdue ? styles.overdueBadgeText : styles.transferBadgeText,
              ]}
            >
              {showOverdue ? t('common.overdue') : t('common.transfer')}
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

        <Text style={styles.transferRouteText} numberOfLines={1}>
          {item.sourcePoolName || 'Source'} ➔ {item.destinationPoolName || 'Dest'}
        </Text>
      </View>

      <View style={styles.actionColumn}>
        {onExecuteTransfer && (
          <TouchableOpacity
            style={styles.actionPrimaryBtn}
            onPress={() => onExecuteTransfer(item)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionPrimaryBtnText}>
              {t('common.transfer')}
            </Text>
          </TouchableOpacity>
        )}
        {onDeleteTransfer && (
          <TouchableOpacity
            style={styles.deleteLink}
            onPress={() => onDeleteTransfer(item)}
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
  transferBadge: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
  },
  transferBadgeText: {
    color: DESIGN_TOKENS.colors.accentDark,
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
  transferRouteText: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.accent,
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
