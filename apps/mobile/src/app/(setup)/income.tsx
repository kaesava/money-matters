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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import {
  DESIGN_TOKENS,
  InfoTooltip,
  AmountInput,
  MobileDatePickerField,
  showMobileConfirm,
  SkeletonCard,
  useMobileToast,
} from '@money-matters/ui/mobile';
import { useSetupWizard } from '../../context/SetupWizardContext';
import { IncomeItem } from '@money-matters/types';
import { SetupProgressBar } from '../../components/setup/SetupProgressBar';

const FREQUENCIES = ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY'] as const;
type Frequency = (typeof FREQUENCIES)[number];

const FREQ_LABELS: Record<Frequency, string> = {
  WEEKLY: 'setup.income.scheduleWeekly',
  FORTNIGHTLY: 'setup.income.scheduleFortnightly',
  MONTHLY: 'setup.income.scheduleMonthly',
};

function getDefaultStartDateAest(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());
}

export default function SetupIncomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    incomes,
    setIncomes,
    isRerun,
    totalSteps,
    isLoadingExistingData,
    dirtyIncomeIds,
    handleUpdateIncomeField,
    handleSaveIncomeImmediate,
    handleRemoveIncome,
  } = useSetupWizard();

  const [savingId, setSavingId] = useState<string | null>(null);

  const handleAddIncome = () => {
    const id = `inc-${Date.now()}`;
    setIncomes((prev) => [
      ...prev,
      {
        id,
        name: `Income ${prev.length + 1}`,
        amount: 2000,
        frequency: 'FORTNIGHTLY',
        type: 'SALARY',
        startDate: getDefaultStartDateAest(),
      },
    ]);
  };

  const handlePromptRemove = (inc: IncomeItem) => {
    const isExisting = !inc.id.startsWith('inc-');
    if (isRerun && isExisting) {
      showMobileConfirm({
        title: t('modals.incomeExpenseForm.archiveIncomeTitle'),
        message: t('modals.incomeExpenseForm.archiveIncomeConfirm'),
        confirmText: t('modals.incomeExpenseForm.archiveSchedule'),
        isDestructive: true,
        onConfirm: () => handleRemoveIncome(inc.id),
      });
    } else {
      handleRemoveIncome(inc.id);
    }
  };

  const toast = useMobileToast();

  const handleNext = async () => {
    if (isRerun && dirtyIncomeIds.size > 0) {
      const saveAndProceed = async () => {
        await Promise.all(Array.from(dirtyIncomeIds).map((id) => handleSaveIncomeImmediate(id)));
        toast.success(t('toasts.saved'));
        router.push({ pathname: '/(setup)/goals', params: { mode: 'rerun' } });
      };

      showMobileConfirm({
        title: t('modals.updateSchedule.confirmTitleIncome'),
        message: t('modals.updateSchedule.confirmDescRuleChange', { startDate: incomes[0]?.startDate || '' }),
        confirmText: t('modals.updateSchedule.confirmCta'),
        isDestructive: false,
        onConfirm: saveAndProceed,
      });
      return;
    }
    if (isRerun) {
      router.push({ pathname: '/(setup)/goals', params: { mode: 'rerun' } });
    } else {
      router.push('/(setup)/accounts');
    }
  };

  const isFormValid = incomes.length > 0 && incomes.every((i) => i.name.trim() !== '' && i.amount > 0);

  if (isRerun && isLoadingExistingData) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top + 16, 56) }]}>
        <SetupProgressBar currentStep={1} totalSteps={totalSteps} isRerun={isRerun} />
        <SkeletonCard count={3} height={140} />
      </View>
    );
  }

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
      <SetupProgressBar currentStep={1} totalSteps={totalSteps} isRerun={isRerun} />

      {!isRerun && (
        <View style={styles.heroBanner}>
          <View style={styles.heroBadgeRow}>
            <Text style={styles.heroBadge}>{t('setup.income.heroBadge')}</Text>
            <Text style={styles.heroStepText}>{t('setup.stepOf', { step: 1, total: totalSteps })}</Text>
          </View>
          <Text style={styles.heroTitle}>{t('setup.income.heroTitle')}</Text>
          <Text style={styles.heroSubtitle}>{t('setup.income.heroSubtitle')}</Text>
        </View>
      )}

      {isRerun && (
        <Text style={styles.stepLabel}>{t('setup.stepOf', { step: 1, total: totalSteps })}</Text>
      )}

      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {isRerun ? t('setup.recalibrateTitle') : t('setup.income.sectionTitle')}
        </Text>
        <InfoTooltip
          title={t('setup.income.takeHomePayTooltipTitle')}
          content={t('setup.income.takeHomePayTooltipContent')}
        />
      </View>

      {isRerun && (
        <Text style={styles.rerunNotice}>{t('setup.income.rerunEditNotice')}</Text>
      )}

      {incomes.map((inc, index) => {
        const isExisting = !inc.id.startsWith('inc-');
        const isDirty = dirtyIncomeIds.has(inc.id);
        const isSaving = savingId === inc.id;

        return (
          <View key={inc.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.itemTitleRow}>
                <Text style={styles.itemTitle}>{t('setup.income.incomeItemNumber', { number: index + 1 })}</Text>
              </View>
              {incomes.length > 1 && (
                <TouchableOpacity onPress={() => handlePromptRemove(inc)}>
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
              onChangeText={(txt) => handleUpdateIncomeField(inc.id, 'name', txt)}
            />

            <AmountInput
              label={t('setup.income.amountLabel')}
              placeholder={t('setup.income.amountPlaceholder')}
              value={inc.amount ? String(inc.amount) : ''}
              onChangeText={(txt) => handleUpdateIncomeField(inc.id, 'amount', parseFloat(txt) || 0)}
              containerStyle={styles.amountWrap}
            />

            <Text style={[styles.label, styles.labelGap]}>{t('setup.income.scheduleLabel')}</Text>
            <View style={styles.chipRow}>
              {FREQUENCIES.map((fr) => (
                <TouchableOpacity
                  key={fr}
                  style={[styles.chip, inc.frequency === fr && styles.chipActive]}
                  onPress={() => handleUpdateIncomeField(inc.id, 'frequency', fr)}
                >
                  <Text style={[styles.chipText, inc.frequency === fr && styles.chipTextActive]}>
                    {t(FREQ_LABELS[fr])}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.datePickerWrap}>
              <MobileDatePickerField
                label={t('setup.income.nextPaydayLabel')}
                value={inc.startDate || getDefaultStartDateAest()}
                onChange={(d) => handleUpdateIncomeField(inc.id, 'startDate', d)}
              />
            </View>
          </View>
        );
      })}

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
        <Text style={styles.nextBtnText}>
          {isRerun ? t('common.next') : `${t('common.next')} →`}
        </Text>
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
  heroBanner: {
    backgroundColor: DESIGN_TOKENS.colors.primary,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: 16,
    marginBottom: 16,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#5EEAD4',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStepText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[300],
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.onPrimary,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[200],
    lineHeight: 18,
  },
  stepLabel: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, marginBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  title: { fontSize: 20, fontWeight: '700', color: DESIGN_TOKENS.colors.primary, flex: 1 },
  rerunNotice: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, marginBottom: 16 },
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: DESIGN_TOKENS.spacing.cardPadding,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.textPrimary },
  inlineSaveBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#ECFDF5',
  },
  removeText: { fontSize: 12, fontWeight: '600', color: DESIGN_TOKENS.colors.critical },
  label: { fontSize: 13, fontWeight: '600', color: DESIGN_TOKENS.colors.textPrimary, marginBottom: 6 },
  labelGap: { marginTop: 14 },
  amountWrap: { marginTop: 14, marginBottom: 0 },
  datePickerWrap: { marginTop: 14 },
  input: {
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
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
    borderColor: DESIGN_TOKENS.colors.slate[200],
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
