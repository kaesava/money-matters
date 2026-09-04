import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { DESIGN_TOKENS, MobileModalDialog, RecurrenceBuilder, useRecurrenceBuilder } from '@money-matters/ui/mobile';
import { trpc } from '../lib/trpc';

export interface SourceToEdit {
  id: string;
  name: string;
  amount: string;
  type?: string;
  rrule?: string | null;
  startDate?: string | Date | null;
  endDate?: string | null;
  categoryId?: string | null;
  receivingAccountId?: string | null;
}


interface IncomeExpenseFormModalProps {
  visible: boolean;
  mode: 'INCOME' | 'EXPENSE';
  sourceToEdit?: SourceToEdit | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function IncomeExpenseFormModal({ visible, mode, sourceToEdit, onClose, onSuccess }: IncomeExpenseFormModalProps) {
  const categoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: visible && mode === 'EXPENSE' });
  const categories = categoriesQuery.data ?? [];

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const recurrenceBuilder = useRecurrenceBuilder();
  const { frequency, isRecurring, startDate, endDate, setStartDate, setEndDate, setIsRecurring, setFrequency, setInterval } = recurrenceBuilder;

  useEffect(() => {
    if (sourceToEdit) {
      setName(sourceToEdit.name);
      setAmount(sourceToEdit.amount);
      const hasSchedule = !!sourceToEdit.rrule || !!sourceToEdit.startDate;
      setIsRecurring(hasSchedule);

      if (sourceToEdit.rrule) {
        if (sourceToEdit.rrule.includes('FREQ=WEEKLY;INTERVAL=2')) {
          setFrequency('FORTNIGHTLY');
          setInterval(1);
        } else if (sourceToEdit.rrule.includes('FREQ=WEEKLY')) {
          setFrequency('WEEKLY');
          const m = sourceToEdit.rrule.match(/INTERVAL=(\d+)/);
          setInterval(m ? parseInt(m[1]) : 1);
        } else if (sourceToEdit.rrule.includes('FREQ=YEARLY')) {
          setFrequency('ANNUALLY');
          const m = sourceToEdit.rrule.match(/INTERVAL=(\d+)/);
          setInterval(m ? parseInt(m[1]) : 1);
        } else {
          setFrequency('MONTHLY');
          const m = sourceToEdit.rrule.match(/INTERVAL=(\d+)/);
          setInterval(m ? parseInt(m[1]) : 1);
        }
      } else {
        setFrequency('MONTHLY');
        setInterval(1);
      }

      if (sourceToEdit.startDate) {
        const dStr = typeof sourceToEdit.startDate === 'string' ? sourceToEdit.startDate : sourceToEdit.startDate.toISOString();
        setStartDate(dStr.split('T')[0] ?? '');
      }
      if (sourceToEdit.endDate) setEndDate(sourceToEdit.endDate.split('T')[0] ?? '');
      if (sourceToEdit.categoryId) setCategoryId(sourceToEdit.categoryId);
    } else {
      setName('');
      setAmount('');
      setIsRecurring(true);
      setFrequency('MONTHLY');
      setInterval(1);
      setStartDate(new Date().toISOString().split('T')[0] ?? '');
      setEndDate(null);
      setCategoryId('');
    }
  }, [sourceToEdit, visible]);

  const createIncomeMut = trpc.createIncomeSource.useMutation({
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  const updateIncomeMut = trpc.updateIncomeSource.useMutation({
    onSuccess: (res: { hasConfirmedHistory?: boolean }) => {
      if (res?.hasConfirmedHistory) {
        Alert.alert('Notice', "Note: Paydays that have already been confirmed won't be changed. Only unperformed future occurrences have been updated.");
      }
      onSuccess?.();
      onClose();
    },
  });

  const createExpenseMut = trpc.createExpenseSource.useMutation({
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!name.trim() || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Validation Error', 'Please provide a valid name and positive amount.');
      return;
    }

    if (mode === 'EXPENSE' && !categoryId) {
      Alert.alert('Validation Error', 'Expense bill must be assigned to a category.');
      return;
    }

    if (mode === 'INCOME') {
      if (sourceToEdit) {
        updateIncomeMut.mutate({
          id: sourceToEdit.id,
          data: {
            name: name.trim(),
            amount: parseFloat(amount).toFixed(2),
            isRecurring,
            frequency: isRecurring ? frequency : undefined,
            startDate: startDate || undefined,
            endDate: isRecurring && endDate ? endDate : undefined,
          },
        });
      } else {
        createIncomeMut.mutate({
          name: name.trim(),
          amount: parseFloat(amount).toFixed(2),
          isRecurring,
          frequency: isRecurring ? frequency : undefined,
          startDate: startDate || undefined,
          endDate: isRecurring && endDate ? endDate : undefined,
        });
      }
    } else {
      createExpenseMut.mutate({
        name: name.trim(),
        amount: parseFloat(amount).toFixed(2),
        poolId: categoryId,
        isRecurring,
        startDate: startDate ? startDate : undefined,
        frequency: isRecurring ? frequency : undefined,
      });
    }
  };

  const isPending =
    createIncomeMut.isPending || updateIncomeMut.isPending || createExpenseMut.isPending;

  const D = DESIGN_TOKENS;

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={sourceToEdit ? `Edit ${mode === 'INCOME' ? 'Income' : 'Expense'}: ${sourceToEdit.name}` : (mode === 'INCOME' ? 'Setup Income' : 'Setup Expense or Bill')}
      subtitle={mode === 'INCOME' ? 'Setup any upcoming one-off or repeating income' : "Setup any upcoming expenses or bills you're expecting"}
    >
      <View style={styles.formGroup}>
        <Text style={styles.label}>{mode === 'INCOME' ? 'Income Name' : 'Bill Name'}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={mode === 'INCOME' ? 'e.g. Primary Salary, Freelance' : 'e.g. Electricity, Internet, Gym'}
          placeholderTextColor={D.colors.textMuted}
          style={styles.input}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Amount ($)</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="numeric"
          placeholderTextColor={D.colors.textMuted}
          style={styles.input}
        />
      </View>

      {mode === 'EXPENSE' && (
        <View style={styles.formGroup}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                style={[styles.chip, categoryId === c.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <RecurrenceBuilder builder={recurrenceBuilder} />

      <TouchableOpacity onPress={handleSubmit} disabled={isPending} style={styles.submitBtn} activeOpacity={0.8}>
        {isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>{sourceToEdit ? 'Update' : 'Create'}</Text>}
      </TouchableOpacity>
    </MobileModalDialog>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  formGroup: { gap: 6, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', color: D.colors.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: D.radius.md,
    padding: 12,
    fontSize: 14,
    color: D.colors.textPrimary,
  },
  row: { flexDirection: 'row', gap: 6 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#00B4A6' },
  typeBtnText: { fontSize: 11, fontWeight: '700', color: D.colors.textMuted },
  typeBtnTextActive: { color: '#FFF' },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6' },
  chipActive: { backgroundColor: D.colors.primary },
  chipText: { fontSize: 11, fontWeight: '700', color: D.colors.textMuted },
  chipTextActive: { color: '#FFF' },
  submitBtn: {
    backgroundColor: '#00B4A6',
    paddingVertical: 14,
    borderRadius: D.radius.md,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
