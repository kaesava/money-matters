import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, showMobileConfirm, InfoTooltip, AmountInput } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { useSetupWizard } from '../../context/SetupWizardContext';
import { IncomeItem } from '@money-matters/types';

const FREQUENCIES = ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY'] as const;
type Frequency = (typeof FREQUENCIES)[number];

const FREQ_LABELS: Record<Frequency, string> = {
  WEEKLY: 'setup.income.scheduleWeekly',
  FORTNIGHTLY: 'setup.income.scheduleFortnightly',
  MONTHLY: 'setup.income.scheduleMonthly',
};

export default function SetupIncomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { incomes, setIncomes } = useSetupWizard();

  const updatePref = trpc.updateUserPreferences.useMutation();

  const handleSkip = () => {
    showMobileConfirm({
      title: t('setup.skipConfirmTitle'),
      message: t('setup.skipConfirmMessage'),
      confirmText: t('setup.skipConfirmButton'),
      onConfirm: async () => {
        try {
          await updatePref.mutateAsync({ setupCompleted: true });
        } catch {
          // Non-blocking preference update
        }
        router.replace('/(app)/home');
      },
    });
  };

  const handleAddIncome = () => {
    const id = `inc-${Date.now()}`;
    setIncomes((prev) => [
      ...prev,
      { id, name: `Income ${prev.length + 1}`, amount: 2000, frequency: 'FORTNIGHTLY', type: 'SALARY' },
    ]);
  };

  const handleRemoveIncome = (id: string) => {
    setIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  const handleUpdateIncome = <K extends keyof IncomeItem>(id: string, field: K, val: IncomeItem[K]) => {
    setIncomes((prev) => prev.map((inc) => (inc.id === id ? { ...inc, [field]: val } : inc)));
  };

  const handleNext = () => {
    router.push('/(setup)/accounts');
  };

  const isFormValid = incomes.length > 0 && incomes.every((i) => i.name.trim() !== '' && i.amount > 0);

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: Math.max(insets.top + 16, 56),
          paddingBottom: Math.max(insets.bottom + 20, 40),
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topNavRow}>
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>
        <TouchableOpacity
          onPress={handleSkip}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.skipBtnText}>{t('setup.skipForNow')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.stepLabel}>{t('setup.stepOf', { step: 1, total: 5 })}</Text>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('setup.income.sectionTitle')}</Text>
        <InfoTooltip
          title={t('setup.income.takeHomePayTooltipTitle')}
          content={t('setup.income.takeHomePayTooltipContent')}
        />
      </View>

      {incomes.map((inc, index) => (
        <View key={inc.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.itemTitle}>{t('setup.income.incomeItemNumber', { number: index + 1 })}</Text>
            {incomes.length > 1 && (
              <TouchableOpacity onPress={() => handleRemoveIncome(inc.id)}>
                <Text style={styles.removeText}>{t('common.remove')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.label}>{t('setup.income.nameLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('setup.income.namePlaceholder')}
            placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
            value={inc.name}
            onChangeText={(txt) => handleUpdateIncome(inc.id, 'name', txt)}
          />

          <AmountInput
            label={t('setup.income.amountLabel')}
            placeholder={t('setup.income.amountPlaceholder')}
            value={inc.amount ? String(inc.amount) : ''}
            onChangeText={(txt) => handleUpdateIncome(inc.id, 'amount', parseFloat(txt) || 0)}
            containerStyle={styles.amountWrap}
          />

          <Text style={[styles.label, styles.labelGap]}>{t('setup.income.scheduleLabel')}</Text>
          <View style={styles.chipRow}>
            {FREQUENCIES.map((fr) => (
              <TouchableOpacity
                key={fr}
                style={[styles.chip, inc.frequency === fr && styles.chipActive]}
                onPress={() => handleUpdateIncome(inc.id, 'frequency', fr)}
              >
                <Text style={[styles.chipText, inc.frequency === fr && styles.chipTextActive]}>
                  {t(FREQ_LABELS[fr])}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={styles.addBtn}
        onPress={handleAddIncome}
      >
        <Text style={styles.addBtnText}>+ {t('setup.income.addIncomeSchedule')}</Text>
      </TouchableOpacity>

      <Text style={styles.skipHint}>{t('setup.income.progressiveHint')}</Text>

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
    backgroundColor: DESIGN_TOKENS.colors.background,
  },
  topNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  progressRow: { flexDirection: 'row', gap: 6 },
  skipBtnText: { fontSize: 12, fontWeight: '600', color: DESIGN_TOKENS.colors.textMuted },
  progressDot: { width: 24, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  progressDotActive: { backgroundColor: DESIGN_TOKENS.colors.accent },
  stepLabel: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, marginBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 6 },
  title: { fontSize: 22, fontWeight: '700', color: DESIGN_TOKENS.colors.primary },
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: DESIGN_TOKENS.spacing.cardPadding,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemTitle: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.textPrimary },
  removeText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
  label: { fontSize: 13, fontWeight: '600', color: DESIGN_TOKENS.colors.textPrimary, marginBottom: 6 },
  labelGap: { marginTop: 14 },
  amountWrap: { marginTop: 14, marginBottom: 0 },
  input: {
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: DESIGN_TOKENS.radius.full,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
  },
  chipActive: { backgroundColor: DESIGN_TOKENS.colors.accent, borderColor: DESIGN_TOKENS.colors.accent },
  chipText: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
  chipTextActive: { color: DESIGN_TOKENS.colors.onAccent, fontWeight: '600' },
  addBtn: {
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accent,
    borderStyle: 'dashed',
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: DESIGN_TOKENS.colors.accent },
  skipHint: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, textAlign: 'center', marginBottom: 20 },
  nextBtn: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    paddingVertical: 15,
    borderRadius: DESIGN_TOKENS.radius.md,
    alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: DESIGN_TOKENS.colors.onAccent, fontWeight: '700', fontSize: 16 },
});

