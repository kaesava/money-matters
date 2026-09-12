import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD, formatRelativeDate } from '../lib/format';

export interface TransactionRowProps {
  id?: string;
  amount: string | number;
  flowType: 'DEBIT' | 'CREDIT' | 'TRANSFER';
  poolName?: string | null;
  categoryName?: string | null;
  note?: string | null;
  recordedAt: string | Date;
  sourcePoolName?: string | null;
  destPoolName?: string | null;
}

export function TransactionRow({
  amount,
  flowType,
  poolName,
  categoryName,
  note,
  recordedAt,
  sourcePoolName,
  destPoolName,
}: TransactionRowProps) {
  const isDebit = flowType === 'DEBIT';
  const isCredit = flowType === 'CREDIT';
  const isTransfer =
    flowType === 'TRANSFER' ||
    (note && (note.includes('Transfer to') || note.includes('Transfer from')));

  const displayName =
    sourcePoolName && destPoolName
      ? `${sourcePoolName} ➔ ${destPoolName}`
      : poolName || categoryName || 'Everyday Pool';

  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        {isTransfer ? (
          <Feather name="repeat" size={16} color="#2563eb" />
        ) : isDebit ? (
          <Feather name="arrow-up-right" size={16} color="#ba1a1a" />
        ) : (
          <Feather name="arrow-down-left" size={16} color="#22c55e" />
        )}
      </View>

      <View style={styles.left}>
        <Text style={styles.category} numberOfLines={1}>
          {displayName}
        </Text>
        {note && note !== displayName && (
          <Text style={styles.note} numberOfLines={1}>
            {note}
          </Text>
        )}
      </View>

      <View style={styles.right}>
        <Text
          style={[
            styles.amount,
            isTransfer
              ? styles.transferAmount
              : isDebit
              ? styles.debitAmount
              : styles.creditAmount,
          ]}
        >
          {isDebit ? '-' : isCredit ? '+' : ''}
          {formatAUD(amount)}
        </Text>
        <Text style={styles.date}>{formatRelativeDate(recordedAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  left: {
    flex: 1,
  },
  category: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  note: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  debitAmount: {
    color: '#ba1a1a',
  },
  creditAmount: {
    color: '#22c55e',
  },
  transferAmount: {
    color: '#2563eb',
  },
  date: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
});

export default TransactionRow;
