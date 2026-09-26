import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  MobileScreenWrapper,
  useMobileToast,
  showMobileConfirm,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { formatAUD, formatDate, formatIsoDate } from '../../../lib/format';
import { MobileBankTransferRollupCard } from '../../../components/paychecks/MobileBankTransferRollupCard';
import { MobileIncomeSplitCommandPanel } from '../../../components/paychecks/MobileIncomeSplitCommandPanel';
import {
  MobileIncomeSplitPoolList,
  AllocationLineItem,
} from '../../../components/paychecks/MobileIncomeSplitPoolList';
import { triggerHaptic } from '../../../lib/haptics';

function extractLines(engineResult: unknown): AllocationLineItem[] {
  const res = engineResult as {
    lines?: Array<{
      bucketId?: string;
      poolId?: string;
      bucketName?: string;
      poolName?: string;
      proposedAmount?: number | string;
      reasoning?: string;
    }>;
  };
  return (res?.lines || []).map((item) => ({
    bucketId: String(item.bucketId || item.poolId || ''),
    bucketName: String(item.bucketName || item.poolName || 'Pool'),
    proposedAmount:
      typeof item.proposedAmount === 'number'
        ? item.proposedAmount
        : parseFloat(String(item.proposedAmount || '0')),
    reasoning: String(item.reasoning || ''),
  }));
}

