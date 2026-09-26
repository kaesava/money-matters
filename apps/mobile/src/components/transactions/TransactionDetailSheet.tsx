import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MobileModalDialog, MobileButton } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../lib/format';

export interface TransactionDetailRecord {
  id: string;
  amount: string | number;
  flowType: 'DEBIT' | 'CREDIT' | 'TRANSFER';
  rawFlowType?: 'DEBIT' | 'CREDIT';
  transactionType?: string | null;
  poolId?: string | null;
  poolName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  bankAccountId?: string | null;
  bankAccountName?: string | null;
  note?: string | null;
  recordedAt: string | Date;
  source?: string | null;
  isTransfer?: boolean;
}

interface TransactionDetailSheetProps {
  visible: boolean;
  transaction: TransactionDetailRecord | null;
  onClose: () => void;
  onNavigateToPool?: (poolId: string) => void;
}

export function TransactionDetailSheet({
  visible,
  transaction,
  onClose,
  onNavigateToPool,
}: TransactionDetailSheetProps) {
  if (!transaction) return null;

  const isDebit = transaction.rawFlowType === 'DEBIT' || transaction.flowType === 'DEBIT';
  const amountStr = `${isDebit ? '-' : '+'}${formatAUD(transaction.amount)}`;
  const displayPool = transaction.poolName || transaction.categoryName || 'Everyday Pool';

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('transactions.details')}
      subtitle={formatDate(transaction.recordedAt)}
      footer={
        <View style={styles.footerWrap}>
          {transaction.poolId && onNavigateToPool ? (
            <MobileButton
              variant="primary"
              onPress={() => {
                onClose();
                onNavigateToPool(transaction.poolId!);
              }}
            >
              {t('categories.title')}
            </MobileButton>
          ) : (
            <MobileButton variant="secondary" onPress={onClose}>
              {t('common.close')}
            </MobileButton>
          )}
        </View>
      }
    >
      <View style={styles.container}>
        {/* Hero Amount Display */}
        <View style={styles.heroBox}>
          <Text style={[styles.heroAmount, isDebit ? styles.debitText : styles.creditText]}>
            {amountStr}
          </Text>
          <View style={[styles.flowBadge, isDebit ? styles.debitBadge : styles.creditBadge]}>
            <Text style={[styles.flowBadgeText, isDebit ? styles.debitBadgeText : styles.creditBadgeText]}>
              {transaction.isTransfer
                ? t('common.transfer')
                : isDebit
                ? t('common.expense')
                : t('common.income')}
            </Text>
          </View>
        </View>

        {/* Audit Metadata Rows */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t('common.description')}</Text>
            <Text style={styles.metaValue}>{transaction.note || displayPool}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t('categories.typeLabel')}</Text>
            <Text style={styles.metaValueHighlight}>{displayPool}</Text>
          </View>

          {transaction.bankAccountName && (
            <>
              <View style={styles.divider} />
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>{t('bankAccounts.title')}</Text>
                <Text style={styles.metaValue}>{transaction.bankAccountName}</Text>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t('transactions.date')}</Text>
            <Text style={styles.metaValueMono}>{formatDate(transaction.recordedAt)}</Text>
          </View>
        </View>
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 8,
  },
  heroBox: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  debitText: { color: '#ba1a1a' },
  creditText: { color: '#22c55e' },
  flowBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  debitBadge: { backgroundColor: '#FEE2E2' },
  creditBadge: { backgroundColor: '#DCFCE7' },
  flowBadgeText: { fontSize: 12, fontWeight: '800' },
  debitBadgeText: { color: '#ba1a1a' },
  creditBadgeText: { color: '#166534' },
  metaCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
    maxWidth: '65%',
    textAlign: 'right',
  },
  metaValueHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
    maxWidth: '65%',
    textAlign: 'right',
  },
  metaValueMono: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#334155',
  },
  divider: {
    height: 1,
    backgroundColor: '#EDF2F7',
  },
  footerWrap: {
    paddingTop: 8,
  },
});
