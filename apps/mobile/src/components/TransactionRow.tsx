import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD, formatDate } from '../lib/format';

export interface TransactionRowProps {
  id?: string;
  amount: string | number;
  flowType: 'DEBIT' | 'CREDIT' | 'TRANSFER';
  rawFlowType?: 'DEBIT' | 'CREDIT';
  poolName?: string | null;
  categoryName?: string | null;
  note?: string | null;
  recordedAt: string | Date;
  sourcePoolName?: string | null;
  destPoolName?: string | null;
  onPress?: () => void;
}

export function TransactionRow({
  amount,
  flowType,
  rawFlowType,
  poolName,
  categoryName,
  note,
  recordedAt,
  onPress,
}: TransactionRowProps) {
  const isTransfer =
    flowType === 'TRANSFER' ||
    (note && (note.includes('Transfer to') || note.includes('Transfer from') || note.includes('➔')));

  // Use rawFlowType (DEBIT/CREDIT) if provided, or derive from flowType
  const effectiveFlow = rawFlowType || (flowType === 'DEBIT' ? 'DEBIT' : flowType === 'CREDIT' ? 'CREDIT' : 'DEBIT');
  const isDebit = effectiveFlow === 'DEBIT';
  const isCredit = effectiveFlow === 'CREDIT';

  // Fallback label for display
  const displayName = categoryName || poolName || (isTransfer ? 'Transfer' : 'Transaction');

  // Primary info: Date & Description (note or displayName)
  const primaryDescription = note || displayName;
  const secondaryPool = note ? (poolName || categoryName) : null;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <View style={styles.left}>
          <Text style={styles.date}>{formatDate(recordedAt)}</Text>
          <View style={styles.descriptionRow}>
            <Text style={styles.description} numberOfLines={1}>
              {primaryDescription}
            </Text>
            {onPress && (
              <Feather name="arrow-up-right" size={12} color="#2563eb" style={styles.linkIcon} />
            )}
          </View>
        </View>

        <View style={styles.right}>
          <Text
            style={[
              styles.amount,
              isDebit ? styles.debitAmount : styles.creditAmount,
            ]}
          >
            {isDebit ? '-' : '+'}
            {formatAUD(amount)}
          </Text>
        </View>
      </View>

      {secondaryPool && (
        <View style={styles.cardFooter}>
          <View style={styles.poolWrap}>
            <View style={styles.iconWrap}>
              {isTransfer ? (
                <Feather name="repeat" size={11} color="#2563eb" />
              ) : isDebit ? (
                <Feather name="arrow-up-right" size={11} color="#ba1a1a" />
              ) : (
                <Feather name="arrow-down-left" size={11} color="#22c55e" />
              )}
            </View>
            <Text style={styles.poolName} numberOfLines={1}>
              {secondaryPool}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  left: {
    flex: 1,
  },
  date: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 3,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  description: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  linkIcon: {
    marginTop: 1,
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
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  poolWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  poolName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
});

export default TransactionRow;
