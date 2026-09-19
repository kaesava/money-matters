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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, showMobileConfirm } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';

import { InfoTooltip } from '../../components/InfoTooltip';

const FREQUENCIES = ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY'] as const;
type Frequency = (typeof FREQUENCIES)[number];

const FREQ_LABELS: Record<Frequency, string> = {
  WEEKLY: 'setup.income.scheduleWeekly',
  FORTNIGHTLY: 'setup.income.scheduleFortnightly',
  MONTHLY: 'setup.income.scheduleMonthly',
};

export default function SetupIncomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();

  const [name, setName] = useState(t('setup.income.defaultName', { defaultValue: 'My Salary' }));
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('FORTNIGHTLY');

  const updatePref = trpc.updateUserPreferences.useMutation();

  const handleSkip = () => {
    showMobileConfirm({
      title: t('setup.skipConfirmTitle'),
      message: t('setup.skipConfirmMessage'),
      confirmText: t('setup.skipConfirmButton'),
      onConfirm: async () => {
        try {
          await updatePref.mutateAsync({ setupCompleted: true });
        } catch (_e) {
          // Ignore
        }
        router.replace('/(app)/home');
      },
    });
  };

  const handleNext = () => {
    if (!name.trim() || !amount.trim() || isNaN(parseFloat(amount))) return;
    router.push({
      pathname: '/(setup)/accounts',
      params: {
        incomeName: name.trim(),
        incomeAmount: amount,
        incomeFrequency: frequency,
        mode: params.mode,
      }
    });
  };

  const isFormValid = name.trim() !== '' && amount.trim() !== '' && !isNaN(parseFloat(amount)) && parseFloat(amount) >= 0;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.topNavRow}>
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.skipBtnText}>{t('setup.skipForNow')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.stepLabel}>{t('setup.stepOf', { step: 1, total: 3, defaultValue: 'Step 1 of 3' })}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <Text style={styles.title}>{t('setup.income.titleSimple', { defaultValue: 'How much do you get paid?' })}</Text>
        <InfoTooltip
          title="Take-Home Pay"
          content="Knowing your net income allows Money Matters to route earnings into your 5-Step Waterfall automatically."
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{t('setup.income.nameLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('setup.income.namePlaceholder')}
          placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
          value={name}
          onChangeText={setName}
        />

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
      </View>

      <Text style={styles.skipHint}>{t('setup.income.progressiveHint', { defaultValue: 'You can add more income sources and bank accounts later in Settings.' })}</Text>

      <TouchableOpacity
        style={[styles.nextBtn, !isFormValid && styles.nextBtnDisabled]}
        onPress={handleNext}
        disabled={!isFormValid}
        activeOpacity={0.85}
      >
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
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressRow: { flexDirection: 'row', gap: 6 },
  skipBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  progressDot: {
    width: 48, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: { backgroundColor: DESIGN_TOKENS.colors.accent },
  stepLabel: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: DESIGN_TOKENS.colors.primary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted, lineHeight: 18, marginBottom: 20 },
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
  skipHint: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, textAlign: 'center', marginBottom: 20 },
  nextBtn: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    paddingVertical: 15, borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: DESIGN_TOKENS.colors.onAccent, fontWeight: '700', fontSize: 16 },
});
