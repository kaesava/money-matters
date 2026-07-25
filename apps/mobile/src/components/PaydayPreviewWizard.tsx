import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { trpc } from '../lib/trpc';
import { formatAUD } from '../lib/format';

interface PaydayPreviewWizardProps {
  visible: boolean;
  incomeEventId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PaydayPreviewWizard({ visible, incomeEventId, onClose, onSuccess }: PaydayPreviewWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [overrideAmount, setOverrideAmount] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [isFuturePlannedResult, setIsFuturePlannedResult] = useState(false);

  const previewQuery = trpc.previewPayday.useQuery(
    { incomeEventId: incomeEventId ?? '' },
    { enabled: visible && !!incomeEventId }
  );

  const planQuery = trpc.listAllocationPlan.useQuery(
    { incomeEventId: incomeEventId ?? '' },
    { enabled: visible && !!incomeEventId }
  );

  const confirmMutation = trpc.confirmPayday.useMutation({
    onSuccess: (data: any) => {
      if (data && typeof data === 'object' && 'isFuturePlanned' in data) {
        setIsFuturePlannedResult(Boolean(data.isFuturePlanned));
      }
      onSuccess?.();
      setStep(3);
    },
  });

  useEffect(() => {
    if (previewQuery.data?.incomeEvent) {
      const initialAmt = previewQuery.data.incomeEvent.expectedAmount || '0.00';
      setOverrideAmount(initialAmt);
      const rawDate = previewQuery.data.incomeEvent.expectedDate;
      const parsedDate = rawDate ? new Date(rawDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      setSelectedDate(parsedDate);
    }
  }, [previewQuery.data]);

  useEffect(() => {
    if (planQuery.data?.lines) {
      const initialAlloc: Record<string, string> = {};
      planQuery.data.lines.forEach((l) => {
        initialAlloc[l.categoryId] = l.proposedAmount;
      });
      setAllocations(initialAlloc);
    } else if (previewQuery.data?.engineResult?.lines) {
      const initialAlloc: Record<string, string> = {};
      previewQuery.data.engineResult.lines.forEach((l) => {
        initialAlloc[l.bucketId] = l.proposedAmount.toString();
      });
      setAllocations(initialAlloc);
    }
  }, [planQuery.data, previewQuery.data]);

  const handleLineChange = (catId: string, val: string) => {
    setAllocations((prev) => ({ ...prev, [catId]: val }));
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const isFutureDate = selectedDate > todayStr;

  const handleConfirm = () => {
    if (!incomeEventId) return;
    const linesPayload = Object.entries(allocations).map(([categoryId, amount]) => ({
      bucketId: categoryId,
      amount: parseFloat(amount || '0').toFixed(2),
    }));

    // If selected date is today/past, mark as received today
    const markAsReceivedToday = !isFutureDate;

    confirmMutation.mutate({
      incomeEventId,
      actualAmount: parseFloat(overrideAmount || '0').toFixed(2),
      markAsReceivedToday,
      lines: linesPayload,
    });
  };

  interface AllocationLineItem {
    categoryId: string;
    categoryName: string;
    proposedAmount: string;
    reasoning: string | null;
  }

  const lines: AllocationLineItem[] = planQuery.data?.lines
    ? planQuery.data.lines.map((l) => ({
        categoryId: l.categoryId,
        categoryName: l.categoryName,
        proposedAmount: l.proposedAmount,
        reasoning: l.reasoning,
      }))
    : (previewQuery.data?.engineResult?.lines || []).map((l) => ({
        categoryId: l.bucketId,
        categoryName: l.bucketName,
        proposedAmount: l.proposedAmount.toString(),
        reasoning: l.reasoning,
      }));

  const totalAllocated = Object.values(allocations).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
  const netNum = parseFloat(overrideAmount || '0');
  const residualEveryday = netNum - totalAllocated;

  const fmtDate = (dStr: string) => {
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch {
      // ignore
    }
    return dStr;
  };

  const D = DESIGN_TOKENS;

  return (
    <Modal visible={visible && !!incomeEventId} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (step > 1 && step < 3) setStep((s) => (s - 1) as any);
              else onClose();
            }}
            style={styles.backBtn}
          >
            <Feather name={step === 3 ? 'check' : step > 1 ? 'arrow-left' : 'x'} size={20} color={D.colors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.wizardTitle}>Paycheck Waterfall Review</Text>
            <Text style={styles.wizardStepIndicator}>Step {step} of 3</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {previewQuery.isLoading ? (
          <ActivityIndicator color={D.colors.accent} style={{ marginTop: 60 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
            {/* STEP 1: SUMMARY & NET PAYCHECK */}
            {step === 1 && (
              <View style={styles.stepContainer}>
                {isFutureDate && (
                  <View style={styles.futureAlert}>
                    <Text style={styles.futureAlertTitle}>📅 Upcoming Payday ({fmtDate(selectedDate)})</Text>
                    <Text style={styles.futureAlertBody}>
                      Your category balances will only update when money actually lands in your bank. Saving this will store your split plan so it&apos;s ready to go on payday (or change the date below if your pay arrived early!).
                    </Text>
                  </View>
                )}

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Paycheck Details</Text>
                  <Text style={styles.sourceText}>Income Deposit</Text>
                  <View style={{ marginTop: 6, gap: 4 }}>
                    <Text style={styles.dateLabel}>Payday Date (YYYY-MM-DD):</Text>
                    <TextInput
                      value={selectedDate}
                      onChangeText={setSelectedDate}
                      placeholder="YYYY-MM-DD"
                      style={styles.dateInput}
                    />
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Net Deposit Amount ($)</Text>
                  <TextInput
                    value={overrideAmount}
                    onChangeText={setOverrideAmount}
                    keyboardType="numeric"
                    style={styles.amountInput}
                  />
                  <Text style={styles.hintText}>
                    Original Expected: {formatAUD(previewQuery.data?.incomeEvent?.expectedAmount || '0')}
                  </Text>
                </View>

                <TouchableOpacity onPress={() => setStep(2)} style={styles.nextBtn} activeOpacity={0.8}>
                  <Text style={styles.nextBtnText}>Next: Category Allocations →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: CATEGORY ALLOCATIONS */}
            {step === 2 && (
              <View style={styles.stepContainer}>
                {isFutureDate && (
                  <View style={styles.futureAlert}>
                    <Text style={styles.futureAlertTitle}>📅 Upcoming Payday ({fmtDate(selectedDate)})</Text>
                    <Text style={styles.futureAlertBody}>
                      Your category balances will only update when money actually lands in your bank. Saving this will store your split plan so it&apos;s ready to go on payday (or change the date in Step 1 if your pay arrived early!).
                    </Text>
                  </View>
                )}

                <View style={styles.card}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Net Paycheck:</Text>
                    <Text style={styles.summaryVal}>{formatAUD(netNum)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Sum Allocated:</Text>
                    <Text style={styles.summaryVal}>{formatAUD(totalAllocated)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Everyday Pool Residual:</Text>
                    <Text style={[styles.summaryVal, { color: residualEveryday >= 0 ? '#10B981' : '#EF4444' }]}>
                      {formatAUD(residualEveryday)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.sectionHeader}>Waterfall Category Allocations</Text>
                {lines.map((line) => (
                  <View key={line.categoryId} style={styles.lineCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lineCatName}>{line.categoryName}</Text>
                      <Text style={styles.lineReasoning}>{line.reasoning || 'Standard pro-rata contribution'}</Text>
                    </View>
                    <TextInput
                      value={allocations[line.categoryId] ?? line.proposedAmount}
                      onChangeText={(val) => handleLineChange(line.categoryId, val)}
                      keyboardType="numeric"
                      style={styles.lineInput}
                    />
                  </View>
                ))}

                <TouchableOpacity
                  onPress={handleConfirm}
                  disabled={confirmMutation.isPending}
                  style={[styles.nextBtn, isFutureDate ? { backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#00B4A6' } : {}]}
                  activeOpacity={0.8}
                >
                  {confirmMutation.isPending ? (
                    <ActivityIndicator color={isFutureDate ? '#00B4A6' : '#FFF'} />
                  ) : (
                    <Text style={[styles.nextBtnText, isFutureDate ? { color: '#0F766E' } : {}]}>
                      {isFutureDate ? '📅 Save Plan for Payday' : 'Confirm & Distribute Payday ✓'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 3: CONFIRMATION & TRANSFER SUMMARY */}
            {step === 3 && (
              <View style={styles.stepContainer}>
                <View style={styles.successBanner}>
                  <Text style={styles.successIcon}>{isFuturePlannedResult ? '📅' : '🎉'}</Text>
                  <Text style={styles.successTitle}>
                    {isFuturePlannedResult ? 'Payday Plan Saved!' : 'Paycheck Allocated!'}
                  </Text>
                  <Text style={styles.successSubtitle}>
                    {isFuturePlannedResult
                      ? 'Your allocation plan has been saved for payday. Category balances remain untouched until payday arrives.'
                      : 'Category balances have been updated. Transfer the recommended amounts below to your savings account.'}
                  </Text>
                </View>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Allocation Summary</Text>
                  <Text style={styles.hintText}>
                    Total Allocation: {formatAUD(totalAllocated)} across your budget categories.
                  </Text>
                </View>

                <TouchableOpacity onPress={onClose} style={styles.doneBtn} activeOpacity={0.8}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: D.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: D.colors.surface,
  },
  backBtn: { padding: 4 },
  wizardTitle: { fontSize: 16, fontWeight: '800', color: D.colors.primary },
  wizardStepIndicator: { fontSize: 11, color: D.colors.textMuted, fontWeight: '700' },
  scrollBody: { padding: 20, gap: 16 },
  stepContainer: { gap: 16 },
  futureAlert: { backgroundColor: '#F0FDFA', padding: 14, borderRadius: D.radius.md, borderWidth: 1, borderColor: '#99F6E4', gap: 6 },
  futureAlertTitle: { fontSize: 13, fontWeight: '800', color: '#0F766E' },
  futureAlertBody: { fontSize: 11, color: '#115E59', lineHeight: 16 },
  card: { backgroundColor: D.colors.surface, borderRadius: D.radius.md, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 6 },
  cardTitle: { fontSize: 13, fontWeight: '800', color: D.colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  sourceText: { fontSize: 18, fontWeight: '900', color: D.colors.primary },
  dateLabel: { fontSize: 11, fontWeight: '700', color: D.colors.textMuted },
  dateInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, fontWeight: '700', color: D.colors.primary, backgroundColor: '#FFF' },
  amountInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: D.radius.md, padding: 12, fontSize: 18, fontWeight: '800', color: D.colors.primary, backgroundColor: '#FFF' },
  hintText: { fontSize: 12, color: D.colors.textMuted },
  nextBtn: { backgroundColor: '#00B4A6', paddingVertical: 14, borderRadius: D.radius.md, alignItems: 'center', marginTop: 8 },
  nextBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: D.colors.textMuted },
  summaryVal: { fontSize: 14, fontWeight: '800', color: D.colors.primary },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: D.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  lineCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: D.colors.surface, padding: 12, borderRadius: D.radius.md, borderWidth: 1, borderColor: '#E5E7EB', gap: 12 },
  lineCatName: { fontSize: 14, fontWeight: '700', color: D.colors.primary },
  lineReasoning: { fontSize: 10, color: D.colors.textMuted },
  lineInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 14, fontWeight: '800', width: 90, textAlign: 'right' },
  successBanner: { alignItems: 'center', padding: 24, backgroundColor: '#ECFDF5', borderRadius: D.radius.lg, borderWidth: 1, borderColor: '#A7F3D0', gap: 8 },
  successIcon: { fontSize: 40 },
  successTitle: { fontSize: 20, fontWeight: '900', color: '#065F46' },
  successSubtitle: { fontSize: 13, color: '#047857', textAlign: 'center' },
  doneBtn: { backgroundColor: D.colors.primary, paddingVertical: 14, borderRadius: D.radius.md, alignItems: 'center', marginTop: 16 },
  doneBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
