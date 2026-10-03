import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import {
  DESIGN_TOKENS,
  CardDrawerIndicator,
  EntityLinkChip,
  SwipeableCard,
} from '@money-matters/ui/mobile';
import { formatAUD, formatDate, formatIsoDate } from '../../lib/format';

export interface PaycheckIncomeEvent {
  id: string;
  name?: string | null;
  expectedAmount: string;
  expectedDate: string;
  accountId?: string | null;
  accountName?: string | null;
  isPrivate?: boolean;
}

export interface PaycheckExpenseEvent {
  id: string;
  name?: string | null;
  expectedAmount: string;
  expectedDate: string;
  poolId?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  isPrivate?: boolean;
}

export interface PaycheckTransferEvent {
  id: string;
  name?: string | null;
  expectedAmount: string;
  expectedDate: string;
  sourcePoolId?: string | null;
  sourcePoolName?: string | null;
  destinationPoolId?: string | null;
  destinationPoolName?: string | null;
}

export interface TimelineEventItem {
  id: string;
  kind: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  name: string;
  expectedAmount: string;
  expectedDate: string;
  accountId?: string | null;
  accountName?: string | null;
  poolId?: string | null;
  categoryName?: string | null;
  sourcePoolId?: string | null;
  sourcePoolName?: string | null;
  destinationPoolId?: string | null;
  destinationPoolName?: string | null;
  isPrivate?: boolean;
  rawIncome?: PaycheckIncomeEvent;
  rawExpense?: PaycheckExpenseEvent;
  rawTransfer?: PaycheckTransferEvent;
}

export interface PaycheckEventSectionProps {
  events: TimelineEventItem[];
  onOpenPaydayWizard: (eventId: string) => void;
  onEditUpcomingIncome?: (event: PaycheckIncomeEvent) => void;
  onDeleteUpcomingIncome?: (event: PaycheckIncomeEvent) => void;
  onEditUpcomingExpense: (event: PaycheckExpenseEvent) => void;
  onDeleteUpcomingExpense?: (event: PaycheckExpenseEvent) => void;
  onMarkExpensePaid: (eventId: string, amount: string) => void;
  onExecuteTransfer?: (event: PaycheckTransferEvent) => void;
  onDeleteUpcomingTransfer?: (event: PaycheckTransferEvent) => void;
}

