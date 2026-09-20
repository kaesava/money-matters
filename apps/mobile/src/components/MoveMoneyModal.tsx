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

  const [fromPoolId, setFromPoolId] = useState('');
  const [toPoolId, setToPoolId] = useState('');
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
      setFromPoolId('');
      setToPoolId('');
      setAmount('');
      onSuccess?.();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || t('common.error'));
    },
  });

  const applyPreset = (fromId: string, toId: string, presetAmt: string) => {
    setFromPoolId(fromId);
    setToPoolId(toId);
    setAmount(presetAmt);
  };

  const handleSubmit = async () => {
    if (!fromPoolId || !toPoolId || !amount || parseFloat(amount) <= 0) {
      toast.error(t('modals.moveMoney.poolsRequired'));
      return;
    }

    if (fromPoolId === toPoolId) {
      toast.error(t('modals.moveMoney.poolsDifferent'));
      return;
    }

    performTransfer();
  };

  const performTransfer = () => {
    moveMoneyMut.mutate({
      sourcePoolId: fromPoolId,
      destinationPoolId: toPoolId,
      amount: parseFloat(amount).toFixed(2),
    });
  };

  const isDirty = Boolean(fromPoolId || toPoolId || amount);

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      title={t('modals.moveMoney.title')}
      subtitle={t('modals.moveMoney.subtitle')}
      footer={
        <MobileButton
          variant="primary"
          loading={moveMoneyMut.isPending}
          disabled={!fromPoolId || !toPoolId || !amount || parseFloat(amount) <= 0 || moveMoneyMut.isPending}
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
            <Text style={styles.label}>{t('modals.moveMoney.quickPresets')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
              <TouchableOpacity
                onPress={() => applyPreset(maxSavingsCat.id, everydayCat.id, '50')}
                style={styles.presetChip}
                activeOpacity={0.7}
              >
                <Text style={styles.presetText}>{t('modals.moveMoney.presetTopUp50')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => applyPreset(maxSavingsCat.id, everydayCat.id, '100')}
                style={styles.presetChip}
                activeOpacity={0.7}
              >
                <Text style={styles.presetText}>{t('modals.moveMoney.presetTopUp100')}</Text>
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
                onPress={() => setFromPoolId(c.id)}
                style={[styles.pickerItem, fromPoolId === c.id && styles.pickerItemActive]}
              >
                <Text style={[styles.pickerItemText, fromPoolId === c.id && styles.pickerItemTextActive]}>
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
                onPress={() => setToPoolId(c.id)}
                style={[styles.pickerItem, toPoolId === c.id && styles.pickerItemActive]}
              >
                <Text style={[styles.pickerItemText, toPoolId === c.id && styles.pickerItemTextActive]}>
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
        {everydayCat && fromPoolId === everydayCat.id && parseFloat(amount || '0') > 0 && (
          <View style={styles.guardBanner}>
            <Text style={styles.guardBannerTitle}>{t('modals.moveMoney.safetyGuardTitle')}</Text>
            <Text style={styles.guardBannerText}>
              {t('modals.moveMoney.safetyGuardText')
                .replace('{moved}', formatAUD(parseFloat(amount) || 0))
                .replace('{remaining}', formatAUD(Math.max(0, (parseFloat(String(everydayCat.currentBalance || '0')) || 0) - (parseFloat(amount) || 0))))}
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

