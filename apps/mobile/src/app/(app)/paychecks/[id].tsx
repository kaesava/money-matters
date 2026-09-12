import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../../lib/trpc';
import { authClient } from '../../../lib/auth';
import { formatAUD } from '../../../lib/format';
import { showMobileConfirm } from '../../../components/MobileConfirmDialog';
import { MobileBankTransferRollupCard } from '../../../components/paychecks/MobileBankTransferRollupCard';
import { triggerHaptic } from '../../../lib/haptics';

interface AllocationLineItem {
  bucketId: string;
  bucketName: string;
  proposedAmount: number;
  reasoning: string;
}

function extractLines(engineResult: unknown): AllocationLineItem[] {
  if (!engineResult) return [];
  let raw: Array<Record<string, unknown>> = [];
  if (Array.isArray(engineResult)) {
    raw = engineResult;
  } else if (
    typeof engineResult === 'object' &&
    engineResult !== null &&
    'lines' in engineResult
  ) {
    raw = Array.isArray((engineResult as { lines?: unknown[] }).lines)
      ? (engineResult as { lines: Array<Record<string, unknown>> }).lines
      : [];
  }
  return raw.map((item) => ({
    bucketId: String(item.bucketId || item.poolId || ''),
    bucketName: String(item.bucketName || item.poolName || 'Unknown Pool'),
    proposedAmount:
      typeof item.proposedAmount === 'number'
        ? item.proposedAmount
        : parseFloat(String(item.proposedAmount || '0')),
    reasoning: String(item.reasoning || ''),
  }));
}

