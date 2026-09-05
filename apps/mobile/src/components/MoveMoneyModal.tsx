import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { DESIGN_TOKENS, MobileModalDialog } from '@money-matters/ui/mobile';
import { trpc } from '../lib/trpc';
import { formatAUD } from '../lib/format';

interface MoveMoneyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MoveMoneyModal({ visible, onClose, onSuccess }: MoveMoneyModalProps) {
  const categoriesQuery = trpc.listPools.useQuery(undefined, { enabled: visible });
  const categories = categoriesQuery.data ?? [];

  const [fromCategoryId, setFromCategoryId] = useState('');
  const [toCategoryId, setToCategoryId] = useState('');
  const [amount, setAmount] = useState('');

  const getBalance = (c: { currentBalance?: string | number }) =>
    typeof c.currentBalance === 'number' ? c.currentBalance : parseFloat(c.currentBalance || '0');

  const everydayCat = categories.find((c) => c.poolType === 'EVERYDAY');
  const maxSavingsCat = [...categories]
    .filter((c) => c.poolType !== 'EVERYDAY' && getBalance(c) > 0)
    .sort((a, b) => getBalance(b) - getBalance(a))[0];

  const moveMoneyMut = trpc.moveMoney.useMutation({
    onSuccess: () => {
      setFromCategoryId('');
      setToCategoryId('');
      setAmount('');
      onSuccess?.();
      onClose();
    },
  });

  const applyPreset = (fromId: string, toId: string, presetAmt: string) => {
    setFromCategoryId(fromId);
    setToCategoryId(toId);
    setAmount(presetAmt);
  };

  const handleSubmit = async () => {
    if (!fromCategoryId || !toCategoryId || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Validation Error', 'Please select source/destination categories and a valid amount.');
      return;
    }

    if (fromCategoryId === toCategoryId) {
      Alert.alert('Validation Error', 'Source and destination categories must be different.');
      return;
    }

    performTransfer();
  };

  const performTransfer = () => {
    moveMoneyMut.mutate({
      sourcePoolId: fromCategoryId,
      destinationPoolId: toCategoryId,
      amount: parseFloat(amount).toFixed(2),
    });
  };

  const D = DESIGN_TOKENS;

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title="Move Money"
      subtitle="Instantly transfer funds between category pools"
    >
      {/* 1-Tap Presets */}
      {everydayCat && maxSavingsCat && (
        <View style={styles.formGroup}>
          <Text style={styles.label}>1-Tap Quick Presets</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
            <TouchableOpacity
              onPress={() => applyPreset(maxSavingsCat.id, everydayCat.id, '50')}
              style={styles.presetChip}
            >
              <Text style={styles.presetText}>⚡ Top Up Everyday ($50)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => applyPreset(maxSavingsCat.id, everydayCat.id, '100')}
              style={styles.presetChip}
            >
              <Text style={styles.presetText}>⚡ Top Up Everyday ($100)</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <View style={styles.formGroup}>
        <Text style={styles.label}>From Category (Debited)</Text>
        <View style={styles.pickerContainer}>
          {categories.map((c) => (
            <TouchableOpacity
              key={`from-${c.id}`}
              onPress={() => setFromCategoryId(c.id)}
              style={[styles.pickerItem, fromCategoryId === c.id && styles.pickerItemActive]}
            >
              <Text style={[styles.pickerItemText, fromCategoryId === c.id && styles.pickerItemTextActive]}>
                {c.name} ({formatAUD(c.currentBalance)})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>To Category (Credited)</Text>
        <View style={styles.pickerContainer}>
          {categories.map((c) => (
            <TouchableOpacity
              key={`to-${c.id}`}
              onPress={() => setToCategoryId(c.id)}
              style={[styles.pickerItem, toCategoryId === c.id && styles.pickerItemActive]}
            >
              <Text style={[styles.pickerItemText, toCategoryId === c.id && styles.pickerItemTextActive]}>
                {c.name} ({formatAUD(c.currentBalance)})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Transfer Amount ($)</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="numeric"
          placeholderTextColor={D.colors.textMuted}
          style={styles.input}
        />
      </View>

      {/* Payday Safety Guard */}
      {everydayCat && fromCategoryId === everydayCat.id && parseFloat(amount || '0') > 0 && (
        <View style={styles.guardBanner}>
          <Text style={styles.guardBannerTitle}>🛡️ Payday Safety Guard</Text>
          <Text style={styles.guardBannerText}>
            Moving {formatAUD(parseFloat(amount) || 0)} leaves {formatAUD(Math.max(0, (parseFloat(String(everydayCat.currentBalance || '0')) || 0) - (parseFloat(amount) || 0)))} in Everyday spending cash.
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={moveMoneyMut.isPending}
        style={styles.submitBtn}
        activeOpacity={0.8}
      >
        {moveMoneyMut.isPending ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.submitBtnText}>Transfer Funds</Text>
        )}
      </TouchableOpacity>
    </MobileModalDialog>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  formGroup: { gap: 6, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '700', color: D.colors.textPrimary },
  presetRow: { flexDirection: 'row', gap: 6 },
  presetChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#E0F2FE', borderWidth: 1, borderColor: '#BAE6FD' },
  presetText: { fontSize: 11, fontWeight: '700', color: '#0369A1' },
  guardBanner: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 4, gap: 2 },
  guardBannerTitle: { fontSize: 11, fontWeight: '800', color: '#92400E' },
  guardBannerText: { fontSize: 11, color: '#B45309', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: D.radius.md,
    padding: 12,
    fontSize: 15,
    color: D.colors.textPrimary,
  },
  pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pickerItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerItemActive: {
    backgroundColor: '#00B4A6',
    borderColor: '#00B4A6',
  },
  pickerItemText: { fontSize: 11, fontWeight: '600', color: D.colors.textMuted },
  pickerItemTextActive: { color: '#FFF' },
  submitBtn: {
    backgroundColor: '#00B4A6',
    paddingVertical: 14,
    borderRadius: D.radius.md,
    alignItems: 'center',
    marginTop: 12,
  },
  submitBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