export const PaycheckEventSection: React.FC<PaycheckEventSectionProps> = ({
  events,
  onOpenPaydayWizard,
  onEditUpcomingIncome,
  onDeleteUpcomingIncome,
  onEditUpcomingExpense,
  onDeleteUpcomingExpense,
  onMarkExpensePaid,
  onExecuteTransfer,
  onDeleteUpcomingTransfer,
}) => {
  const router = useRouter();
  const todayStr = useMemo(() => formatIsoDate(new Date()), []);

  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Feather name="calendar" size={36} color={DESIGN_TOKENS.colors.textMuted} />
        <Text style={styles.emptyTitle}>{t('badges.noUpcomingBills')}</Text>
        <Text style={styles.emptyText}>
          {t('common.emptySubtitle')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {events.map((item) => {
        const isPast = item.expectedDate < todayStr;
        const isIncome = item.kind === 'INCOME';
        const isTransfer = item.kind === 'TRANSFER';
        const isExpense = item.kind === 'EXPENSE';

        const handleCardPress = () => {
          if (isIncome && item.rawIncome && onEditUpcomingIncome) {
            onEditUpcomingIncome(item.rawIncome);
          } else if (isExpense && item.rawExpense && onEditUpcomingExpense) {
            onEditUpcomingExpense(item.rawExpense);
          }
        };

        const handleSwipeDelete = () => {
          if (isIncome && onDeleteUpcomingIncome && item.rawIncome) {
            onDeleteUpcomingIncome(item.rawIncome);
          } else if (isExpense && onDeleteUpcomingExpense && item.rawExpense) {
            onDeleteUpcomingExpense(item.rawExpense);
          } else if (isTransfer && onDeleteUpcomingTransfer && item.rawTransfer) {
            onDeleteUpcomingTransfer(item.rawTransfer);
          }
        };

        return (
          <SwipeableCard
            key={`${item.kind}_${item.id}`}
            onSwipeDelete={handleSwipeDelete}
          >
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={handleCardPress}
            >
              {/* Top Row: Date + Overdue Badge + Drawer Indicator */}
              <View style={styles.topRow}>
                <View style={styles.dateContainer}>
                  <Text
                    style={[
                      styles.cardDate,
                      isPast && styles.cardDateOverdue,
                    ]}
                  >
                    {formatDate(item.expectedDate)}
                  </Text>
                  {isPast && (
                    <View style={styles.overdueBadge}>
                      <Text style={styles.overdueBadgeText}>
                        {t('common.overdue') || 'Overdue'}
                      </Text>
                    </View>
                  )}
                </View>

                <CardDrawerIndicator size={16} color="#94A3B8" />
              </View>

              {/* Middle Row: Name + Color-Coded Amount */}
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text
                  style={[
                    styles.cardAmount,
                    isIncome && styles.cardAmountIncome,
                    isExpense && styles.cardAmountExpense,
                    isTransfer && styles.cardAmountTransfer,
                  ]}
                >
                  {isIncome ? '+' : isTransfer ? '↔' : '−'}
                  {formatAUD(item.expectedAmount)}
                </Text>
              </View>

              {/* Bottom Row: Context-aware Link Chip + Action Trigger Button */}
              <View style={styles.bottomRow}>
                {/* Entity Navigation Chip */}
                <View style={styles.entityContainer}>
                  {isIncome && item.accountId ? (
                    <EntityLinkChip
                      label={item.accountName || t('common.account') || 'Account'}
                      isPrivate={item.isPrivate}
                      icon="credit-card"
                      onPress={() => {
                        router.push('/(app)/settings?tab=bank-accounts&returnTo=/(app)/paychecks' as Href);
                      }}
                    />
                  ) : isExpense && item.poolId ? (
                    <EntityLinkChip
                      label={item.categoryName || t('categories.typeLabel')}
                      icon="folder"
                      onPress={() => {
                        router.push(`/(app)/pools/${item.poolId}?returnTo=/(app)/paychecks` as Href);
                      }}
                    />
                  ) : isTransfer && item.sourcePoolId ? (
                    <View style={styles.transferEntities}>
                      <EntityLinkChip
                        label={item.sourcePoolName || 'Source'}
                        icon="folder"
                        onPress={() => {
                          router.push(`/(app)/pools/${item.sourcePoolId}?returnTo=/(app)/paychecks` as Href);
                        }}
                      />
                      <Text style={styles.transferArrow}>➔</Text>
                      {item.destinationPoolId && (
                        <EntityLinkChip
                          label={item.destinationPoolName || 'Dest'}
                          icon="folder"
                          onPress={() => {
                            router.push(`/(app)/pools/${item.destinationPoolId}?returnTo=/(app)/paychecks` as Href);
                          }}
                        />
                      )}
                    </View>
                  ) : (
                    <Text style={styles.entityFallbackText}>
                      {item.accountName || item.categoryName || '—'}
                    </Text>
                  )}
                </View>

                {/* Action Button */}
                {isIncome ? (
                  <TouchableOpacity
                    style={styles.processBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      onOpenPaydayWizard(item.id);
                    }}
                  >
                    <Feather name="play" size={12} color="#FFF" />
                    <Text style={styles.processBtnText}>{t('common.runSplit')}</Text>
                  </TouchableOpacity>
                ) : isTransfer ? (
                  <TouchableOpacity
                    style={styles.transferBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      if (item.rawTransfer && onExecuteTransfer) {
                        onExecuteTransfer(item.rawTransfer);
                      }
                    }}
                  >
                    <Feather name="repeat" size={12} color="#FFF" />
                    <Text style={styles.transferBtnText}>{t('common.transfer')}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.payBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      onMarkExpensePaid(item.id, item.expectedAmount);
                    }}
                  >
                    <Feather name="check" size={12} color="#FFF" />
                    <Text style={styles.payBtnText}>{t('common.markSpent')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          </SwipeableCard>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDate: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  cardDateOverdue: {
    color: '#DC2626',
    fontWeight: '700',
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  overdueBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B91C1C',
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
    flex: 1,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'monospace',
    fontVariant: ['tabular-nums'],
  },
  cardAmountIncome: {
    color: '#059669', // Emerald
  },
  cardAmountExpense: {
    color: '#E11D48', // Rose
  },
  cardAmountTransfer: {
    color: '#4F46E5', // Indigo
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  entityContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transferEntities: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  transferArrow: {
    fontSize: 10,
    color: '#94A3B8',
  },
  entityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
    maxWidth: '85%',
  },
  entityChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  entityChipIcon: {
    fontSize: 10,
    color: '#60A5FA',
    fontWeight: 'bold',
  },
  entityFallbackText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    fontStyle: 'italic',
  },
  processBtn: {
    backgroundColor: DESIGN_TOKENS.colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  processBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  payBtn: {
    backgroundColor: '#059669',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  payBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  transferBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  transferBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
