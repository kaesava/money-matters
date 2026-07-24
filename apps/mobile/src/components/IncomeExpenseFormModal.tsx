import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { DESIGN_TOKENS, MobileModalDialog } from '@money-matters/ui';
import { trpc } from '../lib/trpc';

interface SourceToEdit {
  id: string;
  name: string;
  amount: string;
  type?: string;
  rrule?: string | null;
  startDate?: string | Date;
  categoryId?: string | null;
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
  const [isRecurring, setIsRecurring] = useState(true);
  const [frequency, setFrequency] = useState<'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY'>('MONTHLY');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0] ?? '');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    if (sourceToEdit) {
      setName(sourceToEdit.name);
      setAmount(sourceToEdit.amount);
      setIsRecurring(Boolean(sourceToEdit.rrule));
      if (sourceToEdit.rrule?.includes('WEEKLY')) setFrequency('WEEKLY');
      else if (sourceToEdit.rrule?.includes('FORTNIGHTLY')) setFrequency('FORTNIGHTLY');
      else if (sourceToEdit.rrule?.includes('YEARLY')) setFrequency('ANNUALLY');
      else setFrequency('MONTHLY');

      if (sourceToEdit.startDate) {
        const dStr = typeof sourceToEdit.startDate === 'string' ? sourceToEdit.startDate : sourceToEdit.startDate.toISOString();
        setStartDate(dStr.split('T')[0] ?? '');
      }
      if (sourceToEdit.categoryId) setCategoryId(sourceToEdit.categoryId);
    } else {
      setName('');
      setAmount('');
      setIsRecurring(true);
      setFrequency('MONTHLY');
      setStartDate(new Date().toISOString().split('T')[0] ?? '');
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
    onSuccess: () => {
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

  const updateExpenseMut = trpc.updateExpenseSource.useMutation({
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
          },
        });
      } else {
        createIncomeMut.mutate({
          name: name.trim(),
          amount: parseFloat(amount).toFixed(2),
          isRecurring,
          startDate: isRecurring ? startDate : undefined,
          frequency: isRecurring ? frequency : undefined,
        });
      }
    } else {
      if (sourceToEdit) {
        updateExpenseMut.mutate({
          id: sourceToEdit.id,
          data: {
            name: name.trim(),
            amount: parseFloat(amount).toFixed(2),
            categoryId,
          },
        });
      } else {
        createExpenseMut.mutate({
          name: name.trim(),
          amount: parseFloat(amount).toFixed(2),
          categoryId,
          isRecurring,
          startDate: isRecurring ? startDate : undefined,
          frequency: isRecurring ? frequency : undefined,
        });
      }
    }
  };

  const isPending =
    createIncomeMut.isPending || updateIncomeMut.isPending || createExpenseMut.isPending || updateExpenseMut.isPending;

  const D = DESIGN_TOKENS;

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={sourceToEdit ? `Edit ${mode === 'INCOME' ? 'Income' : 'Expense'}` : `Add ${mode === 'INCOME' ? 'Income Deposit' : 'Expense Bill'}`}
      subtitle={mode === 'INCOME' ? 'Configure salary or deposit source' : 'Configure utility or fixed bill outflow'}
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

      {!sourceToEdit && (
        <>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Schedule Type</Text>
            <View style={styles.row}>
              <TouchableOpacity
                onPress={() => setIsRecurring(true)}
                style={[styles.typeBtn, isRecurring && styles.typeBtnActive]}
              >
                <Text style={[styles.typeBtnText, isRecurring && styles.typeBtnTextActive]}>Recurring</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsRecurring(false)}
                style={[styles.typeBtn, !isRecurring && styles.typeBtnActive]}
              >
                <Text style={[styles.typeBtnText, !isRecurring && styles.typeBtnTextActive]}>One-off</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isRecurring && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.row}>
                {(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'ANNUALLY'] as const).map((freq) => (
                  <TouchableOpacity
                    key={freq}
                    onPress={() => setFrequency(freq)}
                    style={[styles.typeBtn, frequency === freq && styles.typeBtnActive]}
                  >
                    <Text style={[styles.typeBtnText, frequency === freq && styles.typeBtnTextActive]}>{freq}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>First Payment / Due Date (YYYY-MM-DD)</Text>
            <TextInput
              value={startDate}
              onChangeText={setStartDate}
              placeholder="2026-08-01"
              placeholderTextColor={D.colors.textMuted}
              style={styles.input}
            />
          </View>
        </>
      )}

      <TouchableOpacity onPress={handleSubmit} disabled={isPending} style={styles.submitBtn} activeOpacity={0.8}>
        {isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Save</Text>}
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
