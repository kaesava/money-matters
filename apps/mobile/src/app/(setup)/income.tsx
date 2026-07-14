import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { trpc } from '../../lib/trpc';

const INCOME_TYPES = ['SALARY', 'FREELANCE', 'OTHER'] as const;
const FREQUENCIES = ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY'] as const;

type IncomeType = (typeof INCOME_TYPES)[number];
type Frequency = (typeof FREQUENCIES)[number];

const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  SALARY: 'setup.income.typeSalary',
  FREELANCE: 'setup.income.typeFreelance',
  OTHER: 'setup.income.typeOther',
};

const FREQ_LABELS: Record<Frequency, string> = {
  WEEKLY: 'setup.income.scheduleWeekly',
  FORTNIGHTLY: 'setup.income.scheduleFortnightly',
  MONTHLY: 'setup.income.scheduleMonthly',
};

export default function SetupIncomeScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [type, setType] = useState<IncomeType>('SALARY');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('FORTNIGHTLY');
  const [added, setAdded] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  const createSource = trpc.createIncomeSource.useMutation();
  const createSchedule = trpc.createIncomeSourceSchedule.useMutation();
  const createHousehold = trpc.createHousehold.useMutation();

  const handleAdd = async () => {
    if (!name.trim() || !amount.trim()) return;
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) return;
    setAdding(true);
    try {
      // Phase 4: fire real API calls so data exists in DB for later screens
      const rrule = frequency === 'WEEKLY'
        ? 'FREQ=WEEKLY'
        : frequency === 'FORTNIGHTLY'
        ? 'FREQ=WEEKLY;INTERVAL=2'
        : 'FREQ=MONTHLY';

      const source = await createSource.mutateAsync({
        name: name.trim(),
        type,
        amount: numericAmount.toFixed(2),
      });

      await createSchedule.mutateAsync({
        incomeSourceId: source.id,
        rrule,
        startDate: new Date().toISOString().split('T')[0]!,
      });

      setAdded((prev) => [...prev, name.trim()]);
      setName('');
      setAmount('');
    } catch {
      // Phase 4: swallow errors — API may not be running locally
    } finally {
      setAdding(false);
    }
  };

  const handleNext = () => {
    router.push('/(setup)/categories');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Progress */}
      <View style={styles.progressRow}>
        {[1, 2, 3, 4].map((step) => (
          <View
            key={step}
            style={[styles.progressDot, step === 1 && styles.progressDotActive]}
          />
        ))}
      </View>

      <Text style={styles.stepLabel}>{t('setup.stepOf', { step: 1, total: 4 })}</Text>
      <Text style={styles.title}>{t('setup.income.title')}</Text>
      <Text style={styles.subtitle}>{t('setup.income.subtitle')}</Text>

      {/* Added sources */}
      {added.length > 0 && (
        <View style={styles.addedList}>
          {added.map((n) => (
            <View key={n} style={styles.addedChip}>
              <Text style={styles.addedChipText}>✓ {n}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Add form */}
      <View style={styles.card}>
        <Text style={styles.label}>{t('setup.income.nameLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('setup.income.namePlaceholder')}
          placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.label, styles.labelGap]}>{t('setup.income.typeLabel')}</Text>
        <View style={styles.chipRow}>
          {INCOME_TYPES.map((it) => (
            <TouchableOpacity
              key={it}
              style={[styles.chip, type === it && styles.chipActive]}
              onPress={() => setType(it)}
            >
              <Text style={[styles.chipText, type === it && styles.chipTextActive]}>
                {t(INCOME_TYPE_LABELS[it])}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, styles.labelGap]}>{t('setup.income.amountLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('setup.income.amountPlaceholder')}
          placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <Text style={[styles.label, styles.labelGap]}>{t('setup.income.scheduleLabel')}</Text>
        <View style={styles.chipRow}>
          {FREQUENCIES.map((fr) => (
            <TouchableOpacity
              key={fr}
              style={[styles.chip, frequency === fr && styles.chipActive]}
              onPress={() => setFrequency(fr)}
            >
              <Text style={[styles.chipText, frequency === fr && styles.chipTextActive]}>
                {t(FREQ_LABELS[fr])}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.addBtn, (!name.trim() || !amount.trim()) && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={adding || !name.trim() || !amount.trim()}
          activeOpacity={0.85}
        >
          {adding ? (
            <ActivityIndicator color={DESIGN_TOKENS.colors.onAccent} size="small" />
          ) : (
            <Text style={styles.addBtnText}>{t('setup.income.addCta')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.skipHint}>{t('setup.income.skipHint')}</Text>

      <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
        <Text style={styles.nextBtnText}>{t('common.next')} →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: DESIGN_TOKENS.spacing.containerMargin,
    paddingTop: 56,
    paddingBottom: 40,
    backgroundColor: DESIGN_TOKENS.colors.background,
  },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  progressDot: {
    width: 32, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: { backgroundColor: DESIGN_TOKENS.colors.accent },
  stepLabel: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: DESIGN_TOKENS.colors.primary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted, lineHeight: 18, marginBottom: 20 },
  addedList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  addedChip: {
    backgroundColor: `${DESIGN_TOKENS.colors.accent}22`,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: DESIGN_TOKENS.radius.full,
  },
  addedChipText: { fontSize: 12, color: DESIGN_TOKENS.colors.accent, fontWeight: '600' },
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: DESIGN_TOKENS.spacing.cardPadding,
    marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8,
  },
  label: { fontSize: 13, fontWeight: '600', color: DESIGN_TOKENS.colors.textPrimary, marginBottom: 6 },
  labelGap: { marginTop: 14 },
  input: {
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: DESIGN_TOKENS.colors.textPrimary,
  },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: DESIGN_TOKENS.radius.full,
    borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
  },
  chipActive: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderColor: DESIGN_TOKENS.colors.accent,
  },
  chipText: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
  chipTextActive: { color: DESIGN_TOKENS.colors.onAccent, fontWeight: '600' },
  addBtn: {
    backgroundColor: DESIGN_TOKENS.colors.primary,
    paddingVertical: 13, borderRadius: DESIGN_TOKENS.radius.md,
    alignItems: 'center', marginTop: 20,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: DESIGN_TOKENS.colors.onPrimary, fontWeight: '700', fontSize: 14 },
  skipHint: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, textAlign: 'center', marginBottom: 20 },
  nextBtn: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    paddingVertical: 15, borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center',
  },
  nextBtnText: { color: DESIGN_TOKENS.colors.onAccent, fontWeight: '700', fontSize: 16 },
});
