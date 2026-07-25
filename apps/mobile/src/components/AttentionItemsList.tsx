import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { formatAUD } from '../lib/format';

export interface AttentionItem {
  readonly id: string;
  readonly name: string;
  readonly expectedAmount: number;
  readonly expectedDate: string;
  readonly categoryId: string;
  readonly isOverdue: boolean;
  readonly categoryBalance: number;
}

export interface AttentionItemsListProps {
  readonly items: readonly AttentionItem[];
  readonly onMarkPaid: (item: AttentionItem) => void;
}

export const AttentionItemsList: React.FC<AttentionItemsListProps> = ({
  items,
  onMarkPaid,
}) => {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Feather name="alert-circle" size={16} color={DESIGN_TOKENS.colors.critical} />
          <Text style={styles.headerTitle}>Needs Attention ({items.length})</Text>
        </View>
      </View>

      {items.map((item) => {
        const shortfall = item.expectedAmount - item.categoryBalance;
        const isFunded = shortfall <= 0;

        return (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemLeft}>
              <Text style={styles.itemName}>{item.name}</Text>
              <View style={styles.statusRow}>
                <Text style={[styles.badge, item.isOverdue ? styles.overdueBadge : styles.dueSoonBadge]}>
                  {item.isOverdue ? 'Overdue' : `Due ${item.expectedDate}`}
                </Text>
                {isFunded ? (
                  <Text style={styles.fundedText}>Category funded ✓</Text>
                ) : (
                  <Text style={styles.shortText}>Short by {formatAUD(shortfall)} ⚠️</Text>
                )}
              </View>
            </View>

            <View style={styles.itemRight}>
              <Text style={styles.amount}>{formatAUD(item.expectedAmount)}</Text>
              <TouchableOpacity
                style={styles.payBtn}
                onPress={() => onMarkPaid(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.payBtnText}>Mark Paid</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF5F5',
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: '#FEB2B2',
    padding: DESIGN_TOKENS.spacing.cardPadding,
    marginBottom: DESIGN_TOKENS.spacing.stackGap,
  },
  header: {
    marginBottom: DESIGN_TOKENS.spacing.stackGap,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9B2C2C',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#FED7D7',
  },
  itemLeft: {
    flex: 1,
    marginRight: DESIGN_TOKENS.spacing.stackGap,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  badge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  overdueBadge: {
    backgroundColor: DESIGN_TOKENS.colors.critical,
    color: '#FFFFFF',
  },
  dueSoonBadge: {
    backgroundColor: DESIGN_TOKENS.colors.warning,
    color: '#FFFFFF',
  },
  fundedText: {
    fontSize: 11,
    fontWeight: '500',
    color: DESIGN_TOKENS.colors.success,
  },
  shortText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C53030',
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  payBtn: {
    backgroundColor: DESIGN_TOKENS.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  payBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default AttentionItemsList;
