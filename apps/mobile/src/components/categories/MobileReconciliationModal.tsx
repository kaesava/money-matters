import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobileModalDialog, MobileButton, AmountInput, useMobileToast } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { formatAUD } from '../../lib/format';

export interface MobileReconciliationModalProps {
  visible: boolean;
  account: {
    id: string;
    name: string;
    lastKnownBalance?: string | null;
    unbudgetedBuffer?: string | null;
    expectedBalance?: number;
    differenceAmount?: number;
    linkedPools?: Array<{
      id: string;
      name: string;
      poolType: string;
      currentBalance: string | number;
    }>;
  } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MobileReconciliationModal({
  visible,
  account,
  onClose,
  onSuccess,
}: MobileReconciliationModalProps) {
  const D = DESIGN_TOKENS;
  const toast = useMobileToast();
  const utils = trpc.useUtils();

  const [actualBalanceStr, setActualBalanceStr] = useState('');
  const [selectedPoolId, setSelectedPoolId] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && account) {
      setActualBalanceStr(
        account.lastKnownBalance ? String(account.lastKnownBalance) : '0.00'
      );
      // Pre-select the first linked pool if available
      if (account.linkedPools && account.linkedPools.length > 0) {
        setSelectedPoolId(account.linkedPools[0].id);
      } else {
        setSelectedPoolId('');
      }
      setReasonNote('');
    }
  }, [visible, account]);

  const reconcileMut = trpc.reconcileBankBalance.useMutation();

  if (!account) return null;

  const actualBalanceNum = parseFloat(actualBalanceStr) || 0;
  const poolsTotal = (account.linkedPools ?? []).reduce(
    (sum, p) => sum + (parseFloat(String(p.currentBalance)) || 0),
    0
  );
  const variance = Math.round((actualBalanceNum - poolsTotal) * 100) / 100;
  const isSurplus = variance > 0;
  const isShortfall = variance < 0;

  const handleReconcile = async () => {
    if (!selectedPoolId) {
      toast.error(
        'Please select a pool to absorb the balance adjustment.',
        t('common.error')
      );
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyToken = crypto.randomUUID();

      await reconcileMut.mutateAsync({
        accountId: account.id,
        actualBalance: actualBalanceNum.toFixed(2),
        clientIdempotencyToken: idempotencyToken,
        note: reasonNote.trim() || undefined,
        splits: [
          {
            poolId: selectedPoolId,
            adjustment: variance.toFixed(2),
          },
        ],
      });

      toast.success('Account reconciled successfully.');
      utils.listBankAccounts.invalidate();
      utils.listBankAccountsWithExpected.invalidate();
      utils.listPools.invalidate();
      utils.listTransactions.invalidate();
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to reconcile balance',
        t('common.error')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('modals.reconciliation.title')}
      subtitle={t('modals.reconciliation.subtitle', { name: account.name })}
      footer={
        <MobileButton
          variant="primary"
          loading={submitting}
          disabled={submitting || (variance !== 0 && !selectedPoolId)}
          onPress={handleReconcile}
        >
          {t('modals.reconciliation.submit')}
        </MobileButton>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {/* Actual Bank Statement Balance */}
        <AmountInput
          label={t('modals.reconciliation.actualBalance')}
          required
          value={actualBalanceStr}
          onChangeText={setActualBalanceStr}
          placeholder="0.00"
        />

        {/* Comparison & Discrepancy Card */}
        <View style={styles.discrepancyCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{t('categories.calculatedTarget')}</Text>
            <Text style={styles.statVal}>{formatAUD(poolsTotal)}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>{t('modals.reconciliation.actualBalance')}</Text>
            <Text style={styles.statVal}>{formatAUD(actualBalanceNum)}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.statRow}>
            <Text style={styles.statLabelBold}>
              {isSurplus ? 'Surplus (+Δ)' : isShortfall ? 'Shortfall (-Δ)' : 'Status'}
            </Text>
            <Text
              style={[
                styles.statValBold,
                isSurplus && styles.surplusVal,
                isShortfall && styles.shortfallVal,
              ]}
            >
              {variance === 0
                ? 'Balanced'
                : `${isSurplus ? '+' : ''}${formatAUD(variance)}`}
            </Text>
          </View>
        </View>

        {/* Target Pool Selector */}
        {variance !== 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {isSurplus ? 'Deposit Surplus Into Pool' : 'Deduct Shortfall From Pool'}
            </Text>
            <View style={styles.poolsGrid}>
              {account.linkedPools?.map((p) => {
                const isSelected = p.id === selectedPoolId;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedPoolId(p.id)}
                    style={[
                      styles.poolChip,
                      isSelected && styles.poolChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.poolChipName,
                        isSelected && styles.poolChipNameSelected,
                      ]}
                    >
                      {p.name}
                    </Text>
                    <Text
                      style={[
                        styles.poolChipBal,
                        isSelected && styles.poolChipBalSelected,
                      ]}
                    >
                      {formatAUD(p.currentBalance)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Optional Custom Reason Note */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('modals.reconciliation.notes')}</Text>
          <TextInput
            style={styles.textInput}
            value={reasonNote}
            onChangeText={setReasonNote}
            placeholder={t('modals.reconciliation.reasonPlaceholder')}
            placeholderTextColor="#94A3B8"
          />
        </View>
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 14,
    paddingBottom: 10,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
  },
  currencySymbol: {
    fontSize: 22,
    fontWeight: '900',
    color: '#64748B',
    marginRight: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
    paddingVertical: 8,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1B2B4B',
    backgroundColor: '#F8FAFC',
  },
  discrepancyCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  statVal: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  statLabelBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  statValBold: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#22c55e',
  },
  surplusVal: {
    color: '#047857',
  },
  shortfallVal: {
    color: '#ba1a1a',
  },
  poolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  poolChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  poolChipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563eb',
  },
  poolChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  poolChipNameSelected: {
    color: '#2563eb',
    fontWeight: '800',
  },
  poolChipBal: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#94A3B8',
    marginTop: 2,
  },
  poolChipBalSelected: {
    color: '#2563eb',
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default MobileReconciliationModal;
