import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../lib/trpc';
import { formatAUD } from '../lib/format';

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
  const D = DESIGN_TOKENS;
  const utils = trpc.useUtils();

  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
  }).format(new Date());

  const [actualAmount, setActualAmount] = useState('');
  const [actualDate, setActualDate] = useState(todayStr);
  const [note, setNote] = useState('');
  const [fundingPoolId, setFundingPoolId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: pools } = trpc.listPools.useQuery(undefined, {
    enabled: visible,
  });

  const overrideMut = trpc.overrideEvent.useMutation();
  const moveMoneyMut = trpc.moveMoney.useMutation();

  useEffect(() => {
    if (event) {
      setActualAmount(event.expectedAmount.toFixed(2));
      setActualDate(todayStr);
      setNote(event.name || '');
    }
  }, [event, todayStr]);

  if (!visible || !event) return null;

  const currentPool = pools?.find((p) => p.id === (event.poolId || event.categoryId));
  const poolBal = currentPool
    ? typeof currentPool.currentBalance === 'number'
      ? currentPool.currentBalance
      : parseFloat(String(currentPool.currentBalance) || '0')
    : 0;

  const numAmount = parseFloat(actualAmount) || 0;
  const shortfall = numAmount - poolBal;
  const isShortfall = shortfall > 0;

  const handleConfirm = async () => {
    if (!actualAmount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert(t('common.error'), 'Please enter a valid payment amount.');
      return;
    }

    if (actualDate > todayStr) {
      Alert.alert(
        t('common.error'),
        'Mark Paid cannot be recorded with a future date. Please select today or a past date.'
      );
      return;
    }

    setSubmitting(true);
    try {
      // If there was a shortfall and a funding pool was selected, transfer the difference first
      if (isShortfall && fundingPoolId && currentPool) {
        await moveMoneyMut.mutateAsync({
          sourcePoolId: fundingPoolId,
          destinationPoolId: currentPool.id,
          amount: shortfall.toFixed(2),
          note: `Auto-topup for bill payment: ${event.name}`,
        });
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

      onSuccess?.();
      onClose();
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : 'Failed to mark bill as paid'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Feather name="check-circle" size={18} color="#22c55e" />
              <Text style={styles.title}>Mark Bill as Paid</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Bill summary info */}
            <View style={styles.billInfo}>
              <Text style={styles.billName}>{event.name}</Text>
              <Text style={styles.billMeta}>
                Expected {formatAUD(event.expectedAmount)} on {event.expectedDate}
              </Text>
            </View>

            {/* Actual Amount input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Actual Amount Paid ($)</Text>
              <View style={styles.amountWrap}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="decimal-pad"
                  value={actualAmount}
                  onChangeText={setActualAmount}
                  placeholder="0.00"
                  placeholderTextColor="#94A3B8"
                  autoFocus
                />
              </View>
            </View>

            {/* Actual Date input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Paid Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                value={actualDate}
                onChangeText={setActualDate}
                placeholder={todayStr}
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Shortfall Alert & Funding Pool Selector */}
            {isShortfall && (
              <View style={styles.shortfallBox}>
                <View style={styles.shortfallHeader}>
                  <Feather name="alert-triangle" size={16} color="#ba1a1a" />
                  <Text style={styles.shortfallTitle}>
                    Shortfall: {formatAUD(shortfall)}
                  </Text>
                </View>
                <Text style={styles.shortfallDesc}>
                  Current pool balance is {formatAUD(poolBal)}. Choose a pool to top up the remaining difference:
                </Text>

                <View style={styles.poolsGrid}>
                  {pools
                    ?.filter((p) => p.id !== currentPool?.id)
                    .map((p) => {
                      const isSelected = p.id === fundingPoolId;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          onPress={() => setFundingPoolId(p.id)}
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

            {/* Note input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Transaction Note (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={note}
                onChangeText={setNote}
                placeholder="Paid bill..."
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={submitting}
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Confirm Payment</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    gap: 14,
    paddingBottom: 20,
  },
  billInfo: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  billName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  billMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
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
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
    paddingVertical: 10,
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
  shortfallBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  shortfallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shortfallTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  shortfallDesc: {
    fontSize: 11,
    color: '#7F1D1D',
    lineHeight: 16,
  },
  poolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  poolChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  poolChipSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  poolChipName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#881337',
  },
  poolChipNameSelected: {
    color: '#FFFFFF',
  },
  poolChipBal: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#9F1239',
  },
  poolChipBalSelected: {
    color: '#FFFFFF',
  },
  submitBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default MarkPaidModal;