export default function IncomeSplitStudioScreen() {
  const toast = useMobileToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const poolsQuery = trpc.listPools.useQuery(undefined, { enabled: !!session?.user });
  const pools = poolsQuery.data ?? [];

  const bankAccountsQuery = trpc.listBankAccounts.useQuery(undefined, { enabled: !!session?.user });
  const bankAccounts = bankAccountsQuery.data ?? [];

  const previewQuery = trpc.previewPayday.useQuery(
    { incomeEventId: id! },
    { enabled: !!id && !!session?.user }
  );

  const confirmPaydayMut = trpc.confirmPayday.useMutation();
  const overrideEventMut = trpc.overrideEvent.useMutation();
  const saveBulkAllocationsMut = trpc.saveBulkAllocations.useMutation();
  const deleteIncomeMut = trpc.deleteIncomeEvent.useMutation();

  const [actualAmount, setActualAmount] = useState('0.00');
  const [initialAmount, setInitialAmount] = useState('0.00');
  const [sourceName, setSourceName] = useState('Paycheck');
  const [selectedDate, setSelectedDate] = useState(() => formatIsoDate(new Date()));
  const [linesMap, setLinesMap] = useState<Record<string, string>>({});
  const [initialLinesMap, setInitialLinesMap] = useState<Record<string, string>>({});
  const [reasoningMap, setReasoningMap] = useState<Record<string, string>>({});
  const [initialReasoningMap, setInitialReasoningMap] = useState<Record<string, string>>({});
  const [isSavedPlan, setIsSavedPlan] = useState(false);
  const [isConfirmedPlan, setIsConfirmedPlan] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = useMemo(() => formatIsoDate(new Date()), []);

  useEffect(() => {
    if (previewQuery.data) {
      const evt = previewQuery.data.incomeEvent;
      if (evt) {
        setSourceName(evt.name || t('paydayDrawer.incomeDepositDefault'));
        const amt = evt.actualAmount || evt.expectedAmount || '0.00';
        setActualAmount(amt);
        setInitialAmount(amt);
        setSelectedDate(formatIsoDate(evt.expectedDate || new Date()));
      }

      const rawLines = extractLines(previewQuery.data.engineResult);
      const initMap: Record<string, string> = {};
      const initReasoningMap: Record<string, string> = {};
      rawLines.forEach((line) => {
        initMap[line.bucketId] = line.proposedAmount.toFixed(2);
        if (line.reasoning) initReasoningMap[line.bucketId] = line.reasoning;
      });
      setLinesMap(initMap);
      setInitialLinesMap(initMap);
      setReasoningMap(initReasoningMap);
      setInitialReasoningMap(initReasoningMap);

      const engineResult = previewQuery.data.engineResult as unknown as {
        isCustomPlan?: boolean;
        isConfirmedPlan?: boolean;
      };
      setIsSavedPlan(engineResult?.isCustomPlan ?? false);
      setIsConfirmedPlan(engineResult?.isConfirmedPlan ?? false);
    }
  }, [previewQuery.data]);

  const lines = useMemo(() => extractLines(previewQuery.data?.engineResult), [previewQuery.data]);
  const numericActual = parseFloat(actualAmount) || 0;
  const isReadOnly = isConfirmedPlan;
  const isFutureDate = selectedDate > todayStr;

  const sweepPool = useMemo(() => {
    return (
      pools.find((p) => p.isSurplusTarget) ||
      pools.find((p) => p.poolType === 'EVERYDAY') ||
      pools[0]
    );
  }, [pools]);

  const nonSweepAllocatedSum = useMemo(() => {
    if (!sweepPool) return 0;
    return Object.entries(linesMap).reduce((acc, [bId, valStr]) => {
      if (bId === sweepPool.id) return acc;
      return acc + (parseFloat(valStr) || 0);
    }, 0);
  }, [linesMap, sweepPool]);

  const sweepPoolRemainder = useMemo(() => {
    return Math.max(-999999, Math.round((numericActual - nonSweepAllocatedSum) * 100) / 100);
  }, [numericActual, nonSweepAllocatedSum]);

  const isDeficit = sweepPoolRemainder < 0;

  const isDirty = useMemo(() => {
    if (!previewQuery.data) return false;
    const evt = previewQuery.data.incomeEvent;
    if (sourceName !== (evt.name || t('paydayDrawer.incomeDepositDefault'))) return true;
    if (actualAmount !== (evt.actualAmount || evt.expectedAmount)) return true;
    if (selectedDate !== formatIsoDate(evt.expectedDate)) return true;
    for (const [pId, val] of Object.entries(linesMap)) {
      if (initialLinesMap[pId] !== val) return true;
    }
    for (const [pId, val] of Object.entries(reasoningMap)) {
      if (initialReasoningMap[pId] !== val) return true;
    }
    return false;
  }, [previewQuery.data, sourceName, actualAmount, selectedDate, linesMap, initialLinesMap, reasoningMap, initialReasoningMap]);

  const handleLineAmountChange = (bucketId: string, val: string) => {
    let cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) cleaned = `${parts[0]}.${parts.slice(1).join('')}`;
    if (parts[0].length > 12) {
      parts[0] = parts[0].slice(0, 12);
      cleaned = parts[1] !== undefined ? `${parts[0]}.${parts[1]}` : parts[0];
    }
    if (parts[1] && parts[1].length > 2) cleaned = `${parts[0]}.${parts[1].slice(0, 2)}`;
    setLinesMap((prev) => ({ ...prev, [bucketId]: cleaned }));
  };

  const handleLineReasoningChange = (bucketId: string, reasoning: string) => {
    setReasoningMap((prev) => ({ ...prev, [bucketId]: reasoning }));
  };

  const handleResetAllEdits = () => {
    setLinesMap({ ...initialLinesMap });
    setReasoningMap({ ...initialReasoningMap });
    setActualAmount(initialAmount);
  };

  const attemptExit = useCallback(() => {
    if (isDirty && !isReadOnly) {
      showMobileConfirm({
        title: t('common.discardChangesTitle'),
        message: t('paydayDrawer.discardDescription'),
        confirmText: t('common.discard'),
        cancelText: t('common.cancel'),
        isDestructive: true,
        onConfirm: () => router.back(),
      });
    } else {
      router.back();
    }
  }, [isDirty, isReadOnly, router]);

  const handleRecalculateWaterfall = async () => {
    try {
      setSubmitting(true);
      await overrideEventMut.mutateAsync({
        eventId: id!,
        eventType: 'INCOME',
        name: sourceName,
        actualAmount: parseFloat(actualAmount).toFixed(2),
        actualDate: selectedDate,
        expectedAmount: parseFloat(actualAmount).toFixed(2),
        expectedDate: selectedDate,
      });
      await utils.previewPayday.invalidate({ incomeEventId: id! });
      toast.success(t('paydayDrawer.recalculateSuccess'));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('paydayDrawer.recalculateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecalculateTrigger = () => {
    showMobileConfirm({
      title: t('paydayDrawer.recalculateConfirmTitle'),
      message: t('paydayDrawer.recalculateConfirmDescription'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        if (actualAmount !== initialAmount || isSavedPlan) {
          await handleRecalculateWaterfall();
        } else {
          setLinesMap({ ...initialLinesMap });
          toast.success(t('paydayDrawer.recalculateSuccess'));
        }
      },
    });
  };

  const handleDeleteIncome = () => {
    showMobileConfirm({
      title: t('common.deleteIncomeTitle'),
      message: t('paydayDrawer.deleteDescription'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      isDestructive: true,
      onConfirm: async () => {
        try {
          setSubmitting(true);
          await deleteIncomeMut.mutateAsync({ eventId: id! });
          toast.success(t('paydayDrawer.incomeDeleted'));
          await utils.listIncomeEvents.invalidate();
          router.back();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('paydayDrawer.deleteFailed'));
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const handleSaveSplit = async () => {
    if (isDeficit) return;
    setSubmitting(true);
    try {
      await overrideEventMut.mutateAsync({
        eventId: id!,
        eventType: 'INCOME',
        name: sourceName,
        actualAmount: parseFloat(actualAmount).toFixed(2),
        actualDate: selectedDate,
        expectedAmount: parseFloat(actualAmount).toFixed(2),
        expectedDate: selectedDate,
      });

      const effectiveMap = { ...linesMap };
      if (sweepPool) effectiveMap[sweepPool.id] = sweepPoolRemainder.toFixed(2);
      const payload = Object.entries(effectiveMap).map(([pId, val]) => ({
        poolId: pId,
        proposedAmount: (parseFloat(val) || 0).toFixed(2),
        reasoning: reasoningMap[pId] ?? (lines.find((l) => l.bucketId === pId)?.reasoning || undefined),
      }));

      await saveBulkAllocationsMut.mutateAsync({
        incomeEventId: id!,
        totalIncomeAmount: numericActual.toFixed(2),
        lines: payload,
      });

      setIsSavedPlan(true);
      toast.success(t('matrix.saveSplitSuccess'));
      await utils.listIncomeEvents.invalidate();
      await utils.listAllAllocationPlans.invalidate();
      router.back();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('paydayDrawer.saveSplitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSplit = () => {
    if (isDeficit) return;

    showMobileConfirm({
      title: t('paydayDrawer.confirmWarningTitle'),
      message: t('paydayDrawer.confirmWarningDescription'),
      confirmText: t('paydayDrawer.confirmWarningConfirm'),
      cancelText: t('common.cancel'),
      isDestructive: false,
      onConfirm: async () => {
        setSubmitting(true);
        try {
          await overrideEventMut.mutateAsync({
            eventId: id!,
            eventType: 'INCOME',
            name: sourceName,
            actualAmount: parseFloat(actualAmount).toFixed(2),
            actualDate: selectedDate,
            expectedAmount: parseFloat(actualAmount).toFixed(2),
            expectedDate: selectedDate,
          });

          const effectiveMap = { ...linesMap };
          if (sweepPool) effectiveMap[sweepPool.id] = sweepPoolRemainder.toFixed(2);
          const payload = Object.entries(effectiveMap).map(([pId, val]) => ({
            poolId: pId,
            amount: (parseFloat(val) || 0).toFixed(2),
            reasoning: reasoningMap[pId] ?? (lines.find((l) => l.bucketId === pId)?.reasoning || undefined),
          }));

          await confirmPaydayMut.mutateAsync({
            incomeEventId: id!,
            actualAmount: numericActual.toFixed(2),
            markAsReceivedToday: false,
            lines: payload,
          });

          triggerHaptic('success');
          toast.success(t('paydayDrawer.confirmSuccess'));
          await utils.listIncomeEvents.invalidate();
          await utils.listPools.invalidate();
          await utils.listTransactions.invalidate();
          await utils.getMonthlySummary.invalidate();

          router.replace({
            pathname: '/(app)/paychecks/transfer-instructions',
            params: { incomeEventId: id },
          } as never);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('paydayDrawer.confirmSplitFailed'));
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  const everydayAllocated = lines
    .filter((l) => pools.find((p) => p.id === l.bucketId)?.poolType === 'EVERYDAY')
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const billsAllocated = lines
    .filter((l) => pools.find((p) => p.id === l.bucketId)?.poolType === 'REGULAR')
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const goalsAllocated = lines
    .filter((l) => pools.find((p) => p.id === l.bucketId)?.poolType === 'GOAL')
    .reduce((sum, l) => sum + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const groupedLines = useMemo(() => {
    const groups: Array<{ type: 'EVERYDAY' | 'REGULAR' | 'GOAL'; label: string; items: AllocationLineItem[] }> = [
      { type: 'EVERYDAY', label: t('paydayDrawer.everydayPools'), items: [] },
      { type: 'REGULAR', label: t('paydayDrawer.billsPools'), items: [] },
      { type: 'GOAL', label: t('paydayDrawer.goalsPools'), items: [] },
    ];
    for (const l of lines) {
      const pType = pools.find((pool) => pool.id === l.bucketId)?.poolType || 'REGULAR';
      if (pType === 'EVERYDAY') groups[0].items.push(l);
      else if (pType === 'GOAL') groups[2].items.push(l);
      else groups[1].items.push(l);
    }
    return groups.filter((g) => g.items.length > 0);
  }, [lines, pools]);

  if (previewQuery.isLoading || poolsQuery.isLoading || bankAccountsQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const receivingAccountId = previewQuery.data?.incomeEvent?.receivingAccountId;

  return (
    <MobileScreenWrapper
      title={sourceName || t('paydayDrawer.title')}
      user={session?.user}
      showBack
      onBackPress={attemptExit}
    >
      <View style={styles.rootContainer}>
        {/* Custom Studio Subheader */}
        <View style={styles.subheader}>
          <View style={styles.badgeRow}>
            {isConfirmedPlan ? (
              <View style={[styles.badge, styles.confirmedBadge]}>
                <Text style={[styles.badgeText, styles.confirmedBadgeText]}>
                  ✓ {t('paydayDrawer.confirmedBadge')}
                </Text>
              </View>
            ) : isSavedPlan ? (
              <View style={[styles.badge, styles.savedBadge]}>
                <Text style={[styles.badgeText, styles.savedBadgeText]}>
                  💾 {t('paydayDrawer.savedBadge')}
                </Text>
              </View>
            ) : (
              <View style={[styles.badge, styles.autoBadge]}>
                <Text style={[styles.badgeText, styles.autoBadgeText]}>
                  ✨ {t('paydayDrawer.autoBadge')}
                </Text>
              </View>
            )}

            <Text style={styles.subheaderDateText}>
              {formatDate(selectedDate)} • {t('paydayDrawer.subtitle')}
            </Text>
          </View>

          <View style={styles.headerActionsRow}>
            {!isReadOnly && (
              <TouchableOpacity
                onPress={handleRecalculateTrigger}
                disabled={submitting}
                style={styles.iconActionBtn}
                accessibilityLabel={t('paydayDrawer.recalculate')}
              >
                <Feather name="refresh-cw" size={15} color="#2563eb" />
              </TouchableOpacity>
            )}

            {isDirty && !isReadOnly && (
              <TouchableOpacity
                onPress={handleResetAllEdits}
                disabled={submitting}
                style={styles.resetEditsBtn}
              >
                <Text style={styles.resetEditsText}>{t('paydayDrawer.resetEdits')}</Text>
              </TouchableOpacity>
            )}

            {!isReadOnly && (
              <TouchableOpacity
                onPress={handleDeleteIncome}
                disabled={submitting}
                style={styles.iconActionBtn}
                accessibilityLabel={t('common.delete')}
              >
                <Feather name="trash-2" size={15} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <MobileIncomeSplitCommandPanel
            sourceName={sourceName}
            onSourceNameChange={setSourceName}
            actualAmount={actualAmount}
            onActualAmountChange={setActualAmount}
            selectedDate={selectedDate}
            onSelectedDateChange={setSelectedDate}
            numericActual={numericActual}
            sweepPoolName={sweepPool?.name || t('poolTypes.everyday')}
            sweepPoolRemainder={sweepPoolRemainder}
            isDeficit={isDeficit}
            everydayAllocated={everydayAllocated}
            billsAllocated={billsAllocated}
            goalsAllocated={goalsAllocated}
            isReadOnly={isReadOnly}
            isAmountModified={actualAmount !== initialAmount}
            onRecalculateWaterfall={handleRecalculateWaterfall}
            submitting={submitting}
            isConfirmedPlan={isConfirmedPlan}
          />

          <MobileIncomeSplitPoolList
            groups={groupedLines}
            pools={pools}
            sweepPoolId={sweepPool?.id}
            sweepPoolRemainder={sweepPoolRemainder}
            linesMap={linesMap}
            reasoningMap={reasoningMap}
            isReadOnly={isReadOnly}
            onLineAmountChange={handleLineAmountChange}
            onLineReasoningChange={handleLineReasoningChange}
          />

          {!isConfirmedPlan && (
            <MobileBankTransferRollupCard
              receivingAccountId={receivingAccountId}
              pools={pools}
              linesMap={linesMap}
              sweepPoolId={sweepPool?.id}
              sweepPoolRemainder={sweepPoolRemainder}
              bankAccounts={bankAccounts}
            />
          )}
        </ScrollView>

        {/* Sticky Action Footer */}
        {!isReadOnly && (
          <View style={styles.footerContainer}>
            <TouchableOpacity
              onPress={handleSaveSplit}
              disabled={isDeficit || submitting}
              style={[
                styles.saveDraftFooterBtn,
                (isDeficit || submitting) && styles.disabledBtn,
              ]}
            >
              <Text style={styles.saveDraftFooterText}>
                {isFutureDate ? t('paydayDrawer.saveAsDraft') : t('common.save')}
              </Text>
            </TouchableOpacity>

            {!isFutureDate && (
              <TouchableOpacity
                onPress={handleConfirmSplit}
                disabled={isDeficit || submitting}
                style={[
                  styles.confirmSplitFooterBtn,
                  (isDeficit || submitting) && styles.disabledBtn,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmSplitFooterText}>
                    {t('paydayDrawer.runIncomeSplit')}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  subheader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flex: 1,
    gap: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  confirmedBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  confirmedBadgeText: {
    color: '#047857',
  },
  savedBadge: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  savedBadgeText: {
    color: '#4338CA',
  },
  autoBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  autoBadgeText: {
    color: '#1D4ED8',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  subheaderDateText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconActionBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resetEditsBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  resetEditsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 90,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 12,
    flexDirection: 'row',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 4,
    elevation: 4,
  },
  saveDraftFooterBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveDraftFooterText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  confirmSplitFooterBtn: {
    flex: 2,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSplitFooterText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
