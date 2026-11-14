import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Share, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { RollupRetainedCard } from './rollup/RollupRetainedCard';
import { RollupTransferItem } from './rollup/RollupTransferItem';
import { computeBankTransferRollup } from './rollup/computeRollup';

export interface MobileBankTransferPool {
  id: string; name: string; poolType?: string; bankAccountId?: string | null; bankAccountName?: string | null;
}

export interface MobileBankTransferAccount {
  id: string; name: string; institution?: string | null; bsb?: string | null; accountNumber?: string | null; payId?: string | null;
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
  const [collapsed, setCollapsed] = useState(true);

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
      <TouchableOpacity
        onPress={() => setCollapsed((prev) => !prev)}
        style={styles.cardHeaderToggle}
        activeOpacity={0.7}
      >
        <View style={styles.toggleTitleRow}>
          <Feather
            name={collapsed ? 'chevron-right' : 'chevron-down'}
            size={16}
            color={DESIGN_TOKENS.colors.textMuted}
          />
          <View style={styles.badgeWrap}>
            <Text style={styles.badgeText}>
              {t('cards.paydayTransfer.badge')}
            </Text>
          </View>
        </View>
        <Text style={styles.headerCountText}>
          {externalTransfers.length > 0
            ? `${externalTransfers.length} ${externalTransfers.length === 1 ? 'Transfer' : 'Transfers'}`
            : t('cards.paydayTransfer.retainedTitle')}
        </Text>
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.contentWrap}>
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
    overflow: 'hidden',
  },
  cardHeaderToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  toggleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  contentWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
    paddingTop: 12,
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
