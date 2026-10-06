import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD } from '../../lib/format';
import { t } from '@money-matters/i18n';
import { LinkedPoolItem } from './LinkedPoolsModalSheet';

export interface BankAccountPoolsRowProps {
  linkedPools: LinkedPoolItem[];
  onPressPool: (poolId: string) => void;
  onPressMorePools: () => void;
}

export function BankAccountPoolsRow({
  linkedPools,
  onPressPool,
  onPressMorePools,
}: BankAccountPoolsRowProps) {
  const displayPools = linkedPools.slice(0, 2);
  const remainingCount = Math.max(0, linkedPools.length - 2);

  return (
    <View style={styles.poolsRow}>
      <Text style={styles.poolsLabel}>{t('bankAccounts.poolsLabel')}</Text>
      {linkedPools.length === 0 ? (
        <Text style={styles.noPoolsText}>{t('bankAccounts.noPoolsLinked')}</Text>
      ) : (
        <View style={styles.pillsContainer}>
          {displayPools.map((p) => {
            const bal =
              typeof p.currentBalance === 'number'
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
                <Text style={styles.poolPillName} numberOfLines={1}>
                  {p.name}
                </Text>
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
              <Text style={styles.morePillText}>
                {t('bankAccounts.morePoolsCount', { count: String(remainingCount) })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  poolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.border,
    paddingTop: 10,
  },
  poolsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  noPoolsText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.subtleText,
    fontStyle: 'italic',
  },
  pillsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  poolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: DESIGN_TOKENS.colors.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    maxWidth: 160,
  },
  poolPillName: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.primary,
    flexShrink: 1,
  },
  poolPillBal: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  morePill: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  morePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
  },
});
