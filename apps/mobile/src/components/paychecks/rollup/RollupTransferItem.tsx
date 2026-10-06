import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../../lib/format';

interface DestinationTransferGroup {
  destAccountId: string;
  destAccountName: string;
  sourceAccountName: string;
  totalAmount: number;
  payId?: string | null;
  pools: Array<{ id: string; name: string; amount: number }>;
}

interface RollupTransferItemProps {
  readonly tx: DestinationTransferGroup;
  readonly isCopied: boolean;
  readonly onCopyAmount: (key: string, amount: number) => void;
}

export const RollupTransferItem: React.FC<RollupTransferItemProps> = ({
  tx,
  isCopied,
  onCopyAmount,
}) => {
  return (
    <View style={styles.transferItem}>
      <View style={styles.transferTop}>
        <View style={styles.flex1}>
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
            onPress={() => onCopyAmount(tx.destAccountId, tx.totalAmount)}
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
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  transferItem: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
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
    color: DESIGN_TOKENS.colors.primary,
  },
  arrowIcon: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[400],
  },
  destName: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accent,
  },
  payIdText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.slate[400],
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
    color: DESIGN_TOKENS.colors.primary,
  },
  copyPill: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  copiedPill: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderColor: DESIGN_TOKENS.colors.successBorder,
  },
  copyText: {
    fontSize: 10,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
  copiedText: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  coversPoolsText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    lineHeight: 16,
  },
  coversPoolsBold: {
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
});
