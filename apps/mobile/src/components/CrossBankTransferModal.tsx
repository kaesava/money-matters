import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import { DESIGN_TOKENS, MobileModalDialog, MobileButton } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../lib/format';

export interface CrossBankTransferModalProps {
  visible: boolean;
  onClose: () => void;
  sourceAccountName: string;
  destAccountName: string;
  amount: number;
  payId?: string | null;
  bsb?: string | null;
  accountNumber?: string | null;
}

export function CrossBankTransferModal({
  visible,
  onClose,
  sourceAccountName,
  destAccountName,
  amount,
  payId,
  bsb,
  accountNumber,
}: CrossBankTransferModalProps) {
  const [copied, setCopied] = useState(false);
  const D = DESIGN_TOKENS;

  const handleCopyAmount = async () => {
    try {
      await Share.share({
        message: amount.toFixed(2),
        title: 'Transfer Amount',
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignored
    }
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('modals.crossBankTransfer.title')}
      subtitle={t('modals.crossBankTransfer.description')}
      footer={
        <MobileButton
          variant="primary"
          onPress={onClose}
          title={t('common.done')}
        />
      }
    >
      <View style={styles.instructionCard}>
        <View style={styles.row}>
          <Text style={styles.label}>
            {t('modals.crossBankTransfer.fromAccount')}
          </Text>
          <Text style={styles.accountValue}>{sourceAccountName}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>
            {t('modals.crossBankTransfer.toAccount')}
          </Text>
          <View style={styles.destValueCol}>
            <Text style={styles.accountValue}>{destAccountName}</Text>
            {payId ? (
              <Text style={styles.subDetail}>PayID: {payId}</Text>
            ) : null}
            {bsb && accountNumber ? (
              <Text style={styles.subDetail}>
                BSB: {bsb} • Acc: {accountNumber}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.amountDivider} />

        <View style={styles.amountRow}>
          <View>
            <Text style={styles.amountLabel}>
              {t('modals.crossBankTransfer.amount')}
            </Text>
            <Text style={styles.amountVal}>{formatAUD(amount)}</Text>
          </View>

          <TouchableOpacity
            onPress={handleCopyAmount}
            style={styles.copyBtn}
          >
            <Text style={styles.copyBtnText}>
              {copied
                ? t('modals.crossBankTransfer.copiedCheck')
                : t('modals.crossBankTransfer.copyAmount', { symbol: '$' })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  instructionCard: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 14,
    gap: 10,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  accountValue: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  destValueCol: {
    alignItems: 'flex-end',
  },
  subDetail: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
  },
  amountDivider: {
    height: 1,
    backgroundColor: DESIGN_TOKENS.colors.slate[200],
    marginVertical: 4,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  amountVal: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.accent,
  },
  copyBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
});

export default CrossBankTransferModal;
