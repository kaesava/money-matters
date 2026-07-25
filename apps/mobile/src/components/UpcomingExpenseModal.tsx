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
} from 'react-native';
import { trpc } from '../lib/trpc';

interface UpcomingExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  eventToEdit?: {
    id?: string;
    name?: string;
    expectedDate?: string;
    expectedAmount?: string;
    categoryId?: string | null;
    categoryName?: string;
    note?: string | null;
    isRecurring?: boolean;
  } | null;
  isQuickAdd?: boolean;
  onSuccess?: () => void;
}

function fmt(val: number) {
  return `$${val.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function UpcomingExpenseModal({
  visible,
  onClose,
  eventToEdit,
  isQuickAdd = false,
  onSuccess,
}: UpcomingExpenseModalProps) {
  const utils = trpc.useUtils();
  const todayStr = new Date().toISOString().split('T')[0];

  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: visible });
  const categories = categoriesQuery.data ?? [];

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [expectedDate, setExpectedDate] = useState(todayStr);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const overrideMut = trpc.overrideEvent.useMutation();
  const markPaidMut = trpc.markExpensePaid.useMutation();
  const deleteMut = trpc.deleteUpcomingEvent.useMutation();
  const createUpcomingMut = trpc.createUpcomingExpense.useMutation();
  const recordExpenseMut = trpc.recordExpense.useMutation();

  useEffect(() => {
    if (eventToEdit) {
      setName(eventToEdit.name || '');
      setCategoryId(eventToEdit.categoryId || (categories[0]?.id ?? ''));
      setAmount(eventToEdit.expectedAmount || '');
      setExpectedDate(eventToEdit.expectedDate || todayStr);
      setNote(eventToEdit.note || '');
    } else {
      setName('');
      setCategoryId(categories[0]?.id || '');
      setAmount('');
      setExpectedDate(todayStr);
      setNote('');
    }
    setErrorMsg('');
  }, [eventToEdit, visible, categories]);

  if (!visible) return null;

  const numAmount = parseFloat(amount) || 0;
  const isFutureDate = expectedDate > todayStr;
  const selectedCat = categories.find((c) => c.id === categoryId);
  const currentCatBal = selectedCat ? parseFloat(selectedCat.currentBalance || '0') : 0;
  const projectedBal = currentCatBal - numAmount;
  const isNegativeWarning = !isFutureDate && selectedCat && numAmount > currentCatBal;

  const validateInput = (): boolean => {
    if (!name.trim()) {
      setErrorMsg('Please enter an expense bill name.');
      return false;
    }
    if (!categoryId) {
      setErrorMsg('Please select a category.');
      return false;
    }
    if (isNaN(numAmount) || numAmount < 0) {
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
      if (eventToEdit?.id) {
        await overrideMut.mutateAsync({
          eventId: eventToEdit.id,
          eventType: 'EXPENSE',
          name,
          categoryId,
          amount: numAmount.toFixed(2),
          expectedDate,
          note,
        });
      } else {
        await createUpcomingMut.mutateAsync({
          name,
          amount: numAmount.toFixed(2),
          categoryId,
          expectedDate,
          note,
        });
      }
      await utils.listExpenseEvents.invalidate();
      await utils.listCategories.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkPaid = async () => {
    setErrorMsg('');
    if (!validateInput()) return;

    if (isNegativeWarning) {
      Alert.alert(
        'Negative Balance Warning',
        `Payment of ${fmt(numAmount)} exceeds "${selectedCat?.name}" balance (${fmt(currentCatBal)}). Category balance will become negative (${fmt(projectedBal)}). Proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Proceed', onPress: () => executeMarkPaid() },
        ]
      );
      return;
    }

    await executeMarkPaid();
  };

  const executeMarkPaid = async () => {
    setSubmitting(true);
    try {
      if (eventToEdit?.id) {
        await markPaidMut.mutateAsync({
          eventId: eventToEdit.id,
          actualAmount: numAmount.toFixed(2),
          note: note || `Paid ${name}`,
        });
      } else {
        await recordExpenseMut.mutateAsync({
          categoryId,
          amount: numAmount.toFixed(2),
          flowType: 'DEBIT',
          note: note || `Paid ${name}`,
          recordedAt: new Date(expectedDate).toISOString(),
        });
      }
      await utils.listExpenseEvents.invalidate();
      await utils.listCategories.invalidate();
      await utils.listTransactions.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to mark paid.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!eventToEdit?.id) return;
    Alert.alert(
      'Permanent Delete Warning',
      'This upcoming expense record will be permanently deleted (not archived). Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await deleteMut.mutateAsync({ eventId: eventToEdit.id!, eventType: 'EXPENSE' });
              await utils.listExpenseEvents.invalidate();
              if (onSuccess) onSuccess();
              onClose();
            } catch (err: any) {
              setErrorMsg(err?.message || 'Failed to delete record.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>
              {isQuickAdd ? 'Quick Record Expense' : `Edit / Mark Paid: ${name || 'Expense'}`}
            </Text>

            {errorMsg ? <Text style={styles.errorBanner}>{errorMsg}</Text> : null}

            {!isQuickAdd && eventToEdit?.isRecurring ? (
              <View style={styles.seriesBanner}>
                <Text style={styles.seriesTitle}>Single Occurrence Edit</Text>
                <Text style={styles.seriesDesc}>
                  Editing this specific expense date or amount. Edit Master Series →
                </Text>
              </View>
            ) : null}

            <Text style={styles.label}>Expense Bill Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Electric Bill"
            />

            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Amount ($)</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Expected Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={expectedDate}
                  onChangeText={setExpectedDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            <Text style={styles.label}>Category {isQuickAdd ? '' : '(Read-Only)'}</Text>
            <TextInput
              style={[styles.input, !isQuickAdd && styles.readOnlyInput]}
              value={selectedCat?.name || eventToEdit?.categoryName || 'Uncategorized'}
              editable={isQuickAdd}
            />

            {selectedCat ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                  Current Balance: <Text style={styles.bold}>{fmt(currentCatBal)}</Text>
                </Text>
                <Text style={styles.infoText}>
                  Projected After: <Text style={styles.bold}>{fmt(projectedBal)}</Text>
                </Text>
                {isFutureDate && selectedCat.healthStatus ? (
                  <Text style={styles.healthBadge}>Health: {selectedCat.healthStatus}</Text>
                ) : null}
              </View>
            ) : null}

            <Text style={styles.label}>Notes / Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={note}
              onChangeText={setNote}
              multiline
              placeholder="Add optional notes..."
            />

            {isFutureDate ? (
              <Text style={styles.futureGuidance}>
                Your category balances will only update when money is actually marked as paid. Saving this will store your expense so it's ready to go when paid (or change the date above if your expense occurred early!).
              </Text>
            ) : null}

            {isNegativeWarning ? (
              <Text style={styles.warnText}>
                ⚠️ Payment of {fmt(numAmount)} exceeds "{selectedCat?.name}" balance. Balance will become negative ({fmt(projectedBal)}).
              </Text>
            ) : null}

            <View style={styles.btnRow}>
              {!isQuickAdd && eventToEdit?.id ? (
                <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} disabled={submitting}>
                  <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveWithoutMarkingPaid}
                style={styles.saveNoPayBtn}
                disabled={submitting}
              >
                <Text style={styles.saveNoPayText}>Save w/o Paid</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleMarkPaid}
                style={[styles.markPaidBtn, isFutureDate && styles.disabledBtn]}
                disabled={submitting || isFutureDate}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.markPaidText}>Mark Paid</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, maxHeight: '90%' },
  scrollContent: { gap: 10 },
  title: { fontSize: 16, fontWeight: '800', color: '#1B2B4B' },
  errorBanner: { backgroundColor: '#FEE2E2', color: '#991B1B', padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 'bold' },
  seriesBanner: { backgroundColor: '#CCFBF1', padding: 10, borderRadius: 10 },
  seriesTitle: { fontWeight: '800', color: '#0F766E', fontSize: 12 },
  seriesDesc: { color: '#0F766E', fontSize: 11 },
  label: { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, fontSize: 13, color: '#1E293B' },
  readOnlyInput: { backgroundColor: '#F1F5F9', color: '#64748B' },
  textArea: { height: 60 },
  row: { flexDirection: 'row', gap: 10 },
  halfCol: { flex: 1 },
  infoCard: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 10, gap: 4 },
  infoText: { fontSize: 12, color: '#334155' },
  bold: { fontWeight: '800' },
  healthBadge: { fontSize: 11, fontWeight: '800', color: '#0F766E' },
  futureGuidance: { fontSize: 11, color: '#D97706', backgroundColor: '#FEF3C7', padding: 10, borderRadius: 10 },
  warnText: { fontSize: 11, color: '#B91C1C', backgroundColor: '#FEE2E2', padding: 10, borderRadius: 10, fontWeight: 'bold' },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  deleteBtn: { backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8 },
  deleteBtnText: { color: '#991B1B', fontWeight: 'bold', fontSize: 11 },
  cancelBtn: { borderWidth: 1, borderColor: '#CBD5E1', padding: 10, borderRadius: 8 },
  cancelBtnText: { color: '#475569', fontWeight: 'bold', fontSize: 11 },
  saveNoPayBtn: { borderWidth: 1, borderColor: '#00B4A6', padding: 10, borderRadius: 8 },
  saveNoPayText: { color: '#00B4A6', fontWeight: 'bold', fontSize: 11 },
  markPaidBtn: { backgroundColor: '#1B2B4B', padding: 10, borderRadius: 8 },
  disabledBtn: { backgroundColor: '#94A3B8' },
  markPaidText: { color: '#FFF', fontWeight: '800', fontSize: 11 },
});
