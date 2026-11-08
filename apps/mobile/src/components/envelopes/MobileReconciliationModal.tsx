import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  MobileButton,
  MobileInput,
  AmountInput,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { ReconciliationPoolRow } from './ReconciliationPoolRow';
import { ReconciliationMetrics } from './reconciliation/ReconciliationMetrics';
import { ReconciliationValidationFooter } from './reconciliation/ReconciliationValidationFooter';
import { useReconciliationCalculations } from './reconciliation/useReconciliationCalculations';

export interface MobileReconciliationModalProps {
  visible: boolean;
  account: {
    id: string;
    name: string;
    lastKnownBalance?: string | null;
    unbudgetedBuffer?: string | null;
    expectedBalance?: number | string | null;
    linkedPools?: Array<{
      id: string;
      name: string;
      envelopeType?: string;
      poolType?: string;
      currentBalance: string | number;
      isSurplusTarget?: boolean | null;
    }>;
  } | null;
  onClose: () => void;
  onSuccess?: () => void;
  onOpenTransfer?: () => void;
}

export function MobileReconciliationModal({
  visible,
  account,
  onClose,
  onSuccess,
  onOpenTransfer,
}: MobileReconciliationModalProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();

  const [enteredBalance, setEnteredBalance] = useState('0.00');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && account) {
      setEnteredBalance(account.lastKnownBalance || '0.00');
      setIsAdvancedOpen(false);
      setReason('');
    }
  }, [visible, account]);

  const actualBal = Math.max(0, parseFloat(enteredBalance) || 0);
  const buffer = parseFloat(account?.unbudgetedBuffer || '0');
  const availableToBudget = Math.max(0, actualBal - buffer);

  const {
    expectedTotal,
    variance,
    isSurplus,
    absVariance,
    isPoolSweepTarget,
    visiblePools,
    hasHiddenZeroPools,
  } = useReconciliationCalculations({
    linkedPools: account?.linkedPools,
    availableToBudget,
  });

  const isZeroVariance = Math.abs(variance) < 0.009;
  const defaultSweep = visiblePools.find(isPoolSweepTarget) || visiblePools[0];

  useEffect(() => {
    if (visible && isAdvancedOpen && account) {
      const initAdj: Record<string, string> = {};
      visiblePools.forEach((p) => {
        initAdj[p.id] = '0.00';
      });

      if (defaultSweep) {
        if (isSurplus) {
          initAdj[defaultSweep.id] = absVariance.toFixed(2);
        } else {
          const maxDrawdown = Math.min(Math.max(0, defaultSweep.currentBalance), absVariance);
          initAdj[defaultSweep.id] = maxDrawdown.toFixed(2);
        }
      }
      setAdjustments(initAdj);
    }
  }, [visible, isAdvancedOpen, account, absVariance, isSurplus, visiblePools, defaultSweep]);

  const sumAdjustments = Number(
    Object.values(adjustments)
      .reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
      .toFixed(2)
  );

  const isSumValid = Math.abs(sumAdjustments - absVariance) < 0.009;
  const reconcileMut = trpc.reconcileBankBalance.useMutation();

  const handleConfirmSubmit = async () => {
    if (!account) return;

    let splits: Array<{ poolId: string; adjustment: string }> = [];

    if (!isAdvancedOpen) {
      // 1-Click Smart Default Mode
      if (!isZeroVariance && defaultSweep) {
        splits = [
          {
            poolId: defaultSweep.id,
            adjustment: variance.toFixed(2),
          },
        ];
      }
    } else {
      // Advanced Multi-Pool Mode
      if (!isSumValid) return;
      splits = Object.entries(adjustments)
        .filter(([_, val]) => (parseFloat(val) || 0) > 0)
        .map(([poolId, val]) => {
          const amt = parseFloat(val) || 0;
          return {
            poolId,
            adjustment: (isSurplus ? amt : -amt).toFixed(2),
          };
        });
    }

    setSubmitting(true);
    try {
      await reconcileMut.mutateAsync({
        accountId: account.id,
        actualBalance: actualBal.toFixed(2),
        clientIdempotencyToken: crypto.randomUUID(),
        note: reason.trim() || undefined,
        splits,
      });

      toast.success(t('toasts.saved'));
      utils.listBankAccountsWithExpected.invalidate();
      utils.listPools.invalidate();
      utils.listTransactions.invalidate();
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!account) return null;

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('bankAccounts.reconcile.modalTitle')}
      subtitle={t('modals.reconciliation.subtitle', { name: account.name })}
      footer={
        <View style={styles.footerRow}>
          <MobileButton variant="ghost" onPress={onClose} style={styles.flexBtn}>
            {t('common.cancel')}
          </MobileButton>
          <MobileButton
            variant="primary"
            loading={submitting}
            disabled={isAdvancedOpen ? !isSumValid || submitting : submitting}
            onPress={handleConfirmSubmit}
            style={styles.flexBtn}
          >
            {isZeroVariance
              ? t('bankAccounts.reconcile.saveBalanceOnly')
              : t('bankAccounts.reconcile.syncAction')}
          </MobileButton>
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {/* Step 1: Editable Current Bank Balance */}
        <AmountInput
          label={t('bankAccounts.reconcile.currentBankBalanceLabel')}
          value={enteredBalance}
          onChangeText={setEnteredBalance}
          placeholder="0.00"
          autoFocus={true}
        />

        {/* Metric Comparison Strip */}
        <ReconciliationMetrics
          expectedTotal={expectedTotal}
          availableToBudget={availableToBudget}
          variance={variance}
          absVariance={absVariance}
          isSurplus={isSurplus}
        />

        {/* Step 2: Smart 1-Click Default Card (when advanced is folded) */}
        {!isAdvancedOpen && (
          <View
            style={[
              styles.defaultCard,
              isZeroVariance
                ? styles.defaultCardBalanced
                : isSurplus
                ? styles.defaultCardSurplus
                : styles.defaultCardShortfall,
            ]}
          >
            <Text
              style={[
                styles.defaultCardText,
                isZeroVariance
                  ? styles.defaultTextBalanced
                  : isSurplus
                  ? styles.defaultTextSurplus
                  : styles.defaultTextShortfall,
              ]}
            >
              {isZeroVariance
                ? t('bankAccounts.reconcile.balancedNotice')
                : isSurplus
                ? t('bankAccounts.reconcile.defaultAddNotice', {
                    name: defaultSweep?.name || 'Everyday',
                  })
                : t('bankAccounts.reconcile.defaultDeductNotice', {
                    name: defaultSweep?.name || 'Everyday',
                  })}
            </Text>
          </View>
        )}

        {/* Advanced Accordion Toggle */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsAdvancedOpen(!isAdvancedOpen)}
          style={styles.advancedToggle}
        >
          <Text style={styles.advancedToggleArrow}>{isAdvancedOpen ? '▼' : '▶'}</Text>
          <Text style={styles.advancedToggleText}>
            {t('bankAccounts.reconcile.advancedSplitToggle')}
          </Text>
        </TouchableOpacity>

        {/* Advanced Multi-Pool Distribution */}
        {isAdvancedOpen && (
          <View style={styles.advancedSection}>
            <MobileInput
              label={t('bankAccounts.reconcile.reasonLabel')}
              value={reason}
              onChangeText={setReason}
              placeholder={t('bankAccounts.reconcile.reasonPlaceholder')}
            />

            <View style={styles.poolsSection}>
              {visiblePools.length === 0 ? (
                <Text style={styles.noPoolsText}>
                  {t('bankAccounts.reconcile.noLinkedPools')}
                </Text>
              ) : (
                visiblePools.map((pool, idx) => (
                  <ReconciliationPoolRow
                    key={pool.id}
                    pool={pool}
                    value={adjustments[pool.id] ?? '0.00'}
                    isSurplus={isSurplus}
                    autoFocus={idx === 0}
                    onChange={(newVal) =>
                      setAdjustments((prev) => ({ ...prev, [pool.id]: newVal }))
                    }
                  />
                ))
              )}

              {hasHiddenZeroPools && (
                <Text style={styles.hiddenNoticeText}>
                  {t('bankAccounts.reconcile.zeroBalanceHiddenNotice')}
                </Text>
              )}
            </View>

            <ReconciliationValidationFooter
              sumAdjustments={sumAdjustments}
              absVariance={absVariance}
              isSumValid={isSumValid}
              onOpenTransfer={onOpenTransfer}
            />
          </View>
        )}
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 14,
    paddingBottom: 8,
  },
  defaultCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  defaultCardBalanced: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderColor: DESIGN_TOKENS.colors.successBorder,
  },
  defaultTextBalanced: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.successDark,
    lineHeight: 18,
  },
  defaultCardSurplus: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
  },
  defaultTextSurplus: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
    lineHeight: 18,
  },
  defaultCardShortfall: {
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderColor: DESIGN_TOKENS.colors.warningBorder,
  },
  defaultTextShortfall: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.warningDark,
    lineHeight: 18,
  },
  defaultCardText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  advancedToggleArrow: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.accent,
  },
  advancedToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
  advancedSection: {
    gap: 12,
    paddingTop: 4,
  },
  poolsSection: {
    gap: 10,
  },
  noPoolsText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.subtleText,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  hiddenNoticeText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.subtleText,
    fontStyle: 'italic',
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flexBtn: {
    flex: 1,
  },
});
