import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { trpc } from '../lib/trpc';

interface ShortfallResolutionModalProps {
  visible: boolean;
  categoryId: string;
  onClose: () => void;
}

export default function ShortfallResolutionModal({
  visible,
  categoryId,
  onClose,
}: ShortfallResolutionModalProps) {
  const categoriesQuery = trpc.listCategories.useQuery();
  const resolveShortfall = trpc.resolveShortfall.useMutation();

  const categories = categoriesQuery.data ?? [];
  const targetCat = categories.find((c) => c.id === categoryId);
  const targetBalance = targetCat ? parseFloat(targetCat.currentBalance) : 0;
  const shortfallAmount = targetBalance < 0 ? Math.abs(targetBalance) : 0;

  const potentialDonors = categories.filter(
    (c) => c.id !== categoryId && parseFloat(c.currentBalance) > 0
  );

  const sortedDonors = [...potentialDonors].sort((a, b) => {
    const priorityA = a.type === 'EVERYDAY' ? 9999 : (a.priorityRank ?? 999);
    const priorityB = b.type === 'EVERYDAY' ? 9999 : (b.priorityRank ?? 999);

    if (priorityA !== priorityB) {
      return priorityB - priorityA;
    }
    return parseFloat(b.currentBalance) - parseFloat(a.currentBalance);
  });

  const recommendedDonor = sortedDonors[0];
  const [donorId, setDonorId] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (recommendedDonor) {
      setDonorId(recommendedDonor.id);
    }
    if (shortfallAmount > 0) {
      setAmount(shortfallAmount.toFixed(2));
    }
  }, [recommendedDonor, shortfallAmount]);

  const handleSubmit = async () => {
    if (!donorId || !amount) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid transfer amount.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resolveShortfall.mutateAsync({
        donorCategoryId: donorId,
        recipientCategoryId: categoryId,
        borrowedAmount: amountNum.toFixed(2),
      });
      categoriesQuery.refetch();
      onClose();
    } catch (err) {
      Alert.alert("Failed", "Failed to resolve shortfall.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!targetCat) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBg}>
        <View style={styles.modalPanel}>
          <View style={styles.header}>
            <Text style={styles.title}>Shortfall Resolution</Text>
            <Text style={styles.subtitle}>Borrow money to fund {targetCat.name}</Text>
          </View>

          <View style={styles.deficitCard}>
            <Text style={styles.cardLabel}>Shortfall Deficit</Text>
            <Text style={styles.cardVal}>${shortfallAmount.toFixed(2)}</Text>
          </View>

          {potentialDonors.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No categories have a positive balance to borrow from.
              </Text>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Borrow From Category</Text>
              <View style={styles.pickerContainer}>
                {/* Visual Donor list to select */}
                {sortedDonors.map((donor) => (
                  <TouchableOpacity
                    key={donor.id}
                    style={[styles.donorRow, donorId === donor.id && styles.donorRowActive]}
                    onPress={() => setDonorId(donor.id)}
                  >
                    <Text style={styles.donorEmoji}>{donor.icon || "📂"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.donorName, donorId === donor.id && styles.donorNameActive]}>
                        {donor.name} {donor.id === recommendedDonor?.id ? " (Recommended)" : ""}
                      </Text>
                      <Text style={styles.donorBalance}>Balance: ${parseFloat(donor.currentBalance).toFixed(2)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Amount to Transfer</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, isSubmitting && styles.confirmBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.confirmText}>Confirm</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalPanel: { backgroundColor: D.colors.surface, borderTopLeftRadius: D.radius.lg, borderTopRightRadius: D.radius.lg, padding: 20, maxHeight: '90%' },
  header: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: D.colors.primary },
  subtitle: { fontSize: 12, color: D.colors.textMuted, marginTop: 2 },
  deficitCard: { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2', borderWidth: 1, borderRadius: D.radius.md, padding: 14, alignItems: 'center', marginBottom: 16 },
  cardLabel: { fontSize: 10, fontWeight: '700', color: '#EF4444', textTransform: 'uppercase' },
  cardVal: { fontSize: 24, fontWeight: '900', color: '#B91C1C', marginTop: 4 },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: D.colors.textMuted, textAlign: 'center', marginBottom: 20 },
  closeBtn: { backgroundColor: D.colors.accent, paddingVertical: 12, paddingHorizontal: 32, borderRadius: D.radius.md },
  closeBtnText: { color: D.colors.onAccent, fontWeight: '700' },
  form: { gap: 12 },
  label: { fontSize: 11, fontWeight: '700', color: D.colors.textMuted, textTransform: 'uppercase' },
  pickerContainer: { maxHeight: 180, overflow: 'scroll', gap: 6, marginBottom: 8 },
  donorRow: { flexDirection: 'row', gap: 10, padding: 10, borderRadius: D.radius.md, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  donorRowActive: { borderColor: D.colors.accent, backgroundColor: 'rgba(0, 180, 166, 0.05)' },
  donorEmoji: { fontSize: 18 },
  donorName: { fontSize: 12, fontWeight: '600', color: D.colors.textPrimary },
  donorNameActive: { color: D.colors.accent, fontWeight: '700' },
  donorBalance: { fontSize: 10, color: D.colors.textMuted, marginTop: 2 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: D.radius.md, padding: 10, fontSize: 13, backgroundColor: '#FAFAFA' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: D.radius.md, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: D.colors.textPrimary },
  confirmBtn: { flex: 2, backgroundColor: D.colors.accent, paddingVertical: 14, borderRadius: D.radius.md, alignItems: 'center', justifyContent: 'center' },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmText: { fontSize: 14, fontWeight: '700', color: D.colors.onAccent },
});
