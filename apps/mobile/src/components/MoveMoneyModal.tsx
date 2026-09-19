import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { DESIGN_TOKENS, MobileModalDialog, MobileButton, AmountInput, useMobileToast } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../lib/trpc';
import { formatAUD } from '../lib/format';

interface MoveMoneyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function MoveMoneyModal({ visible, onClose, onSuccess }: MoveMoneyModalProps) {
  const toast = useMobileToast();
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
      toast.success(t('toasts.saved'));
      setFromCategoryId('');
      setToCategoryId('');
      setAmount('');
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || t('common.error'));
    },
  });

  const applyPreset = (fromId: string, toId: string, presetAmt: string) => {
    setFromCategoryId(fromId);
    setToCategoryId(toId);
    setAmount(presetAmt);
  };

  const handleSubmit = async () => {
    if (!fromCategoryId || !toCategoryId || !amount || parseFloat(amount) <= 0) {
      toast.error('Please select source and destination pools and enter a valid amount.');
      return;
    }

    if (fromCategoryId === toCategoryId) {
      toast.error('Source and destination pools must be different.');
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

  const isDirty = Boolean(fromCategoryId || toCategoryId || amount);

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      title={t('modals.moveMoney.title')}
      subtitle="Instantly transfer funds between category pools"
      footer={
        <MobileButton
          variant="primary"
          loading={moveMoneyMut.isPending}
          disabled={!fromCategoryId || !toCategoryId || !amount || parseFloat(amount) <= 0 || moveMoneyMut.isPending}
          onPress={handleSubmit}
        >
          {t('modals.moveMoney.submit')}
        </MobileButton>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        {/* 1-Tap Presets */}
        {everydayCat && maxSavingsCat && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Quick Presets</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
              <TouchableOpacity
                onPress={() => applyPreset(maxSavingsCat.id, everydayCat.id, '50')}
                style={styles.presetChip}
                activeOpacity={0.7}
              >
                <Text style={styles.presetText}>Top Up Everyday ($50)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => applyPreset(maxSavingsCat.id, everydayCat.id, '100')}
                style={styles.presetChip}
                activeOpacity={0.7}
              >
                <Text style={styles.presetText}>Top Up Everyday ($100)</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('modals.moveMoney.sourceCategory')}</Text>
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
          <Text style={styles.label}>{t('modals.moveMoney.destinationCategory')}</Text>
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

        <AmountInput
          label={t('modals.moveMoney.amount')}
          required
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
        />

        {/* Payday Safety Guard */}
        {everydayCat && fromCategoryId === everydayCat.id && parseFloat(amount || '0') > 0 && (
          <View style={styles.guardBanner}>
            <Text style={styles.guardBannerTitle}>Payday Safety Guard</Text>
            <Text style={styles.guardBannerText}>
              Moving {formatAUD(parseFloat(amount) || 0)} leaves {formatAUD(Math.max(0, (parseFloat(String(everydayCat.currentBalance || '0')) || 0) - (parseFloat(amount) || 0)))} in Everyday spending cash.
            </Text>
          </View>
        )}
      </ScrollView>
    </MobileModalDialog>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  scrollBody: { gap: 12, paddingBottom: 10 },
  formGroup: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', color: '#334155' },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  presetText: { fontSize: 11, fontWeight: '700', color: '#1E40AF' },
  guardBanner: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  guardBannerTitle: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  guardBannerText: { fontSize: 11, color: '#B45309', fontWeight: '600', lineHeight: 16 },
  pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pickerItem: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerItemActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pickerItemText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  pickerItemTextActive: { color: '#FFFFFF', fontWeight: '700' },
});

