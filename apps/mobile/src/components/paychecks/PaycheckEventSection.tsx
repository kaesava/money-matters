import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatIsoDate } from '../../lib/format';
import { PaycheckEventCard } from './events/PaycheckEventCard';

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
      {events.map((item) => (
        <PaycheckEventCard
          key={`${item.kind}_${item.id}`}
          item={item}
          todayStr={todayStr}
          onOpenPaydayWizard={onOpenPaydayWizard}
          onEditUpcomingIncome={onEditUpcomingIncome}
          onDeleteUpcomingIncome={onDeleteUpcomingIncome}
          onEditUpcomingExpense={onEditUpcomingExpense}
          onDeleteUpcomingExpense={onDeleteUpcomingExpense}
          onMarkExpensePaid={onMarkExpensePaid}
          onExecuteTransfer={onExecuteTransfer}
          onDeleteUpcomingTransfer={onDeleteUpcomingTransfer}
        />
      ))}
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
});

export default PaycheckEventSection;
