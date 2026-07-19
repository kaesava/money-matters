import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { formatAUD, formatRelativeDate } from '../lib/format';

interface TransactionRowProps {
  amount: string;
  flowType: 'DEBIT' | 'CREDIT';
  categoryName: string;
  note: string | null;
  recordedAt: string | Date;
}

export function TransactionRow({ amount, flowType, categoryName, note, recordedAt }: TransactionRowProps) {
  const isDebit = flowType === 'DEBIT';
  const D = DESIGN_TOKENS;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.category}>{categoryName}</Text>
        {note && <Text style={styles.note}>{note}</Text>}
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: isDebit ? D.colors.critical : D.colors.success }]}>
          {isDebit ? '-' : '+'}{formatAUD(amount)}
        </Text>
        <Text style={styles.date}>{formatRelativeDate(recordedAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  left: { flex: 1, marginRight: 16 },
  right: { alignItems: 'flex-end' },
  category: { fontSize: 15, fontWeight: '600', color: DESIGN_TOKENS.colors.textPrimary, marginBottom: 2 },
  note: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, fontStyle: 'italic' },
  amount: { fontSize: 15, fontWeight: '700' },
  date: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, marginTop: 2 },
});
