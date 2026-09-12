import React, { useState } from 'react';
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
  const D = DESIGN_TOKENS;

  const sourceAccount = React.useMemo(() => {
    if (receivingAccountId) {
      return bankAccounts.find((a) => a.id === receivingAccountId) || null;
    }
    return bankAccounts[0] || null;
  }, [receivingAccountId, bankAccounts]);

  const sourceAccountName = sourceAccount?.name || 'Receiving Account';

  const { retainedItems, retainedTotal, externalTransfers } = React.useMemo(() => {
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
        const destName = pool.bankAccountName || destAcc?.name || 'External Account';

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
      await Share.share({
        message: amount.toFixed(2),
        title: 'Transfer Amount',
      });
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Ignored
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Feather name="send" size={16} color="#2563eb" />
        <Text style={styles.title}>Physical Bank Transfers Rollup</Text>
      </View>
      <Text style={styles.subtitle}>
        Move funds across physical accounts in your banking app after confirmation:
      </Text>

      {/* External transfers list */}
      {externalTransfers.length > 0 ? (
        <View style={styles.transfersList}>
          {externalTransfers.map((tx) => (
            <View key={tx.destAccountId} style={styles.transferItem}>
              <View style={styles.transferTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.destName}>{tx.destAccountName}</Text>
                  <Text style={styles.sourceDesc}>From {tx.sourceAccountName}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleCopyAmount(tx.destAccountId, tx.totalAmount)}
                  style={styles.copyPill}
                >
                  <Text style={styles.amountNum}>{formatAUD(tx.totalAmount)}</Text>
                  <Text style={styles.copyText}>
                    {copiedKey === tx.destAccountId ? '✓' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.poolChipsRow}>
                {tx.pools.map((p) => (
                  <View key={p.id} style={styles.poolChip}>
                    <Text style={styles.poolChipText}>
                      {p.name}: {formatAUD(p.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.noTransfersBox}>
          <Text style={styles.noTransfersText}>
            ✅ All allocations stay within {sourceAccountName}. No physical external bank transfer required!
          </Text>
        </View>
      )}

      {/* Retained funds in source account */}
      {retainedItems.length > 0 && (
        <View style={styles.retainedSection}>
          <Text style={styles.retainedLabel}>
            Retained in {sourceAccountName}: {formatAUD(retainedTotal)}
          </Text>
          <View style={styles.retainedChips}>
            {retainedItems.map((r) => (
              <Text key={r.id} style={styles.retainedChip}>
                {r.name} ({formatAUD(r.amount)})
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

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
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
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
    alignItems: 'center',
  },
  destName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  sourceDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  amountNum: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#2563eb',
  },
  copyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  poolChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  poolChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  poolChipText: {
    fontSize: 10,
    color: '#475569',
  },
  noTransfersBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 12,
  },
  noTransfersText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
    lineHeight: 16,
  },
  retainedSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    gap: 4,
  },
  retainedLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  retainedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  retainedChip: {
    fontSize: 10,
    color: '#94A3B8',
  },
});

export default MobileBankTransferRollupCard;