export default function IncomeSplitStudioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const utils = trpc.useUtils();

  const poolsQuery = trpc.listPools.useQuery();
  const pools = poolsQuery.data ?? [];

  const bankAccountsQuery = trpc.listBankAccounts.useQuery();
  const bankAccounts = bankAccountsQuery.data ?? [];

  const previewQuery = trpc.previewPayday.useQuery(
    { incomeEventId: id! },
    { enabled: !!id }
  );

  const confirmPaydayMut = trpc.confirmPayday.useMutation();
  const saveBulkAllocationsMut = trpc.saveBulkAllocations.useMutation();
  const revertAllocationPlanMut = trpc.revertAllocationPlan.useMutation();

  const [actualAmount, setActualAmount] = useState('0.00');
  const [sourceName, setSourceName] = useState('Paycheck');
  const [expectedDate, setExpectedDate] = useState('');
  const [linesMap, setLinesMap] = useState<Record<string, string>>({});
  const [reasoningMap, setReasoningMap] = useState<Record<string, string>>({});
  const [isSavedPlan, setIsSavedPlan] = useState(false);
  const [isConfirmedPlan, setIsConfirmedPlan] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (previewQuery.data) {
      const evt = previewQuery.data.incomeEvent;
      setSourceName(evt.name || 'Paycheck');
      const amt = evt.actualAmount || evt.expectedAmount;
      setActualAmount(amt);
      setExpectedDate(evt.expectedDate);

      const rawLines = extractLines(previewQuery.data.engineResult);
      const initMap: Record<string, string> = {};
      const initReasoningMap: Record<string, string> = {};
      rawLines.forEach((l) => {
        initMap[l.bucketId] = l.proposedAmount.toFixed(2);
        initReasoningMap[l.bucketId] = l.reasoning;
      });
      setLinesMap(initMap);
      setReasoningMap(initReasoningMap);

      const engineResult = previewQuery.data.engineResult as unknown as {
        isCustomPlan?: boolean;
        isConfirmedPlan?: boolean;
      };
      setIsSavedPlan(engineResult?.isCustomPlan ?? false);
      setIsConfirmedPlan(engineResult?.isConfirmedPlan ?? false);
    }
  }, [previewQuery.data]);

  const totalIncome = parseFloat(actualAmount) || 0;

  const sweepPool = useMemo(() => {
    return (
      pools.find((p) => p.isSurplusTarget) ||
      pools.find((p) => p.poolType === 'EVERYDAY') ||
      pools[0]
    );
  }, [pools]);

  const nonSweepAllocatedSum = useMemo(() => {
    let sum = 0;
    for (const [poolId, valStr] of Object.entries(linesMap)) {
      if (sweepPool && poolId === sweepPool.id) continue;
      const num = parseFloat(valStr);
      if (!isNaN(num) && num > 0) {
        sum += num;
      }
    }
    return Math.round(sum * 100) / 100;
  }, [linesMap, sweepPool]);

  const sweepPoolRemainder = Math.round((totalIncome - nonSweepAllocatedSum) * 100) / 100;
  const isDeficit = nonSweepAllocatedSum > totalIncome;
  const deficitAmount = Math.max(0, nonSweepAllocatedSum - totalIncome);

  const handleAmountChange = (poolId: string, val: string) => {
    if (val === '' || /^\d{0,12}(\.\d{0,2})?$/.test(val)) {
      setLinesMap((prev) => ({ ...prev, [poolId]: val }));
    }
  };

  const handleQuickChip = (poolId: string, chipType: '100%' | '$0') => {
    if (chipType === '$0') {
      setLinesMap((prev) => ({ ...prev, [poolId]: '0.00' }));
    } else {
      // 100% of remaining income allocated to this pool
      const otherSum = Object.entries(linesMap)
        .filter(([id]) => id !== poolId && id !== sweepPool?.id)
        .reduce((sum, [, val]) => sum + (parseFloat(val) || 0), 0);
      const remaining = Math.max(0, totalIncome - otherSum);
      setLinesMap((prev) => ({ ...prev, [poolId]: remaining.toFixed(2) }));
    }
  };

  const handleRecalculate = () => {
    showMobileConfirm({
      title: t('paydayDrawer.recalculateConfirmTitle', { defaultValue: 'Reset to Suggested Plan?' }),
      message: t('paydayDrawer.recalculateConfirmDescription', {
        defaultValue: 'Your custom split will be discarded and reset to the suggested allocation. Continue?',
      }),
      confirmText: t('common.reset', { defaultValue: 'Reset' }),
      onConfirm: async () => {
        try {
          await revertAllocationPlanMut.mutateAsync({ incomeEventId: id! });
          previewQuery.refetch();
          setIsSavedPlan(false);
        } catch (err) {
          Alert.alert(
            t('common.error'),
            err instanceof Error ? err.message : 'Failed to recalculate'
          );
        }
      },
    });
  };

  const handleSaveDraft = async () => {
    setSubmitting(true);
    try {
      const linesArray = Object.entries(linesMap).map(([poolId, amountStr]) => ({
        poolId,
        proposedAmount: (parseFloat(amountStr) || 0).toFixed(2),
        reasoning: reasoningMap[poolId] || undefined,
      }));

      await saveBulkAllocationsMut.mutateAsync({
        incomeEventId: id!,
        totalIncomeAmount: totalIncome.toFixed(2),
        lines: linesArray,
      });

      setIsSavedPlan(true);
      utils.listAllAllocationPlans.invalidate();
      Alert.alert('Draft Saved', 'Your custom allocation draft has been saved.');
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : 'Failed to save draft'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSplit = async () => {
    if (isDeficit) {
      Alert.alert(
        'Over-allocated Deficit',
        `Allocations exceed income by ${formatAUD(deficitAmount)}. Please adjust amounts before confirming.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const linesArray = Object.entries(linesMap).map(([poolId, amountStr]) => ({
        poolId,
        amount: (parseFloat(amountStr) || 0).toFixed(2),
        reasoning: reasoningMap[poolId] || undefined,
      }));

      await confirmPaydayMut.mutateAsync({
        incomeEventId: id!,
        actualAmount: totalIncome.toFixed(2),
        lines: linesArray,
      });

      utils.listPools.invalidate();
      utils.listIncomeEvents.invalidate();
      utils.listTransactions.invalidate();
      utils.getMonthlySummary.invalidate();

      triggerHaptic('success');
      router.push({
        pathname: '/(app)/paychecks/transfer-instructions',
        params: { incomeEventId: id },
      } as never);
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : 'Failed to confirm income split'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (previewQuery.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Calculating waterfall allocation...</Text>
      </View>
    );
  }

  const receivingAccountId = previewQuery.data?.incomeEvent?.receivingAccountId;

  return (
    <MobileScreenWrapper
      title="Income Split Studio"
      user={session?.user}
      showBack
      onBackPress={() => router.back()}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <View style={styles.stateBadgeRow}>
                {isConfirmedPlan ? (
                  <View style={styles.confirmedBadge}>
                    <Text style={styles.confirmedText}>Confirmed ✓</Text>
                  </View>
                ) : isSavedPlan ? (
                  <View style={styles.savedBadge}>
                    <Text style={styles.savedText}>Custom Saved 💾</Text>
                  </View>
                ) : (
                  <View style={styles.autoBadge}>
                    <Text style={styles.autoText}>Auto-Calculated ✨</Text>
                  </View>
                )}
              </View>
              <Text style={styles.sourceTitle}>{sourceName}</Text>
              <Text style={styles.payDateMeta}>Expected {expectedDate}</Text>
            </View>

            <View style={styles.heroIncomeWrap}>
              <Text style={styles.heroIncomeLabel}>Total Income</Text>
              <Text style={styles.heroIncomeAmount}>{formatAUD(totalIncome)}</Text>
            </View>
          </View>

          {/* Recalculate button */}
          {isSavedPlan && !isConfirmedPlan && (
            <TouchableOpacity
              onPress={handleRecalculate}
              style={styles.recalcBtn}
            >
              <Feather name="refresh-cw" size={13} color="#2563eb" />
              <Text style={styles.recalcBtnText}>Re-calculate Defaults</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Real-Time Deficit Alert Banner */}
        {isDeficit ? (
          <View style={styles.deficitBanner}>
            <Feather name="alert-octagon" size={18} color="#ba1a1a" />
            <View style={{ flex: 1 }}>
              <Text style={styles.deficitTitle}>
                Over-Allocated by {formatAUD(deficitAmount)}
              </Text>
              <Text style={styles.deficitDesc}>
                Total pool allocations exceed your paycheck. Reduce bucket amounts to balance.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.surplusBanner}>
            <Feather name="check-circle" size={16} color="#15803D" />
            <Text style={styles.surplusBannerText}>
              Balanced • {formatAUD(sweepPoolRemainder)} auto-sweeps to {sweepPool?.name || 'Surplus'}
            </Text>
          </View>
        )}

        {/* Pool Allocation Cards Accordion */}
        <View style={styles.poolsSection}>
          <Text style={styles.sectionTitle}>Pool Allocations</Text>

          {pools.map((pool) => {
            const isSweep = sweepPool && pool.id === sweepPool.id;
            const currentVal = isSweep
              ? sweepPoolRemainder.toFixed(2)
              : linesMap[pool.id] || '0.00';
            const reasoning = reasoningMap[pool.id];

            return (
              <View key={pool.id} style={styles.poolCard}>
                <View style={styles.poolCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.poolTitleRow}>
                      <Text style={styles.poolName}>{pool.name}</Text>
                      {isSweep && (
                        <View style={styles.surplusTargetBadge}>
                          <Text style={styles.surplusTargetText}>
                            Auto-Surplus
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.poolTypeBadge}>{pool.poolType}</Text>
                  </View>

                  {/* Amount input & Quick Chips */}
                  <View style={styles.amountInputCol}>
                    <View style={styles.inputWrap}>
                      <Text style={styles.dollarSymbol}>$</Text>
                      <TextInput
                        style={[
                          styles.lineAmountInput,
                          isSweep && styles.disabledInput,
                        ]}
                        keyboardType="decimal-pad"
                        value={currentVal}
                        editable={!isSweep && !isConfirmedPlan}
                        onChangeText={(val) => handleAmountChange(pool.id, val)}
                        placeholder="0.00"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    {!isSweep && !isConfirmedPlan && (
                      <View style={styles.chipsRow}>
                        <TouchableOpacity
                          onPress={() => handleQuickChip(pool.id, '$0')}
                          style={styles.quickChip}
                        >
                          <Text style={styles.quickChipText}>$0</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleQuickChip(pool.id, '100%')}
                          style={styles.quickChip}
                        >
                          <Text style={styles.quickChipText}>100%</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>

                {reasoning ? (
                  <View style={styles.reasoningRow}>
                    <Feather name="info" size={12} color="#64748B" />
                    <Text style={styles.reasoningText}>{reasoning}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Bank Transfer Rollup Card */}
        <MobileBankTransferRollupCard
          receivingAccountId={receivingAccountId}
          pools={pools}
          linesMap={linesMap}
          sweepPoolId={sweepPool?.id}
          sweepPoolRemainder={sweepPoolRemainder}
          bankAccounts={bankAccounts}
        />

        {/* Action Footer Buttons */}
        {!isConfirmedPlan && (
          <View style={styles.footerActions}>
            <TouchableOpacity
              onPress={handleSaveDraft}
              disabled={submitting}
              style={styles.saveDraftBtn}
            >
              <Text style={styles.saveDraftText}>Save Draft</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirmSplit}
              disabled={submitting || isDeficit}
              style={[
                styles.confirmBtn,
                (submitting || isDeficit) && { opacity: 0.5 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm & Run Split</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
  scrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 60,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stateBadgeRow: {
    marginBottom: 6,
  },
  autoBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  autoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E40AF',
  },
  savedBadge: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  savedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  confirmedBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  confirmedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  sourceTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1B2B4B',
  },
  payDateMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  heroIncomeWrap: {
    alignItems: 'flex-end',
  },
  heroIncomeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  heroIncomeAmount: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#2563eb',
  },
  recalcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  recalcBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  deficitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    padding: 12,
  },
  deficitTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  deficitDesc: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 2,
  },
  surplusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 12,
  },
  surplusBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  poolsSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  poolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 8,
  },
  poolCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  poolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  poolName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  surplusTargetBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  surplusTargetText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#047857',
  },
  poolTypeBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  amountInputCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 8,
    backgroundColor: '#F8FAFC',
    width: 120,
  },
  dollarSymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 4,
  },
  lineAmountInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
    paddingVertical: 6,
    textAlign: 'right',
  },
  disabledInput: {
    color: '#047857',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  quickChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  reasoningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
  },
  reasoningText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveDraftBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveDraftText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
