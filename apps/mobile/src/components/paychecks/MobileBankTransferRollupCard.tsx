import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../lib/format';

export interface MobileBankTransferPool {
  id: string;
  name: string;
  poolType?: string;
  bankAccountId?: string | null;
  bankAccountName?: string | null;
}

export interface MobileBankTransferAccount {
  id: string;
  name: string;
  institution?: string | null;
  bsb?: string | null;
  accountNumber?: string | null;
  payId?: string | null;
}

export interface MobileBankTransferRollupCardProps {
  receivingAccountId?: string | null;
  pools: MobileBankTransferPool[];
  linesMap: Record<string, string>;
  sweepPoolId?: string;
  sweepPoolRemainder: number;
  bankAccounts: MobileBankTransferAccount[];
}

interface DestinationTransferGroup {
  destAccountId: string;
  destAccountName: string;
  sourceAccountName: string;
  totalAmount: number;
  payId?: string | null;
  pools: Array<{ id: string; name: string; amount: number }>;
}

export function MobileBankTransferRollupCard({
  receivingAccountId,
  pools,
  linesMap,
  sweepPoolId,
  sweepPoolRemainder,
  bankAccounts,
}: MobileBankTransferRollupCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const sourceAccount = useMemo(() => {
    if (receivingAccountId) {
      return bankAccounts.find((a) => a.id === receivingAccountId) || null;
    }
    return bankAccounts[0] || null;
  }, [receivingAccountId, bankAccounts]);

  const sourceAccountName = sourceAccount?.name || t('cards.paydayTransfer.sourceAccountDefault');

  const { retainedItems, retainedTotal, externalTransfers } = useMemo(() => {
    const retained: Array<{ id: string; name: string; amount: number }> = [];
    const transferMap = new Map<string, DestinationTransferGroup>();

    for (const pool of pools) {
      const amount =
        pool.id === sweepPoolId
          ? Math.max(0, sweepPoolRemainder)
          : parseFloat(linesMap[pool.id] || '0');

      if (amount <= 0.005) continue;

      const isSameAccount =
        (receivingAccountId && pool.bankAccountId === receivingAccountId) ||
        (!pool.bankAccountId && (!receivingAccountId || pool.bankAccountId === receivingAccountId));

      if (isSameAccount) {
        retained.push({ id: pool.id, name: pool.name, amount });
      } else {
        const destId = pool.bankAccountId || 'unknown-dest';
        const destAcc = bankAccounts.find((a) => a.id === destId);
        const destName = pool.bankAccountName || destAcc?.name || t('cards.paydayTransfer.destAccountDefault');

        const existing = transferMap.get(destId);
        if (existing) {
          existing.totalAmount += amount;
          existing.pools.push({ id: pool.id, name: pool.name, amount });
        } else {
          transferMap.set(destId, {
            destAccountId: destId,
            destAccountName: destName,
            sourceAccountName,
            totalAmount: amount,
            payId: destAcc?.payId,
            pools: [{ id: pool.id, name: pool.name, amount }],
          });
        }
      }
    }

    const retainedSum = retained.reduce((s, r) => s + r.amount, 0);
    return {
      retainedItems: retained,
      retainedTotal: retainedSum,
      externalTransfers: Array.from(transferMap.values()),
    };
  }, [pools, linesMap, sweepPoolId, sweepPoolRemainder, receivingAccountId, bankAccounts, sourceAccountName]);

  const handleCopyAmount = async (key: string, amount: number) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(amount.toFixed(2));
      } else {
        await Share.share({
          message: amount.toFixed(2),
          title: t('cards.paydayTransfer.transfersRequired'),
        });
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Ignored
    }
  };

  const totalItems = (retainedItems.length > 0 ? 1 : 0) + externalTransfers.length;
  if (totalItems === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badgeWrap}>
          <Text style={styles.badgeText}>
            {t('cards.paydayTransfer.badge')}
          </Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        {externalTransfers.length > 0
          ? t('cards.paydayTransfer.rollupDescription')
          : t('cards.paydayTransfer.allRetainedDescription')}
      </Text>

      {/* Retained funds in source account */}
      {retainedItems.length > 0 && (
        <View style={styles.retainedCard}>
          <View style={styles.retainedHeader}>
            <View style={styles.retainedTitleRow}>
              <Text style={styles.checkmarkIcon}>✓</Text>
              <Text style={styles.retainedTitle}>
                {t('cards.paydayTransfer.retainedTitle')} {sourceAccountName}
              </Text>
            </View>
            <Text style={styles.retainedAmountText}>
              {formatAUD(retainedTotal)}
            </Text>
          </View>

          <Text style={styles.retainedDesc}>
            {t('cards.paydayTransfer.noTransferNeeded')}{' '}
            <Text style={styles.retainedBoldList}>
              {retainedItems.map((r) => `${r.name} (${formatAUD(r.amount)})`).join(', ')}
            </Text>
          </Text>
        </View>
      )}

      {/* External transfers list */}
      {externalTransfers.length > 0 && (
        <View style={styles.transfersSection}>
          <Text style={styles.sectionHeader}>
            {t('cards.paydayTransfer.transfersRequired')} ({externalTransfers.length})
          </Text>

          <View style={styles.transfersList}>
            {externalTransfers.map((tx) => {
              const isCopied = copiedKey === tx.destAccountId;

              return (
                <View key={tx.destAccountId} style={styles.transferItem}>
                  <View style={styles.transferTop}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.transferDirectionRow}>
                        <Text style={styles.sourceName}>{tx.sourceAccountName}</Text>
                        <Text style={styles.arrowIcon}>→</Text>
                        <Text style={styles.destName}>{tx.destAccountName}</Text>
                      </View>

                      {tx.payId && (
                        <Text style={styles.payIdText}>PayID: {tx.payId}</Text>
                      )}
                    </View>

                    <View style={styles.amountActionCol}>
                      <Text style={styles.amountNum}>{formatAUD(tx.totalAmount)}</Text>
                      <TouchableOpacity
                        onPress={() => handleCopyAmount(tx.destAccountId, tx.totalAmount)}
                        style={[styles.copyPill, isCopied && styles.copiedPill]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.copyText, isCopied && styles.copiedText]}>
                          {isCopied
                            ? t('cards.paydayTransfer.copiedCheck')
                            : t('cards.paydayTransfer.copyAmount', { symbol: '$' })}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.coversPoolsText}>
                    <Text style={styles.coversPoolsBold}>
                      {t('cards.paydayTransfer.coversPools', { count: tx.pools.length })}
                    </Text>
                    {tx.pools.map((p) => `${p.name} (${formatAUD(p.amount)})`).join(', ')}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Single account pro-tip when no external transfers are needed */}
      {externalTransfers.length === 0 && (
        <View style={styles.singleAccountTip}>
          <View style={styles.tipHeader}>
            <Text style={styles.singleAccountTipTitle}>
              {t('cards.paydayTransfer.singleAccountProTipTitle')}
            </Text>
          </View>
          <Text style={styles.singleAccountTipDesc}>
            {t('cards.paydayTransfer.singleAccountProTipDesc')}
          </Text>
        </View>
      )}
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeWrap: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  retainedCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  retainedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retainedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  checkmarkIcon: {
    fontSize: 12,
    fontWeight: '900',
    color: '#059669',
  },
  retainedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#065F46',
  },
  retainedAmountText: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#047857',
  },
  retainedDesc: {
    fontSize: 11,
    color: '#047857',
    lineHeight: 16,
  },
  retainedBoldList: {
    fontWeight: '700',
  },
  transfersSection: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transfersList: {
    gap: 10,
  },
  transferItem: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  transferTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  transferDirectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  sourceName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  arrowIcon: {
    fontSize: 11,
    color: '#94A3B8',
  },
  destName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },
  payIdText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#94A3B8',
    marginTop: 2,
  },
  amountActionCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountNum: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  copyPill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  copiedPill: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  copyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
  },
  copiedText: {
    color: '#059669',
  },
  coversPoolsText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  coversPoolsBold: {
    fontWeight: '700',
    color: '#475569',
  },
  singleAccountTip: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  tipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  singleAccountTipTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E40AF',
  },
  singleAccountTipDesc: {
    fontSize: 11,
    color: '#1E3A8A',
    lineHeight: 16,
  },
});
