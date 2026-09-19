import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, MobileDatePickerField, AmountInput } from '@money-matters/ui/mobile';
import { trpc } from '../lib/trpc';
import { formatIsoDate } from '../lib/format';

interface CreateIncomeEventModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateIncomeEventModal({ visible, onClose }: CreateIncomeEventModalProps) {
  const { data: incomeSources = [] } = trpc.listIncomeSources.useQuery();
  const createIncomeEvent = trpc.createIncomeEvent.useMutation();
  const utils = trpc.useUtils();

  const [sourceId, setSourceId] = useState('');
  const [amount, setAmount] = useState('');
  const [dateIso, setDateIso] = useState(() => formatIsoDate(new Date()));
  const [submitting, setSubmitting] = useState(false);

  // Initialize selected source details when sources load
  React.useEffect(() => {
    if (incomeSources.length > 0 && !sourceId) {
      const first = incomeSources[0];
      setSourceId(first.id);
      setAmount(parseFloat(first.amount).toFixed(0));
    }
  }, [incomeSources]);

  const handleSourceChange = (id: string) => {
    setSourceId(id);
    const matched = incomeSources.find(s => s.id === id);
    if (matched) {
      setAmount(parseFloat(matched.amount).toFixed(0));
    }
  };

  const handleSave = async () => {
    if (!sourceId || !amount) return;
    setSubmitting(true);
    try {
      await createIncomeEvent.mutateAsync({
        incomeSourceId: sourceId,
        expectedAmount: parseFloat(amount).toFixed(2),
        expectedDate: dateIso,
      });
      await utils.listIncomeEvents.invalidate();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('paychecks.createModal.title', { defaultValue: 'Add Income' })}</Text>

          <Text style={styles.label}>{t('paychecks.createModal.source', { defaultValue: 'Income Schedule' })}</Text>
          <View style={styles.pickerContainer}>
            {incomeSources.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.pickerItem, sourceId === s.id && styles.pickerItemActive]}
                onPress={() => handleSourceChange(s.id)}
              >
                <Text style={[styles.pickerItemText, sourceId === s.id && styles.pickerItemTextActive]}>{s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <AmountInput
            label={t('paychecks.createModal.amount', { defaultValue: 'Expected Amount' })}
            required
            value={amount}
            onChangeText={setAmount}
          />

          <MobileDatePickerField
            label={t('paychecks.createModal.date', { defaultValue: 'Expected Date' })}
            value={dateIso}
            onChange={setDateIso}
            required
          />

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSave} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{t('common.confirm')}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '700', color: D.colors.primary, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: D.colors.textMuted, marginBottom: 8, textTransform: 'uppercase' },
  pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pickerItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  pickerItemActive: { borderColor: D.colors.accent, backgroundColor: D.colors.accent + '10' },
  pickerItemText: { fontSize: 13, color: D.colors.textPrimary },
  pickerItemTextActive: { color: D.colors.accent, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: D.radius.md, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: '#F3F4F6' },
  cancelBtnText: { color: D.colors.textMuted, fontWeight: '600' },
  saveBtn: { backgroundColor: D.colors.accent },
  saveBtnText: { color: '#FFF', fontWeight: '600' },
});
