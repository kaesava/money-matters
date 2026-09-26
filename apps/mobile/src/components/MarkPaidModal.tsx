import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  MobileModalDialog,
  AmountInput,
  MobileDatePickerField,
  MobileButton,
  FormErrorBanner,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../lib/trpc';
import { formatAUD, formatDate } from '../lib/format';
import { triggerHaptic } from '../lib/haptics';

export interface MarkPaidEvent {
  id: string;
  name: string;
  expectedAmount: number;
  expectedDate: string;
  poolId?: string | null;
  categoryId?: string | null;
  note?: string | null;
}

export interface MarkPaidModalProps {
  visible: boolean;
  event: MarkPaidEvent | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MarkPaidModal({
  visible,
  event,
  onClose,
  onSuccess,
}: MarkPaidModalProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();

  const todayStr = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());
  }, []);

  const [actualAmount, setActualAmount] = useState('');
  const [actualDate, setActualDate] = useState(todayStr);
  const [wasFutureDate, setWasFutureDate] = useState(false);
  const [originalDate, setOriginalDate] = useState('');
  const [note, setNote] = useState('');
  const [transferAmounts, setTransferAmounts] = useState<Record<string, string>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const { data: pools = [] } = trpc.listPools.useQuery(undefined, {
    enabled: visible,
  });

  const overrideMut = trpc.overrideEvent.useMutation();
  const moveMoneyMut = trpc.moveMoney.useMutation();

  useEffect(() => {
    if (event && visible) {
      setActualAmount(event.expectedAmount.toFixed(2));
      const isFuture = Boolean(event.expectedDate && event.expectedDate > todayStr);
      setWasFutureDate(isFuture);
      setOriginalDate(event.expectedDate || '');
      setActualDate(isFuture ? todayStr : event.expectedDate || todayStr);
      setNote(event.name || '');
      setGeneralError('');
    }
  }, [event, visible, todayStr]);

  const targetPoolId = event?.poolId || event?.categoryId;
  const currentPool = useMemo(() => {
    return pools.find((p) => p.id === targetPoolId);
  }, [pools, targetPoolId]);

  const poolBal = useMemo(() => {
    if (!currentPool) return 0;
    return typeof currentPool.currentBalance === 'number'
      ? currentPool.currentBalance
      : parseFloat(String(currentPool.currentBalance) || '0');
  }, [currentPool]);

  const numAmount = useMemo(() => {
    const parsed = parseFloat(actualAmount);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }, [actualAmount]);

  const shortfallAmount = useMemo(() => {
    return Math.max(0, numAmount - poolBal);
  }, [numAmount, poolBal]);

  const hasShortfall = shortfallAmount > 0.001;

  // Pools available for top up (exclude self and zero/negative balance pools)
  const validFundingPools = useMemo(() => {
    return pools.filter((p) => {
      if (p.id === targetPoolId) return false;
      const b = typeof p.currentBalance === 'number'
        ? p.currentBalance
        : parseFloat(String(p.currentBalance) || '0');
      return b > 0;
    });
  }, [pools, targetPoolId]);

  // Identify surplus target pool
  const surplusPool = useMemo(() => {
    return validFundingPools.find((p) => p.isSurplusTarget) || validFundingPools[0];
  }, [validFundingPools]);

  // Group funding pools by poolType
  const groupedPools = useMemo(() => {
    const map: Record<string, typeof validFundingPools> = {};
    for (const p of validFundingPools) {
      const typeKey = p.poolType || 'OTHER';
      if (!map[typeKey]) map[typeKey] = [];
      map[typeKey].push(p);
    }
    return map;
  }, [validFundingPools]);

  // Initialize/prefill transfers when shortfall exists
  useEffect(() => {
    if (!visible || !hasShortfall) {
      setTransferAmounts({});
      return;
    }

    const initialAmounts: Record<string, string> = {};
    if (surplusPool) {
      const surplusBal = typeof surplusPool.currentBalance === 'number'
        ? surplusPool.currentBalance
        : parseFloat(String(surplusPool.currentBalance) || '0');
      const prefill = Math.min(shortfallAmount, surplusBal);
      if (prefill > 0) {
        initialAmounts[surplusPool.id] = prefill.toFixed(2);
      }
    }
    setTransferAmounts(initialAmounts);

    const initialExpanded: Record<string, boolean> = {};
    Object.keys(groupedPools).forEach((typeKey) => {
      initialExpanded[typeKey] = true;
    });
    setExpandedGroups(initialExpanded);
  }, [visible, hasShortfall, shortfallAmount, surplusPool, groupedPools]);

  const toggleGroup = (typeKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [typeKey]: !prev[typeKey],
    }));
  };

  const handleAmountChange = (pId: string, maxBal: number, rawVal: string) => {
    if (rawVal === '') {
      setTransferAmounts((prev) => ({ ...prev, [pId]: '' }));
      return;
    }
    if (rawVal.startsWith('-')) return;
    const parsed = parseFloat(rawVal);
    if (isNaN(parsed) || parsed < 0) {
      setTransferAmounts((prev) => ({ ...prev, [pId]: '0.00' }));
      return;
    }
    const capped = Math.min(parsed, maxBal);
    setTransferAmounts((prev) => ({ ...prev, [pId]: capped.toFixed(2) }));
  };

  const totalAllocated = useMemo(() => {
    return Object.values(transferAmounts).reduce((sum, valStr) => {
      const num = parseFloat(valStr || '0');
      return sum + (isNaN(num) ? 0 : num);
    }, 0);
  }, [transferAmounts]);

  const isFulfilled = !hasShortfall || totalAllocated >= shortfallAmount - 0.001;
  const isDateValid = Boolean(actualDate && actualDate <= todayStr);
  const isAmountValid = numAmount > 0;
  const isValid = isAmountValid && isDateValid && isFulfilled;

  if (!visible || !event) return null;

  const handleConfirm = async () => {
    if (!isValid || submitting) return;
    setGeneralError('');
    setSubmitting(true);

    try {
      if (hasShortfall && currentPool) {
        const transfers = Object.entries(transferAmounts)
          .map(([pId, amtStr]) => ({
            sourcePoolId: pId,
            destinationPoolId: currentPool.id,
            amount: parseFloat(amtStr || '0').toFixed(2),
            note: 'Shortfall Top Up',
          }))
          .filter((t) => parseFloat(t.amount) > 0);

        if (transfers.length > 0) {
          await Promise.all(
            transfers.map((t) => moveMoneyMut.mutateAsync(t))
          );
        }
      }

      await overrideMut.mutateAsync({
        eventId: event.id,
        eventType: 'EXPENSE',
        status: 'CONFIRMED',
        actualAmount: numAmount.toFixed(2),
        actualDate,
        note: note.trim() || event.name,
      });

      utils.listPools.invalidate();
      utils.listExpenseEvents.invalidate();
      utils.listTransactions.invalidate();
      utils.getMonthlySummary.invalidate();

      triggerHaptic('success');
      toast.success(t('toasts.expenseMarkedPaid'));
      onSuccess?.();
      onClose();
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : 'Failed to mark spent');
    } finally {
      setSubmitting(false);
    }
  };

  const formattedPoolType = currentPool?.poolType === 'EVERYDAY'
    ? 'Everyday'
    : currentPool?.poolType === 'REGULAR'
    ? 'Bills'
    : 'Goal';
  const formattedPoolName = currentPool?.name || 'Pool';

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('incomeBillsTabs.markSpentModalTitle')}
      footer={
        <View style={styles.footerRow}>
          <MobileButton
            variant="ghost"
            onPress={onClose}
            disabled={submitting}
            style={styles.cancelBtn}
          >
            {t('common.cancel')}
          </MobileButton>
          <MobileButton
            variant="primary"
            onPress={handleConfirm}
            loading={submitting}
            disabled={!isValid || submitting}
            style={styles.confirmBtn}
          >
            {hasShortfall
              ? t('incomeBillsTabs.confirmTransferAndSpend')
              : t('common.markSpent')}
          </MobileButton>
        </View>
      }
    >
      <View style={styles.content}>
        <FormErrorBanner message={generalError} />

        {/* Target Pool Header Card */}
        <View style={styles.poolCard}>
          <View>
            <Text style={styles.poolCardLabel}>Target Pool</Text>
            <Text style={styles.poolCardName}>
              {formattedPoolName}{' '}
              <Text style={styles.poolCardType}>({formattedPoolType})</Text>
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.poolCardLabel}>Current Balance</Text>
            <Text style={styles.poolCardBal}>{formatAUD(poolBal)}</Text>
          </View>
        </View>

        {/* Editable Amount & Date Fields */}
        <View style={styles.inputRow}>
          <View style={{ flex: 1 }}>
            <AmountInput
              label={t('common.amount')}
              required
              value={actualAmount}
              onChangeText={setActualAmount}
              error={!isAmountValid && Boolean(actualAmount) ? 'Amount must be > $0' : undefined}
            />
          </View>
          <View style={{ flex: 1 }}>
            <MobileDatePickerField
              label={t('common.date')}
              required
              value={actualDate}
              onChange={setActualDate}
              error={!isDateValid ? 'Date cannot be in future' : undefined}
            />
          </View>
        </View>

        {wasFutureDate && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              {t('incomeBillsTabs.expenseFutureDateAdjustedNotice', {
                date: formatDate(originalDate),
              })}
            </Text>
          </View>
        )}

        {/* Shortfall Alert & Multi-Pool Allocation */}
        {hasShortfall ? (
          <View style={styles.shortfallSection}>
            <View style={styles.shortfallBanner}>
              <Feather name="alert-triangle" size={16} color="#B45309" style={{ marginTop: 2 }} />
              <Text style={styles.shortfallBannerText}>
                {t('incomeBillsTabs.insufficientModalMessage', {
                  billName: event.name || 'Expense',
                  poolType: formattedPoolType,
                  poolName: formattedPoolName,
                  amount: formatAUD(shortfallAmount),
                })}
              </Text>
            </View>

            <View style={styles.fundingHeaderRow}>
              <Text style={styles.fundingHeaderLabel}>
                {t('incomeBillsTabs.fundingSourceSelectLabel')}
              </Text>
              <Text style={styles.fundingHeaderSub}>
                {t('incomeBillsTabs.hiddenZeroBalanceNote')}
              </Text>
            </View>

            {/* Accordion Grouped by Pool Type */}
            <View style={styles.accordionContainer}>
              {Object.keys(groupedPools).length === 0 ? (
                <Text style={styles.noPoolsText}>
                  No other pools with available balances found to cover the shortfall.
                </Text>
              ) : (
                Object.entries(groupedPools).map(([typeKey, poolsInGroup]) => {
                  const isExpanded = !!expandedGroups[typeKey];
                  const typeLabel = typeKey === 'REGULAR' ? 'Bills' : typeKey === 'EVERYDAY' ? 'Everyday' : 'Goal';
                  return (
                    <View key={typeKey} style={styles.accordionGroup}>
                      <TouchableOpacity
                        onPress={() => toggleGroup(typeKey)}
                        style={styles.accordionHeader}
                        activeOpacity={0.7}
                      >
                        <View style={styles.accordionHeaderLeft}>
                          <Text style={styles.accordionTitle}>{typeLabel} Pools</Text>
                          <View style={styles.accordionCountBadge}>
                            <Text style={styles.accordionCountText}>{poolsInGroup.length}</Text>
                          </View>
                        </View>
                        <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#64748B" />
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.poolItemsList}>
                          {poolsInGroup.map((pool) => {
                            const b = typeof pool.currentBalance === 'number'
                              ? pool.currentBalance
                              : parseFloat(String(pool.currentBalance) || '0');
                            const currentVal = transferAmounts[pool.id] ?? '';

                            return (
                              <View key={pool.id} style={styles.poolItemRow}>
                                <View style={styles.poolItemInfo}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={styles.poolItemName}>{pool.name}</Text>
                                    {pool.isSurplusTarget && (
                                      <View style={styles.surplusBadge}>
                                        <Text style={styles.surplusBadgeText}>Surplus</Text>
                                      </View>
                                    )}
                                  </View>
                                  <Text style={styles.poolItemBal}>
                                    Available: {formatAUD(b)}
                                  </Text>
                                </View>

                                <View style={styles.poolItemInputWrap}>
                                  <TextInput
                                    style={styles.poolAmountInput}
                                    value={currentVal}
                                    onChangeText={(val) => handleAmountChange(pool.id, b, val)}
                                    placeholder="0.00"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="decimal-pad"
                                  />
                                  <TouchableOpacity
                                    onPress={() => {
                                      const remainingNeeded = Math.max(0, shortfallAmount - (totalAllocated - (parseFloat(currentVal) || 0)));
                                      const maxAllowed = Math.min(b, remainingNeeded > 0 ? remainingNeeded : b);
                                      handleAmountChange(pool.id, b, maxAllowed.toFixed(2));
                                    }}
                                    style={styles.maxBtn}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={styles.maxBtnText}>Max</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>

            {/* Allocation Progress Bar */}
            <View style={styles.progressCard}>
              <Text style={styles.progressText}>
                {t('incomeBillsTabs.progressAllocatedHeader', {
                  allocated: formatAUD(totalAllocated),
                  shortfall: formatAUD(shortfallAmount),
                })}
              </Text>
              <Text style={[styles.progressStatus, isFulfilled ? styles.progressCovered : styles.progressRemaining]}>
                {isFulfilled
                  ? t('incomeBillsTabs.shortfallCovered')
                  : t('incomeBillsTabs.shortfallRemaining', {
                      amount: formatAUD(Math.max(0, shortfallAmount - totalAllocated)),
                    })}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.sufficientBanner}>
            <Feather name="check-circle" size={16} color="#15803D" style={{ marginTop: 1 }} />
            <Text style={styles.sufficientText}>
              {t('incomeBillsTabs.sufficientBalanceNotice', {
                poolName: formattedPoolName,
                balance: formatAUD(poolBal),
              })}
            </Text>
          </View>
        )}
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingVertical: 4,
  },
  poolCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
  },
  poolCardLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#64748B',
    marginBottom: 2,
  },
  poolCardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  poolCardType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  poolCardBal: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 10,
  },
  infoIcon: {
    fontSize: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#1E40AF',
    fontWeight: '500',
  },
  shortfallSection: {
    gap: 12,
  },
  shortfallBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    padding: 10,
  },
  shortfallBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#B45309',
    fontWeight: '600',
  },
  fundingHeaderRow: {
    gap: 2,
  },
  fundingHeaderLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  fundingHeaderSub: {
    fontSize: 11,
    color: '#64748B',
  },
  accordionContainer: {
    gap: 8,
  },
  noPoolsText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  accordionGroup: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  accordionCountBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  accordionCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  poolItemsList: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  poolItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  poolItemInfo: {
    flex: 1,
  },
  poolItemName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  surplusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  surplusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  poolItemBal: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#64748B',
    marginTop: 1,
  },
  poolItemInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  poolAmountInput: {
    width: 75,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#1B2B4B',
    textAlign: 'right',
  },
  maxBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
  },
  maxBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  progressCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  progressStatus: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressCovered: {
    color: '#15803D',
  },
  progressRemaining: {
    color: '#B45309',
  },
  sufficientBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 10,
    padding: 12,
  },
  sufficientText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#166534',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  cancelBtn: {
    minWidth: 80,
  },
  confirmBtn: {
    minWidth: 120,
  },
});

export default MarkPaidModal;
