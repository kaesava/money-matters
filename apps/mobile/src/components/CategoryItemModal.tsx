import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, MobileModalDialog } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../lib/trpc';

export interface CategoryItemToEdit {
  id?: string;
  name?: string;
  poolId?: string;
  monthlyAmount?: string | null;
  enteredAmount?: string | null;
  budgetFrequency?: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY' | null;
  isEssential?: boolean;
}

export interface CategoryItemModalProps {
  visible: boolean;
  poolId: string;
  categoryToEdit?: CategoryItemToEdit | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CategoryItemModal({
  visible,
  poolId,
  categoryToEdit,
  onClose,
  onSuccess,
}: CategoryItemModalProps) {
  const isEdit = Boolean(categoryToEdit?.id);
  const D = DESIGN_TOKENS;
  const utils = trpc.useUtils();

  const [name, setName] = useState('');
  const [enteredAmount, setEnteredAmount] = useState('');
  const [frequency, setFrequency] = useState<
    'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY'
  >('MONTHLY');
  const [isEssential, setIsEssential] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || '');
      setEnteredAmount(
        categoryToEdit.enteredAmount || categoryToEdit.monthlyAmount || ''
      );
      setFrequency(categoryToEdit.budgetFrequency || 'MONTHLY');
      setIsEssential(Boolean(categoryToEdit.isEssential));
    } else {
      setName('');
      setEnteredAmount('');
      setFrequency('MONTHLY');
      setIsEssential(false);
    }
  }, [categoryToEdit, visible]);

  const createMut = trpc.createCategory.useMutation();
  const updateMut = trpc.updateCategory.useMutation();

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), 'Please enter a category name.');
      return;
    }

    const numAmt = parseFloat(enteredAmount);
    let monthlyAmt = numAmt;
    if (!isNaN(numAmt) && numAmt > 0) {
      if (frequency === 'WEEKLY') monthlyAmt = (numAmt * 52) / 12;
      else if (frequency === 'FORTNIGHTLY') monthlyAmt = (numAmt * 26) / 12;
      else if (frequency === 'ANNUALLY') monthlyAmt = numAmt / 12;
    }

    setSubmitting(true);
    try {
      if (isEdit && categoryToEdit?.id) {
        await updateMut.mutateAsync({
          categoryId: categoryToEdit.id,
          data: {
            name: name.trim(),
            enteredAmount: !isNaN(numAmt) && numAmt > 0 ? numAmt.toFixed(2) : undefined,
            monthlyAmount: !isNaN(monthlyAmt) && monthlyAmt > 0 ? monthlyAmt.toFixed(2) : undefined,
            budgetFrequency: frequency,
            isEssential,
          },
        });
      } else {
        await createMut.mutateAsync({
          poolId,
          name: name.trim(),
          enteredAmount: !isNaN(numAmt) && numAmt > 0 ? numAmt.toFixed(2) : undefined,
          monthlyAmount: !isNaN(monthlyAmt) && monthlyAmt > 0 ? monthlyAmt.toFixed(2) : undefined,
          budgetFrequency: frequency,
          isEssential,
        });
      }

      utils.listCategories.invalidate();
      utils.listPools.invalidate();
      onSuccess?.();
      onClose();
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : 'Failed to save category'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={isEdit ? 'Edit Category' : 'Add Category'}
      subtitle={
        isEdit
          ? 'Update budget category details'
          : 'Create a new category in this pool'
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category Name *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Groceries, Electricity, Fuel"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#94A3B8"
            autoFocus={!isEdit}
          />
        </View>

        {/* Amount & Frequency */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Budget Target Amount ($)</Text>
          <View style={styles.amountInputWrap}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={enteredAmount}
              onChangeText={setEnteredAmount}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Frequency Chips */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Frequency</Text>
          <View style={styles.freqRow}>
            {(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'ANNUALLY'] as const).map(
              (f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFrequency(f)}
                  style={[
                    styles.freqChip,
                    frequency === f && styles.freqChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.freqText,
                      frequency === f && styles.freqTextActive,
                    ]}
                  >
                    {f === 'WEEKLY'
                      ? 'Wk'
                      : f === 'FORTNIGHTLY'
                      ? 'Fortnight'
                      : f === 'MONTHLY'
                      ? 'Month'
                      : 'Year'}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        {/* Essential Bill Toggle */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Essential Priority Bill</Text>
            <Text style={styles.switchSubtext}>
              Funded with top priority in paycheck waterfall allocations.
            </Text>
          </View>
          <Switch
            value={isEssential}
            onValueChange={setIsEssential}
            trackColor={{ false: '#E2E8F0', true: '#2563eb' }}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting}
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitBtnText}>
              {isEdit ? 'Save Changes' : 'Create Category'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 14,
    paddingBottom: 10,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
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
  amountInputWrap: {
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
    marginRight: 12,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#1B2B4B',
    paddingVertical: 8,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
  },
  freqChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  freqChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563eb',
  },
  freqText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  freqTextActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  switchSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  submitBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default CategoryItemModal;
