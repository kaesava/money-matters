import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.pulseDot} />
              <Text style={styles.title}>
                {t('modals.crossBankTransfer.title') || 'Bank Transfer Required'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.description}>
            {t('modals.crossBankTransfer.description') ||
              'You transferred funds between pools linked to different bank accounts. Remember to move the physical money in your banking app:'}
          </Text>

          <View style={styles.instructionCard}>
            <View style={styles.row}>
              <Text style={styles.label}>
                {t('modals.crossBankTransfer.fromAccount') || 'From Bank Account:'}
              </Text>
              <Text style={styles.accountValue}>{sourceAccountName}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>
                {t('modals.crossBankTransfer.toAccount') || 'To Bank Account:'}
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
                  {t('modals.crossBankTransfer.amount') || 'Amount to Move'}
                </Text>
                <Text style={styles.amountVal}>{formatAUD(amount)}</Text>
              </View>

              <TouchableOpacity
                onPress={handleCopyAmount}
                style={styles.copyBtn}
              >
                <Text style={styles.copyBtnText}>
                  {copied ? '✓ Copied' : 'Share / Copy $'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>{t('common.done') || 'Done'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  closeBtn: {
    fontSize: 16,
    fontWeight: '700',
    color: '#94A3B8',
  },
  description: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 16,
  },
  instructionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#64748B',
  },
  accountValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  destValueCol: {
    alignItems: 'flex-end',
  },
  subDetail: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#94A3B8',
    marginTop: 2,
  },
  amountDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
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
    color: '#94A3B8',
  },
  amountVal: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#2563eb',
  },
  copyBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  doneBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default CrossBankTransferModal;
