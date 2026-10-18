import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Share } from 'react-native';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  MobileButton,
} from '@money-matters/ui/mobile';
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

export interface MobilePaydayTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  receivingAccountId?: string | null;
  pools: MobileBankTransferPool[];
  linesMap: Record<string, string>;
  sweepPoolId?: string;
  sweepPoolRemainder: number;
  bankAccounts: MobileBankTransferAccount[];
}

export const MobilePaydayTransferModal: React.FC<MobilePaydayTransferModalProps> = ({
  isOpen,
  onClose,
  receivingAccountId,
  pools,
  linesMap,
  sweepPoolId,
  sweepPoolRemainder,
  bankAccounts,
}) => {
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
      if (typeof navigator !== 'undefined' && (navigator as { clipboard?: { writeText: (s: string) => Promise<void> } }).clipboard?.writeText) {
        await (navigator as { clipboard: { writeText: (s: string) => Promise<void> } }).clipboard.writeText(amount.toFixed(2));
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

  const totalTransfers = externalTransfers.length;

  return (
    <MobileModalDialog
      visible={isOpen}
      onClose={onClose}
      title={t('cards.paydayTransfer.badge')}
      subtitle={
        totalTransfers > 0
          ? t('cards.paydayTransfer.rollupDescription')
          : t('cards.paydayTransfer.allRetainedDescription')
      }
    >
      <View style={styles.content}>
        {totalTransfers === 0 && retainedItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('cards.paydayTransfer.allRetainedDescription')}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {retainedItems.length > 0 && (
              <RollupRetainedCard
                sourceAccountName={sourceAccountName}
                retainedTotal={retainedTotal}
                retainedItems={retainedItems}
              />
            )}

            {externalTransfers.map((tx) => (
              <RollupTransferItem
                key={tx.destAccountId}
                tx={tx}
                isCopied={copiedKey === tx.destAccountId}
                onCopyAmount={handleCopyAmount}
              />
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <MobileButton
            variant="primary"
            onPress={onClose}
            title={t('common.done')}
          />
        </View>
      </View>
    </MobileModalDialog>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  list: {
    gap: 12,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.slate[500],
    textAlign: 'center',
  },
  footer: {
    marginTop: 8,
  },
});
