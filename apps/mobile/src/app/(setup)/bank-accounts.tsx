import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { trpc } from '../../lib/trpc';
import { getMockSession } from '../../lib/mock-session';

const PURPOSES = ['INCOME_LANDING', 'SAVINGS', 'EVERYDAY'] as const;
type Purpose = (typeof PURPOSES)[number];

const PURPOSE_LABELS: Record<Purpose, string> = {
  INCOME_LANDING: 'setup.bankAccounts.purposeIncomeLanding',
  SAVINGS: 'setup.bankAccounts.purposeSavings',
  EVERYDAY: 'setup.bankAccounts.purposeEveryday',
};

export default function SetupBankAccountsScreen() {
  const router = useRouter();
  const session = getMockSession();
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState<Purpose>('INCOME_LANDING');
  const [isOffset, setIsOffset] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  const createAccount = trpc.createBankAccount.useMutation();

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    try {
      await createAccount.mutateAsync({
        name: name.trim(),
        purpose: [purpose],
        isOffset,
      });
      setAdded((p) => [...p, name.trim()]);
      setName('');
    } catch {
      // Phase 4: API may not be running
    } finally {
      setAdding(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.progressRow}>
        {[1, 2, 3, 4].map((s) => (
          <View key={s} style={[styles.dot, s === 4 && styles.dotActive]} />
        ))}
      </View>
      <Text style={styles.stepLabel}>{t('setup.stepOf', { step: 4, total: 4 })}</Text>
      <Text style={styles.title}>{t('setup.bankAccounts.title')}</Text>
      <Text style={styles.subtitle}>{t('setup.bankAccounts.subtitle')}</Text>

      {added.length > 0 && (
        <View style={styles.addedList}>
          {added.map((n) => (
            <View key={n} style={styles.chip}>
              <Text style={styles.chipText}>✓ {n}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.label}>{t('setup.bankAccounts.nameLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('setup.bankAccounts.namePlaceholder')}
          placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.label, styles.gap]}>{t('setup.bankAccounts.purposeLabel')}</Text>
        <View style={styles.chipRow}>
          {PURPOSES.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.selChip, purpose === p && styles.selChipActive]}
              onPress={() => setPurpose(p)}
            >
              <Text style={[styles.selChipText, purpose === p && styles.selChipTextActive]}>
                {t(PURPOSE_LABELS[p])}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.offsetRow} onPress={() => setIsOffset((v) => !v)} activeOpacity={0.7}>
          <View style={[styles.offsetCheck, isOffset && styles.offsetCheckActive]}>
            {isOffset && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.offsetLabel}>{t('setup.bankAccounts.isOffsetLabel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addBtn, !name.trim() && styles.addBtnOff]}
          onPress={handleAdd}
          disabled={adding || !name.trim()}
          activeOpacity={0.85}
        >
          {adding ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.addBtnText}>{t('setup.bankAccounts.addCta')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.nextBtn}
        onPress={() => router.replace('/(setup)/complete')}
        activeOpacity={0.85}
      >
        <Text style={styles.nextText}>{t('common.done')} ✓</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: D.spacing.containerMargin, paddingTop: 56, paddingBottom: 40, backgroundColor: D.colors.background },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  dot: { width: 32, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  dotActive: { backgroundColor: D.colors.accent },
  stepLabel: { fontSize: 12, color: D.colors.textMuted, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: D.colors.primary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: D.colors.textMuted, lineHeight: 18, marginBottom: 20 },
  addedList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { backgroundColor: `${D.colors.accent}22`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: D.radius.full },
  chipText: { fontSize: 12, color: D.colors.accent, fontWeight: '600' },
  card: { backgroundColor: D.colors.surface, borderRadius: D.radius.lg, padding: D.spacing.cardPadding, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8 },
  label: { fontSize: 13, fontWeight: '600', color: D.colors.textPrimary, marginBottom: 6 },
  gap: { marginTop: 14 },
  input: { backgroundColor: D.colors.surfaceVariant, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: D.radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: D.colors.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: D.radius.full, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: D.colors.surfaceVariant },
  selChipActive: { backgroundColor: D.colors.accent, borderColor: D.colors.accent },
  selChipText: { fontSize: 12, color: D.colors.textMuted },
  selChipTextActive: { color: D.colors.onAccent, fontWeight: '600' },
  offsetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  offsetCheck: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  offsetCheckActive: { borderColor: D.colors.accent, backgroundColor: D.colors.accent },
  checkMark: { fontSize: 11, color: '#FFF', fontWeight: '700' },
  offsetLabel: { fontSize: 13, color: D.colors.textPrimary },
  addBtn: { backgroundColor: D.colors.primary, paddingVertical: 13, borderRadius: D.radius.md, alignItems: 'center', marginTop: 20 },
  addBtnOff: { opacity: 0.4 },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  nextBtn: { backgroundColor: D.colors.accent, paddingVertical: 15, borderRadius: D.radius.md, alignItems: 'center' },
  nextText: { color: D.colors.onAccent, fontWeight: '700', fontSize: 16 },
});
