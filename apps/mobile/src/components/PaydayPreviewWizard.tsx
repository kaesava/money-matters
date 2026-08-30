import React, { useState, useEffect } from 'react';
import { t } from '@money-matters/i18n';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { trpc } from '../lib/trpc';
import { formatAUD } from '../lib/format';

interface PaydayPreviewWizardProps {
  visible: boolean;
  incomeEventId: string | null;
  eventToEdit?: {
    id?: string;
    sourceName?: string;
    expectedDate?: string;
    expectedAmount?: string;
    receivingAccountId?: string | null;
    note?: string | null;
    isRecurring?: boolean;
  } | null;
  isQuickAdd?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PaydayPreviewWizard({
  visible,
  incomeEventId,
  eventToEdit,
  isQuickAdd = false,
  onClose,
  onSuccess,
}: PaydayPreviewWizardProps) {
  const utils = trpc.useUtils();
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeId = incomeEventId || eventToEdit?.id || null;

  const categoriesQuery = trpc.listPools.useQuery(undefined, { enabled: visible });
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery(undefined, { enabled: visible });

  const categories = categoriesQuery.data ?? [];
  const bankAccounts = bankAccountsQuery.data ?? [];

  const [sourceName, setSourceName] = useState('');
  const [overrideAmount, setOverrideAmount] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [receivingAccountId, setReceivingAccountId] = useState('');
  const [note, setNote] = useState('');
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const previewQuery = trpc.previewPayday.useQuery(
    { incomeEventId: activeId ?? '' },
    { enabled: visible && !!activeId }
  );

  const confirmMutation = trpc.confirmPayday.useMutation();
  const overrideMutation = trpc.overrideEvent.useMutation();
  const deleteMutation = trpc.deleteUpcomingEvent.useMutation();
  const createUpcomingMutation = trpc.createUpcomingIncome.useMutation();

  useEffect(() => {
    if (previewQuery.data?.incomeEvent) {
      setSourceName(previewQuery.data.incomeEvent.name || eventToEdit?.sourceName || 'Paycheck');
      setOverrideAmount(previewQuery.data.incomeEvent.actualAmount || eventToEdit?.expectedAmount || '0.00');
      const rawDate = previewQuery.data.incomeEvent.expectedDate || eventToEdit?.expectedDate;
      setSelectedDate(rawDate ? new Date(rawDate).toISOString().slice(0, 10) : todayStr);
      setNote(eventToEdit?.note || '');
      setReceivingAccountId(eventToEdit?.receivingAccountId || bankAccounts[0]?.id || '');
    } else {
      setSourceName(eventToEdit?.sourceName || '');
      setOverrideAmount(eventToEdit?.expectedAmount || '');
      setSelectedDate(eventToEdit?.expectedDate || todayStr);
      setNote(eventToEdit?.note || '');
      setReceivingAccountId(eventToEdit?.receivingAccountId || bankAccounts[0]?.id || '');
    }
  }, [previewQuery.data, eventToEdit, visible, bankAccounts]);

interface PaydayLine {
  poolId?: string;
  bucketId?: string;
  poolName?: string;
  bucketName?: string;
  proposedAmount: number | string;
  reasoning?: string;
}

  useEffect(() => {
    const rawLines = (previewQuery.data?.engineResult as unknown as { lines?: PaydayLine[] })?.lines;
    if (Array.isArray(rawLines)) {
      const initialAlloc: Record<string, string> = {};
      rawLines.forEach((l) => {
        const id = l.poolId || l.bucketId || '';
        const amt = typeof l.proposedAmount === 'number' ? l.proposedAmount.toFixed(2) : String(l.proposedAmount || '0');
        if (id) initialAlloc[id] = amt;
      });
      setAllocations(initialAlloc);
    }
  }, [previewQuery.data]);

  if (!visible) return null;

  const numericAmt = parseFloat(overrideAmount) || 0;
  const isFutureDate = selectedDate > todayStr;

  const validateInput = (): boolean => {
    if (!sourceName.trim()) {
      setErrorMsg('Please enter an income source name.');
      return false;
    }
    if (isNaN(numericAmt) || numericAmt < 0) {
      setErrorMsg('Amount cannot be less than 0.');
      return false;
    }
    return true;
  };

  const handleSaveWithoutMarkingPaid = async () => {
    setErrorMsg('');
    if (!validateInput()) return;
    setSubmitting(true);
    try {
      if (activeId) {
        await overrideMutation.mutateAsync({
          eventId: activeId,
          eventType: 'INCOME',
          name: sourceName,
          amount: numericAmt.toFixed(2),
          expectedDate: selectedDate,
          note,
        });
      } else {
        await createUpcomingMutation.mutateAsync({
          name: sourceName,
          amount: numericAmt.toFixed(2),
          expectedDate: selectedDate,
          receivingAccountId: receivingAccountId || undefined,
          note,
        });
      }
      await utils.listIncomeEvents.invalidate();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save income event.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPayday = async () => {
    setErrorMsg('');
    if (!validateInput()) return;
    setSubmitting(true);
    try {
      if (activeId) {
        const linesPayload = Object.entries(allocations).map(([poolId, amount]) => ({
          poolId,
          amount: parseFloat(amount || '0').toFixed(2),
        }));

        await confirmMutation.mutateAsync({
          incomeEventId: activeId,
          actualAmount: numericAmt.toFixed(2),
          markAsReceivedToday: !isFutureDate,
          lines: linesPayload,
        });
      } else {
        const createdEvt = await createUpcomingMutation.mutateAsync({
          name: sourceName,
          amount: numericAmt.toFixed(2),
          expectedDate: selectedDate,
          receivingAccountId: receivingAccountId || undefined,
          note,
        });
        const preview = await utils.previewPayday.fetch({ incomeEventId: createdEvt.id });
        const rawLines = (preview.engineResult as unknown as { lines?: PaydayLine[] })?.lines ?? [];
        const linesPayload = rawLines.map((l) => ({
          poolId: l.poolId || l.bucketId || '',
          amount: (typeof l.proposedAmount === 'number' ? l.proposedAmount : parseFloat(String(l.proposedAmount || '0'))).toFixed(2),
        }));
        await confirmMutation.mutateAsync({
          incomeEventId: createdEvt.id,
          actualAmount: numericAmt.toFixed(2),
          markAsReceivedToday: !isFutureDate,
          lines: linesPayload,
        });
      }
      await utils.listIncomeEvents.invalidate();
      await utils.listCategories.invalidate();
      await utils.listTransactions.invalidate();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to process payday.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!activeId) return;
    Alert.alert(
      'Permanent Delete Warning',
      'This upcoming income deposit will be permanently deleted (not archived). Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await deleteMutation.mutateAsync({ eventId: activeId, eventType: 'INCOME' });
              await utils.listIncomeEvents.invalidate();
              onSuccess?.();
              onClose();
            } catch (err: unknown) {
              setErrorMsg(err instanceof Error ? err.message : 'Failed to delete income record.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };


  const showReasonAlert = (catName: string, reason: string) => {
    Alert.alert(`Allocation Reason: ${catName}`, reason || 'Standard budget target allocation.');
  };

  const rawEngineResult = previewQuery.data?.engineResult as unknown as { lines?: PaydayLine[] } | undefined;
  const lines: PaydayLine[] = Array.isArray(rawEngineResult?.lines) ? rawEngineResult!.lines : [];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Feather name="x" size={20} color="#1B2B4B" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {isQuickAdd ? 'Quick Record Income' : `Process Payday / Edit: ${sourceName || 'Income'}`}
          </Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {errorMsg ? <Text style={styles.errorBanner}>{errorMsg}</Text> : null}

          {!isQuickAdd && eventToEdit?.isRecurring ? (
            <View style={styles.seriesBanner}>
              <Text style={styles.seriesTitle}>Single Occurrence Edit</Text>
              <Text style={styles.seriesDesc}>
                Editing this specific income date or amount. Edit Master Series →
              </Text>
            </View>
          ) : null}

          <Text style={styles.label}>Income Source Name</Text>
          <TextInput
            style={styles.input}
            value={sourceName}
            onChangeText={setSourceName}
            placeholder={t('modals.paydayPreview.incomeNamePlaceholder')}
          />

          <View style={styles.row}>
            <View style={styles.halfCol}>
              <Text style={styles.label}>Amount ($)</Text>
              <TextInput
                style={styles.input}
                value={overrideAmount}
                onChangeText={setOverrideAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>

            <View style={styles.halfCol}>
              <Text style={styles.label}>Payday Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          <Text style={styles.label}>Notes / Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={note}
            onChangeText={setNote}
            multiline
            placeholder={t('modals.paydayPreview.notesPlaceholder')}
          />

          {lines.length > 0 ? (
            <View style={styles.linesSection}>
              <Text style={styles.sectionHeader}>Category Distribution Splits</Text>
              {lines.map((l) => {
                const lineId = l.poolId || l.bucketId || '';
                const lineName = l.poolName || l.bucketName || 'Pool';
                const lineReason = l.reasoning || '';
                const proposedNum = typeof l.proposedAmount === 'number' ? l.proposedAmount : parseFloat(String(l.proposedAmount || '0')) || 0;
                const cat = categories.find((c) => c.id === lineId);

                const curBal = cat ? (typeof cat.currentBalance === 'number' ? cat.currentBalance : parseFloat(cat.currentBalance || '0')) : 0;
                const addAmt = parseFloat(allocations[lineId] ?? String(proposedNum)) || 0;
                const projBal = curBal + addAmt;

                return (
                  <View key={lineId} style={styles.lineCard}>
                    <View style={styles.lineHeader}>
                      <Text style={styles.catName}>{lineName}</Text>
                      {lineReason ? (
                        <TouchableOpacity onPress={() => showReasonAlert(lineName, lineReason)}>
                          <Text style={styles.whyBtn}>ⓘ Why this amount?</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <View style={styles.lineInputRow}>
                      <Text style={styles.lineBalText}>
                        Before: {formatAUD(curBal)} | Projected: {formatAUD(projBal)}
                      </Text>
                      <TextInput
                        style={styles.lineInput}
                        value={allocations[lineId] ?? proposedNum.toFixed(2)}
                        onChangeText={(val) => setAllocations((prev) => ({ ...prev, [lineId]: val }))}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={styles.btnRow}>
            {!isQuickAdd && activeId ? (
              <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} disabled={submitting}>
                <Text style={styles.deleteBtnText}>🗑️ {t('common.delete')}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSaveWithoutMarkingPaid}
              style={styles.saveNoPayBtn}
              disabled={submitting}
            >
              <Text style={styles.saveNoPayText}>{t('modals.paydayPreview.saveDetailsOnly')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirmPayday}
              style={styles.confirmBtn}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.confirmBtnText}>{t('modals.paydayPreview.runWaterfall')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>

  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backBtn: { padding: 4 },
  title: { fontSize: 15, fontWeight: '800', color: '#1B2B4B' },
  scrollContent: { padding: 16, gap: 12 },
  errorBanner: { backgroundColor: '#FEE2E2', color: '#991B1B', padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 'bold' },
  seriesBanner: { backgroundColor: '#CCFBF1', padding: 10, borderRadius: 10 },
  seriesTitle: { fontWeight: '800', color: '#0F766E', fontSize: 12 },
  seriesDesc: { color: '#0F766E', fontSize: 11 },
  label: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, fontSize: 13, color: '#1E293B' },
  textArea: { height: 60 },
  row: { flexDirection: 'row', gap: 10 },
  halfCol: { flex: 1 },
  linesSection: { marginTop: 10, gap: 8 },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: '#1B2B4B' },
  lineCard: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 6 },
  lineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { fontSize: 12, fontWeight: '800', color: '#1B2B4B' },
  whyBtn: { fontSize: 11, color: '#00B4A6', fontWeight: 'bold' },
  lineInputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineBalText: { fontSize: 10, color: '#64748B' },
  lineInput: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, width: 80, textAlign: 'right', fontSize: 12, fontWeight: 'bold' },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: 16, flexWrap: 'wrap' },
  deleteBtn: { backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8 },
  deleteBtnText: { color: '#991B1B', fontWeight: 'bold', fontSize: 11 },
  cancelBtn: { borderWidth: 1, borderColor: '#CBD5E1', padding: 10, borderRadius: 8 },
  cancelBtnText: { color: '#475569', fontWeight: 'bold', fontSize: 11 },
  saveNoPayBtn: { borderWidth: 1, borderColor: '#00B4A6', padding: 10, borderRadius: 8 },
  saveNoPayText: { color: '#00B4A6', fontWeight: 'bold', fontSize: 11 },
  confirmBtn: { backgroundColor: '#00B4A6', padding: 10, borderRadius: 8 },
  confirmBtnText: { color: '#FFF', fontWeight: '800', fontSize: 11 },
});
