import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { DESIGN_TOKENS, MobileModalDialog } from '@money-matters/ui';
import { trpc } from '../lib/trpc';

interface CategoryItem {
  id: string;
  name: string;
  type: 'GOAL' | 'REGULAR' | 'EVERYDAY';
  targetAmount?: string | null;
  targetDate?: string | null;
  monthlyAmount?: string | null;
  everydayTargetKeepAmount?: string | null;
  bankAccountId?: string | null;
}

interface CategoryFormModalProps {
  visible: boolean;
  categoryToEdit?: CategoryItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CategoryFormModal({ visible, categoryToEdit, onClose, onSuccess }: CategoryFormModalProps) {
  const bankAccountsQuery = trpc.listBankAccountsWithExpected.useQuery(undefined, { enabled: visible });
  const bankAccounts = bankAccountsQuery.data ?? [];

  const [name, setName] = useState('');
  const [type, setType] = useState<'GOAL' | 'REGULAR' | 'EVERYDAY'>('GOAL');
  const [targetAmount, setTargetAmount] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [keepAmount, setKeepAmount] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setType(categoryToEdit.type);
      setTargetAmount(categoryToEdit.targetAmount ?? '');
      setMonthlyAmount(categoryToEdit.monthlyAmount ?? '');
      setTargetDate(categoryToEdit.targetDate ? categoryToEdit.targetDate.split('T')[0] : '');
      setKeepAmount(categoryToEdit.everydayTargetKeepAmount ?? '');
      setBankAccountId(categoryToEdit.bankAccountId ?? '');
    } else {
      setName('');
      setType('GOAL');
      setTargetAmount('');
      setMonthlyAmount('');
      setTargetDate('');
      setKeepAmount('');
      setBankAccountId('');
    }
  }, [categoryToEdit, visible]);

  const createMut = trpc.createCategory.useMutation({
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  const updateMut = trpc.updateCategory.useMutation({
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Category name is required.');
      return;
    }

    if (categoryToEdit) {
      updateMut.mutate({
        categoryId: categoryToEdit.id,
        data: {
          name: name.trim(),
          type,
          targetAmount: type === 'GOAL' && targetAmount ? parseFloat(targetAmount).toFixed(2) : undefined,
          monthlyAmount: type === 'REGULAR' && monthlyAmount ? parseFloat(monthlyAmount).toFixed(2) : undefined,
          targetDate: type === 'GOAL' && targetDate ? targetDate : undefined,
          everydayAllowanceAmount: type === 'EVERYDAY' && keepAmount ? parseFloat(keepAmount).toFixed(2) : undefined,
          bankAccountId: bankAccountId || undefined,
        },
      });
    } else {
      createMut.mutate({
        name: name.trim(),
        type,
        targetAmount: type === 'GOAL' && targetAmount ? parseFloat(targetAmount).toFixed(2) : undefined,
        monthlyAmount: type === 'REGULAR' && monthlyAmount ? parseFloat(monthlyAmount).toFixed(2) : undefined,
        targetDate: type === 'GOAL' && targetDate ? targetDate : undefined,
        everydayAllowanceAmount: type === 'EVERYDAY' && keepAmount ? parseFloat(keepAmount).toFixed(2) : undefined,
        bankAccountId: bankAccountId || undefined,
      });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const D = DESIGN_TOKENS;

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={categoryToEdit ? 'Edit Category' : 'New Category'}
      subtitle={categoryToEdit ? 'Update category properties' : 'Add a new savings goal or bill pool'}
    >
      <View style={styles.formGroup}>
        <Text style={styles.label}>Category Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Groceries, Netflix, Emergency Fund"
          placeholderTextColor={D.colors.textMuted}
          style={styles.input}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Category Type</Text>
        <View style={styles.typeRow}>
          {(['GOAL', 'REGULAR', 'EVERYDAY'] as const).map((tVal) => (
            <TouchableOpacity
              key={tVal}
              onPress={() => setType(tVal)}
              style={[styles.typeBtn, type === tVal && styles.typeBtnActive]}
            >
              <Text style={[styles.typeBtnText, type === tVal && styles.typeBtnTextActive]}>
                {tVal === 'GOAL' ? 'Save Toward' : tVal === 'REGULAR' ? 'Regular Bill' : 'Everyday'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {type === 'GOAL' && (
        <>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Target Amount ($)</Text>
            <TextInput
              value={targetAmount}
              onChangeText={setTargetAmount}
              placeholder="0.00"
              keyboardType="numeric"
              placeholderTextColor={D.colors.textMuted}
              style={styles.input}
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Target Date (YYYY-MM-DD)</Text>
            <TextInput
              value={targetDate}
              onChangeText={setTargetDate}
              placeholder="2026-12-31"
              placeholderTextColor={D.colors.textMuted}
              style={styles.input}
            />
          </View>
        </>
      )}

      {type === 'REGULAR' && (
        <View style={styles.formGroup}>
          <Text style={styles.label}>Monthly Bill Amount ($)</Text>
          <TextInput
            value={monthlyAmount}
            onChangeText={setMonthlyAmount}
            placeholder="0.00"
            keyboardType="numeric"
            placeholderTextColor={D.colors.textMuted}
            style={styles.input}
          />
        </View>
      )}

      {type === 'EVERYDAY' && (
        <View style={styles.formGroup}>
          <Text style={styles.label}>Paycheck Allowance Target ($)</Text>
          <TextInput
            value={keepAmount}
            onChangeText={setKeepAmount}
            placeholder="e.g. 500.00"
            keyboardType="numeric"
            placeholderTextColor={D.colors.textMuted}
            style={styles.input}
          />
        </View>
      )}

      <View style={styles.formGroup}>
        <Text style={styles.label}>Linked Bank Account</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bankRow}>
          <TouchableOpacity
            onPress={() => setBankAccountId('')}
            style={[styles.bankChip, !bankAccountId && styles.bankChipActive]}
          >
            <Text style={[styles.bankChipText, !bankAccountId && styles.bankChipTextActive]}>-- None --</Text>
          </TouchableOpacity>
          {bankAccounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              onPress={() => setBankAccountId(acc.id)}
              style={[styles.bankChip, bankAccountId === acc.id && styles.bankChipActive]}
            >
              <Text style={[styles.bankChipText, bankAccountId === acc.id && styles.bankChipTextActive]}>
                {acc.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity onPress={handleSubmit} disabled={isPending} style={styles.submitBtn} activeOpacity={0.8}>
        {isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>{categoryToEdit ? 'Save Changes' : 'Create Category'}</Text>}
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
  typeRow: { flexDirection: 'row', gap: 6 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#00B4A6' },
  typeBtnText: { fontSize: 11, fontWeight: '700', color: D.colors.textMuted },
  typeBtnTextActive: { color: '#FFF' },
  bankRow: { flexDirection: 'row', gap: 6 },
  bankChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6' },
  bankChipActive: { backgroundColor: D.colors.primary },
  bankChipText: { fontSize: 11, fontWeight: '700', color: D.colors.textMuted },
  bankChipTextActive: { color: '#FFF' },
  submitBtn: {
    backgroundColor: '#00B4A6',
    paddingVertical: 14,
    borderRadius: D.radius.md,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
