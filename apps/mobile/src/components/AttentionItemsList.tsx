import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../lib/format';

export interface AttentionItem {
  readonly id: string;
  readonly type?: 'EXPENSE' | 'TRANSFER';
  readonly name: string;
  readonly expectedAmount: number;
  readonly expectedDate: string;
  readonly categoryId?: string | null;
  readonly isOverdue: boolean;
  readonly categoryBalance?: number;
  readonly sourcePoolId?: string | null;
  readonly sourcePoolName?: string | null;
  readonly destinationPoolId?: string | null;
  readonly destinationPoolName?: string | null;
}

export interface AttentionItemsListProps {
  readonly items: readonly AttentionItem[];
  readonly onMarkPaid: (item: AttentionItem) => void;
  readonly onSkipExpense?: (item: AttentionItem) => void;
  readonly onExecuteTransfer?: (item: AttentionItem) => void;
  readonly onDeleteTransfer?: (item: AttentionItem) => void;
  readonly onTopUpShortfall?: (item: AttentionItem) => void;
  readonly hasMissingSchedules?: boolean;
  readonly needsBankReconciliation?: boolean;
}

export const AttentionItemsList: React.FC<AttentionItemsListProps> = ({
  items,
  onMarkPaid,
  onSkipExpense,
  onExecuteTransfer,
  onDeleteTransfer,
  onTopUpShortfall,
  hasMissingSchedules,
  needsBankReconciliation,
}) => {
  const router = useRouter();

  if (
    (!items || items.length === 0) &&
    !hasMissingSchedules &&
    !needsBankReconciliation
  ) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      {/* Missing Schedules Banner */}
      {hasMissingSchedules && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(app)/categories' as never)}
          style={styles.infoBanner}
        >
          <Feather name="info" size={16} color="#2563eb" />
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>
              {t('home.missingSchedulesTitle') || 'Missing Target Amounts'}
            </Text>
            <Text style={styles.bannerDesc}>
              {t('home.missingSchedulesDesc') ||
                'Some pools have no target amounts. Tap to set up your budget targets.'}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color="#2563eb" />
        </TouchableOpacity>
      )}

      {/* Bank Reconcile Card */}
      {needsBankReconciliation && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(app)/settings/bank-accounts' as never)}
          style={styles.reconcileCard}
        >
          <Feather name="refresh-cw" size={16} color="#D97706" />
          <View style={styles.bannerContent}>
            <Text style={styles.reconcileTitle}>
              {t('bankAccounts.reconcileNudgeTitle') || 'Bank Alignment Due'}
            </Text>
            <Text style={styles.reconcileDesc}>
              {t('bankAccounts.reconcileNudgeDesc') ||
                'It has been over 14 days since your last bank balance check. Tap to align balances.'}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color="#D97706" />
        </TouchableOpacity>
      )}

      {/* Overdue and Approaching Bills & Transfers */}
      {items && items.length > 0 && (
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Feather name="alert-circle" size={16} color="#ba1a1a" />
              <Text style={styles.headerTitle}>
                Needs Attention ({items.length})
              </Text>
            </View>
          </View>

          {items.map((item) => {
            const isTransfer = item.type === 'TRANSFER';
            const catBal = item.categoryBalance ?? 0;
            const shortfall = item.expectedAmount - catBal;
            const isFunded = shortfall <= 0;

            if (isTransfer) {
              return (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <View style={styles.transferTitleRow}>
                      <Feather name="repeat" size={13} color="#2563eb" />
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                    <View style={styles.statusRow}>
                      <Text
                        style={[
                          styles.badge,
                          item.isOverdue ? styles.overdueBadge : styles.dueSoonBadge,
                        ]}
                      >
                        {item.isOverdue ? 'Overdue' : `Due ${item.expectedDate}`}
                      </Text>
                      <Text style={styles.transferRouteText} numberOfLines={1}>
                        {item.sourcePoolName || 'Source'} ➔ {item.destinationPoolName || 'Dest'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.itemRight}>
                    <Text style={styles.amount}>
                      {formatAUD(item.expectedAmount)}
                    </Text>
                    <View style={styles.actionButtonsRow}>
                      {onDeleteTransfer && (
                        <TouchableOpacity
                          style={styles.skipBtn}
                          onPress={() => onDeleteTransfer(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.skipBtnText}>Skip</Text>
                        </TouchableOpacity>
                      )}
                      {onExecuteTransfer && (
                        <TouchableOpacity
                          style={styles.payBtn}
                          onPress={() => onExecuteTransfer(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.payBtnText}>Execute</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            }

            return (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.statusRow}>
                    <Text
                      style={[
                        styles.badge,
                        item.isOverdue ? styles.overdueBadge : styles.dueSoonBadge,
                      ]}
                    >
                      {item.isOverdue ? 'Overdue' : `Due ${item.expectedDate}`}
                    </Text>
                    {isFunded ? (
                      <Text style={styles.fundedText}>Category funded ✓</Text>
                    ) : (
                      <TouchableOpacity
                        onPress={() => onTopUpShortfall?.(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.shortText}>
                          Short by {formatAUD(shortfall)} ⚠️ (Top up)
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.itemRight}>
                  <Text style={styles.amount}>
                    {formatAUD(item.expectedAmount)}
                  </Text>
                  <View style={styles.actionButtonsRow}>
                    {onSkipExpense && (
                      <TouchableOpacity
                        style={styles.skipBtn}
                        onPress={() => onSkipExpense(item)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.skipBtnText}>Skip</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.payBtn}
                      onPress={() => onMarkPaid(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.payBtnText}>Mark Paid</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
    marginVertical: 4,
    paddingHorizontal: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 12,
    gap: 10,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
  bannerDesc: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
  reconcileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    gap: 10,
  },
  reconcileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  reconcileDesc: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  container: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 14,
  },
  header: {
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
  },
  itemLeft: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  transferTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  transferRouteText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
    flexShrink: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  overdueBadge: {
    backgroundColor: '#ba1a1a',
    color: '#FFFFFF',
  },
  dueSoonBadge: {
    backgroundColor: '#F59E0B',
    color: '#FFFFFF',
  },
  fundedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  shortText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  skipBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  skipBtnText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  payBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default AttentionItemsList;
