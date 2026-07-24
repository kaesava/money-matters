import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { DESIGN_TOKENS, MobileModalDialog } from '@money-matters/ui';
import { trpc } from '../lib/trpc';
import { formatAUD } from '../lib/format';

interface SourceBurstDetailModalProps {
  visible: boolean;
  mode: 'INCOME' | 'EXPENSE';
  sourceId: string | null;
  sourceName: string;
  sourceAmount: string;
  categoryName?: string;
  onClose: () => void;
}

export function SourceBurstDetailModal({
  visible,
  mode,
  sourceId,
  sourceName,
  sourceAmount,
  categoryName,
  onClose,
}: SourceBurstDetailModalProps) {
  const incomeEventsQuery = trpc.listIncomeEvents.useQuery(undefined, { enabled: visible && mode === 'INCOME' });
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, { enabled: visible && mode === 'EXPENSE' });

  const events = mode === 'INCOME'
    ? (incomeEventsQuery.data ?? []).filter((e) => e.incomeSourceId === sourceId)
    : (expenseEventsQuery.data ?? []).filter((e) => e.expenseSourceId === sourceId);

  const isLoading = mode === 'INCOME' ? incomeEventsQuery.isLoading : expenseEventsQuery.isLoading;

  const D = DESIGN_TOKENS;

  return (
    <MobileModalDialog
      visible={visible && !!sourceId}
      onClose={onClose}
      title={sourceName}
      subtitle={`12-Month Rolling Burst Schedule • ${formatAUD(sourceAmount)}`}
    >
      {categoryName ? (
        <View style={styles.catBadge}>
          <Text style={styles.catBadgeText}>Category: {categoryName}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Upcoming Burst Events ({events.length})</Text>

      {isLoading ? (
        <ActivityIndicator color={D.colors.accent} style={{ marginVertical: 20 }} />
      ) : events.length === 0 ? (
        <Text style={styles.emptyText}>No burst events generated yet.</Text>
      ) : (
        <View style={styles.list}>
          {events.map((evt) => (
            <View key={evt.id} style={styles.row}>
              <View>
                <Text style={styles.dateText}>
                  {new Date(evt.expectedDate).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                <Text style={styles.statusText}>Status: {evt.status}</Text>
              </View>
              <Text style={[styles.amountText, mode === 'INCOME' && { color: '#10B981' }]}>
                {mode === 'INCOME' ? '+' : '-'}{formatAUD(evt.expectedAmount)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </MobileModalDialog>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  catBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8 },
  catBadgeText: { fontSize: 11, fontWeight: '700', color: D.colors.textMuted },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: D.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  emptyText: { fontSize: 12, color: D.colors.textMuted, marginVertical: 12 },
  list: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dateText: { fontSize: 13, fontWeight: '700', color: D.colors.primary },
  statusText: { fontSize: 10, color: D.colors.textMuted },
  amountText: { fontSize: 14, fontWeight: '800', color: D.colors.primary },
});
