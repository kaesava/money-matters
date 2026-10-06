import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  MobileButton,
  MobileInput,
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
      poolType: string;
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

  const [adjustments, setAdjustments] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const actualBal = parseFloat(account?.lastKnownBalance || '0');
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

  useEffect(() => {
    if (visible && account) {
      const initAdj: Record<string, string> = {};
      visiblePools.forEach((p) => {
        initAdj[p.id] = '0.00';
      });

      const sweep = visiblePools.find(isPoolSweepTarget) || visiblePools[0];

      if (sweep) {
        if (isSurplus) {
          initAdj[sweep.id] = absVariance.toFixed(2);
        } else {
          const maxDrawdown = Math.min(Math.max(0, sweep.currentBalance), absVariance);
          initAdj[sweep.id] = maxDrawdown.toFixed(2);
        }
      }
      setAdjustments(initAdj);
      setReason('');
    }
  }, [visible, account, absVariance, isSurplus, visiblePools]);

  const sumAdjustments = Number(
    Object.values(adjustments)
      .reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
      .toFixed(2)
  );

  const isSumValid = Math.abs(sumAdjustments - absVariance) < 0.009;
  const reconcileMut = trpc.reconcileBankBalance.useMutation();

  const handleConfirmSubmit = async () => {
    if (!account || !isSumValid) return;

    const splits = Object.entries(adjustments)
      .filter(([_, val]) => (parseFloat(val) || 0) > 0)
      .map(([poolId, val]) => {
        const amt = parseFloat(val) || 0;
        return {
          poolId,
          adjustment: (isSurplus ? amt : -amt).toFixed(2),
        };
      });

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
      title={t('modals.reconciliation.title')}
      subtitle={t('modals.reconciliation.subtitle', { name: account.name })}
      footer={
        <View style={styles.footerRow}>
          <MobileButton variant="ghost" onPress={onClose} style={styles.flexBtn}>
            {t('common.cancel')}
          </MobileButton>
          <MobileButton
            variant="primary"
            loading={submitting}
            disabled={!isSumValid || submitting}
            onPress={handleConfirmSubmit}
            style={styles.flexBtn}
          >
            {t('common.confirm')}
          </MobileButton>
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <ReconciliationMetrics
          expectedTotal={expectedTotal}
          availableToBudget={availableToBudget}
          variance={variance}
          absVariance={absVariance}
          isSurplus={isSurplus}
        />

        <MobileInput
          label={t('bankAccounts.reconcile.reasonLabel')}
          value={reason}
          onChangeText={setReason}
          placeholder={t('bankAccounts.reconcile.reasonPlaceholder')}
        />

        <View style={styles.poolsSection}>
          {visiblePools.length === 0 ? (
            <Text style={styles.noPoolsText}>{t('bankAccounts.reconcile.noLinkedPools')}</Text>
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
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 14,
    paddingBottom: 8,
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
