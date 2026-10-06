import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { RollupRetainedCard } from './rollup/RollupRetainedCard';
import { RollupTransferItem } from './rollup/RollupTransferItem';
import { computeBankTransferRollup } from './rollup/computeRollup';

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
    return computeBankTransferRollup({
      pools,
      linesMap,
      sweepPoolId,
      sweepPoolRemainder,
      receivingAccountId,
      bankAccounts,
      sourceAccountName,
    });
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

      {retainedItems.length > 0 && (
        <RollupRetainedCard
          sourceAccountName={sourceAccountName}
          retainedTotal={retainedTotal}
          retainedItems={retainedItems}
        />
      )}

      {externalTransfers.length > 0 && (
        <View style={styles.transfersSection}>
          <Text style={styles.sectionHeader}>
            {t('cards.paydayTransfer.transfersRequired')} ({externalTransfers.length})
          </Text>

          <View style={styles.transfersList}>
            {externalTransfers.map((tx) => (
              <RollupTransferItem
                key={tx.destAccountId}
                tx={tx}
                isCopied={copiedKey === tx.destAccountId}
                onCopyAmount={handleCopyAmount}
              />
            ))}
          </View>
        </View>
      )}

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

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeWrap: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    lineHeight: 18,
  },
  transfersSection: {
    gap: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transfersList: {
    gap: 10,
  },
  singleAccountTip: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
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
    color: DESIGN_TOKENS.colors.accentDark,
  },
  singleAccountTipDesc: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.accentDark,
    lineHeight: 16,
  },
});
