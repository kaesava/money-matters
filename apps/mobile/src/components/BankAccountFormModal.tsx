import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { DESIGN_TOKENS, MobileModalDialog } from '@money-matters/ui/mobile';
import { trpc } from '../lib/trpc';

interface BankAccountItem {
  id: string;
  name: string;
  lastKnownBalance?: string | null;
  purpose?: string | null;
  isOffset?: boolean | null;
}

interface BankAccountFormModalProps {
  visible: boolean;
  accountToEdit?: BankAccountItem | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BankAccountFormModal({ visible, accountToEdit, onClose, onSuccess }: BankAccountFormModalProps) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['EVERYDAY']);

  useEffect(() => {
    if (accountToEdit) {
      setName(accountToEdit.name);
      setBalance(accountToEdit.lastKnownBalance ?? '0.00');
      const p = accountToEdit.purpose ?? 'EVERYDAY';
      setSelectedTypes(p.split(',').map((s) => s.trim()));
    } else {
      setName('');
      setBalance('0.00');
      setSelectedTypes(['EVERYDAY']);
    }
  }, [accountToEdit, visible]);

  const createMut = trpc.createBankAccount.useMutation({
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  const updateMut = trpc.updateBankAccount.useMutation({
    onSuccess: () => {
      onSuccess?.();
      onClose();
    },
  });

  const toggleType = (tVal: string) => {
    if (selectedTypes.includes(tVal)) {
      if (selectedTypes.length === 1) {
        Alert.alert('Validation Error', 'At least one Category Type must be selected for the account.');
        return;
      }
      setSelectedTypes(selectedTypes.filter((t) => t !== tVal));
    } else {
      setSelectedTypes([...selectedTypes, tVal]);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Account name is required.');
      return;
    }

    if (accountToEdit) {
      updateMut.mutate({
        accountId: accountToEdit.id,
        data: {
          name: name.trim(),
          lastKnownBalance: parseFloat(balance || '0').toFixed(2),
        },
      });
    } else {
      createMut.mutate({
        name: name.trim(),
        lastKnownBalance: parseFloat(balance || '0').toFixed(2),
      });
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;
  const D = DESIGN_TOKENS;

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={accountToEdit ? 'Edit Bank Account' : 'Add Bank Account'}
      subtitle={accountToEdit ? 'Update statement balance & purpose' : 'Link a new checking or offset bank account'}
    >
      <View style={styles.formGroup}>
        <Text style={styles.label}>Account Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. ANZ Everyday Checking, CBA Offset Savings"
          placeholderTextColor={D.colors.textMuted}
          style={styles.input}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Statement Balance ($)</Text>
        <TextInput
          value={balance}
          onChangeText={setBalance}
          placeholder="0.00"
          keyboardType="numeric"
          placeholderTextColor={D.colors.textMuted}
          style={styles.input}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Category Types (Account Purpose)</Text>
        <View style={styles.chipRow}>
          {[
            { id: 'EVERYDAY', label: 'Everyday' },
            { id: 'REGULAR', label: 'Bills' },
            { id: 'GOAL', label: 'Goals' },
          ].map((tOpt) => {
            const isSelected = selectedTypes.includes(tOpt.id);
            return (
              <TouchableOpacity
                key={tOpt.id}
                onPress={() => toggleType(tOpt.id)}
                style={[styles.chip, isSelected && styles.chipActive]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {isSelected ? '✓ ' : ''}{tOpt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity onPress={handleSubmit} disabled={isPending} style={styles.submitBtn} activeOpacity={0.8}>
        {isPending ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>{accountToEdit ? 'Save Changes' : 'Create Bank Account'}</Text>}
      </TouchableOpacity>
    </MobileModalDialog>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  formGroup: { gap: 6, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: D.colors.textPrimary },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: D.radius.md,
    padding: 12,
    fontSize: 14,
    color: D.colors.textPrimary,
  },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#F3F4F6' },
  chipActive: { backgroundColor: '#00B4A6' },
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
