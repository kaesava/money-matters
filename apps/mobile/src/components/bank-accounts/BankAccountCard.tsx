import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BankProviderBadge } from '@money-matters/ui/mobile';
import { formatAUD } from '../../lib/format';
import { LinkedPoolItem } from './LinkedPoolsModalSheet';

export interface BankAccountCardData {
  id: string;
  name: string;
  bankProvider?: string | null;
  lastKnownBalance?: string | null;
  unbudgetedBuffer?: string | null;
  expectedBalance?: string | number | null;
  isPrivate?: boolean;
}

export interface BankAccountCardProps {
  account: BankAccountCardData;
  linkedPools: LinkedPoolItem[];
  onPressEdit: () => void;
  onPressAlign: () => void;
  onPressPool: (poolId: string) => void;
  onPressMorePools: () => void;
}

export function BankAccountCard({
  account,
  linkedPools,
  onPressEdit,
  onPressAlign,
  onPressPool,
  onPressMorePools,
}: BankAccountCardProps) {
  const actualBal = parseFloat(account.lastKnownBalance || '0');
  const buffer = parseFloat(account.unbudgetedBuffer || '0');
  const availBal = Math.max(0, actualBal - buffer);

  const poolsTotal = linkedPools.reduce(
    (sum: number, p) =>
      sum +
      (typeof p.currentBalance === 'number'
        ? p.currentBalance
        : parseFloat(String(p.currentBalance || '0'))),
    0
  );

  const diff = Math.round((availBal - poolsTotal) * 100) / 100;
  const hasDiff = linkedPools.length > 0 && Math.abs(diff) >= 0.01;

  const displayPools = linkedPools.slice(0, 2);
  const remainingCount = Math.max(0, linkedPools.length - 2);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPressEdit}
      style={styles.card}
    >
      {/* Top Header: Account Name & Balance */}
      <View style={styles.cardHeader}>
        <View style={styles.titleCol}>
          <View style={styles.titleRow}>
            <BankProviderBadge
              provider={account.bankProvider}
              size="sm"
            />
            <Text style={styles.accountName} numberOfLines={1}>
              {account.name}
            </Text>
            {account.isPrivate && (
              <View style={styles.privatePill}>
                <Text style={styles.privateText}>🔒 Private</Text>
              </View>
            )}
          </View>

          {/* Alignment Status Row */}
          {!hasDiff ? (
            <View style={styles.balancedRow}>
              <View style={styles.greenDot} />
              <Text style={styles.balancedText}>
                Expected {formatAUD(poolsTotal)}. Balanced ✓
              </Text>
            </View>
          ) : (
            <View style={styles.diffRow}>
              <Text style={styles.expectedText}>
                Expected {formatAUD(poolsTotal)}.
              </Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onPressAlign();
                }}
                style={styles.alignBtn}
              >
                <View style={styles.pulseDot} />
                <Text style={styles.alignBtnText}>
                  {diff > 0
                    ? `Align Surplus (${formatAUD(diff)})`
                    : `Align Shortfall (${formatAUD(Math.abs(diff))})`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Balance Display */}
        <View style={styles.balanceCol}>
          <Text style={styles.balanceAmount}>{formatAUD(availBal)}</Text>
          <Text style={styles.balanceSub}>
            {buffer > 0
              ? `Actual: ${formatAUD(actualBal)} (Buffer ${formatAUD(buffer)})`
              : 'Available'}
          </Text>
        </View>
      </View>

      {/* Linked Pools Compact Row */}
      <View style={styles.poolsRow}>
        <Text style={styles.poolsLabel}>Pools:</Text>
        {linkedPools.length === 0 ? (
          <Text style={styles.noPoolsText}>No pools linked</Text>
        ) : (
          <View style={styles.pillsContainer}>
            {displayPools.map((p) => {
              const bal = typeof p.currentBalance === 'number'
                ? p.currentBalance
                : parseFloat(String(p.currentBalance || '0'));
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={(e) => {
                    e.stopPropagation();
                    onPressPool(p.id);
                  }}
                  style={styles.poolPill}
                >
                  <Text style={styles.poolPillName}>{p.name}</Text>
                  <Text style={styles.poolPillBal}>{formatAUD(bal)}</Text>
                </TouchableOpacity>
              );
            })}

            {remainingCount > 0 && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onPressMorePools();
                }}
                style={styles.morePill}
              >
                <Text style={styles.morePillText}>+{remainingCount} more</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleCol: {
    flex: 1,
    paddingRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  accountName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  privatePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  privateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  balancedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  balancedText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  expectedText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  alignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D97706',
  },
  alignBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  balanceCol: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: 17,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  balanceSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  poolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  poolsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  noPoolsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  pillsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  poolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  poolPillName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  poolPillBal: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#64748B',
  },
  morePill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  morePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
});
