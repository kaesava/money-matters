import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  MobileButton,
  MobileInput,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { formatAUD } from '../../lib/format';
import {
  ReconciliationPoolRow,
  ReconcilePoolItem,
} from './ReconciliationPoolRow';

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

  const parsedPools: ReconcilePoolItem[] = useMemo(() => {
    return (account?.linkedPools ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      poolType: p.poolType,
      currentBalance: typeof p.currentBalance === 'number'
        ? p.currentBalance
        : parseFloat(String(p.currentBalance || '0')),
      isSurplusTarget: p.isSurplusTarget,
    }));
  }, [account?.linkedPools]);

  const expectedTotal = parsedPools.reduce((sum, p) => sum + p.currentBalance, 0);
  const variance = Number((availableToBudget - expectedTotal).toFixed(2));
  const isSurplus = variance > 0;
  const absVariance = Math.abs(variance);

  const visiblePools = useMemo(() => {
    if (!isSurplus) {
      return parsedPools.filter((p) => p.poolType === 'EVERYDAY' || p.currentBalance > 0);
    }
    return parsedPools;
  }, [parsedPools, isSurplus]);

  const hasHiddenZeroPools = !isSurplus && parsedPools.some(
    (p) => p.poolType !== 'EVERYDAY' && p.currentBalance <= 0
  );

  useEffect(() => {
    if (visible && account) {
      const initAdj: Record<string, string> = {};
      visiblePools.forEach((p) => {
        initAdj[p.id] = '0.00';
      });

      const sweep = visiblePools.find((p) => p.isSurplusTarget) ||
        visiblePools.find((p) => p.poolType === 'EVERYDAY') ||
        visiblePools[0];

      if (sweep) {
        if (!isSurplus && sweep.poolType !== 'EVERYDAY' && sweep.currentBalance < absVariance) {
          initAdj[sweep.id] = Math.min(sweep.currentBalance, absVariance).toFixed(2);
        } else {
          initAdj[sweep.id] = absVariance.toFixed(2);
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
        {/* Metric Cards Row */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('bankAccounts.reconcile.expectedTotal')}</Text>
            <Text style={styles.metricVal}>{formatAUD(expectedTotal)}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('bankAccounts.reconcile.availableToBudget')}</Text>
            <Text style={styles.metricVal}>{formatAUD(availableToBudget)}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>{t('bankAccounts.reconcile.difference')}</Text>
            <Text style={[styles.metricVal, isSurplus ? styles.textSurplus : styles.textShortfall]}>
              {isSurplus ? `+${formatAUD(variance)}` : `-${formatAUD(absVariance)}`}
            </Text>
          </View>
        </View>

        {/* Contextual Notice */}
        <View style={[styles.noticeCard, isSurplus ? styles.noticeSurplus : styles.noticeShortfall]}>
          <Text style={[styles.noticeText, isSurplus ? styles.noticeTextSurplus : styles.noticeTextShortfall]}>
            {isSurplus
              ? t('bankAccounts.reconcile.surplusNotice', { amount: formatAUD(absVariance) })
              : t('bankAccounts.reconcile.shortfallNotice', { amount: formatAUD(absVariance) })}
          </Text>
        </View>

        {/* Optional Reason / Note */}
        <MobileInput
          label={t('bankAccounts.reconcile.reasonLabel')}
          value={reason}
          onChangeText={setReason}
          placeholder={t('bankAccounts.reconcile.reasonPlaceholder')}
        />

        {/* Multi-Pool Allocation List */}
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

        {/* Live Validation Counter */}
        <View style={styles.validationRow}>
          <Text style={styles.validationLabel}>
            {t('bankAccounts.reconcile.allocatedSplitTotal')}
          </Text>
          <View style={styles.validationRight}>
            <Text style={[styles.validationAmount, isSumValid ? styles.textSurplus : styles.textShortfall]}>
              {formatAUD(sumAdjustments)} / {formatAUD(absVariance)}
            </Text>
            <Text style={[styles.validationBadge, isSumValid ? styles.textSurplus : styles.textShortfall]}>
              {isSumValid
                ? t('bankAccounts.reconcile.matches')
                : t('bankAccounts.reconcile.remaining', { amount: formatAUD(Math.abs(absVariance - sumAdjustments)) })}
            </Text>
          </View>
        </View>

        {/* Transfer Between Pools Shortcut */}
        {onOpenTransfer && (
          <TouchableOpacity onPress={onOpenTransfer} style={styles.transferLinkBtn}>
            <Text style={styles.transferLinkText}>
              {t('bankAccounts.reconcile.transferBetweenPoolsLink')}
            </Text>
            <Feather name="arrow-right" size={14} color="#2563eb" />
          </TouchableOpacity>
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
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  metricVal: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  textSurplus: {
    color: '#059669',
  },
  textShortfall: {
    color: '#D97706',
  },
  noticeCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  noticeSurplus: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  noticeShortfall: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  noticeTextSurplus: {
    color: '#065F46',
  },
  noticeTextShortfall: {
    color: '#92400E',
  },
  poolsSection: {
    gap: 10,
  },
  noPoolsText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  hiddenNoticeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginTop: 2,
  },
  validationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  validationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  validationRight: {
    alignItems: 'flex-end',
  },
  validationAmount: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  validationBadge: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  transferLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingVertical: 4,
  },
  transferLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  flexBtn: {
    flex: 1,
  },
});
