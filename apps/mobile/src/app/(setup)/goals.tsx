import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, AmountInput, MobileGoalModeToggle, MobileDatePickerField, showMobileConfirm, InfoTooltip } from '@money-matters/ui/mobile';
import { useSetupWizard } from '../../context/SetupWizardContext';
import { SetupGoalCard } from '../../components/setup/SetupGoalCard';
import { getMobileLocaleConfig } from '../../lib/format';
import { SetupProgressBar } from '../../components/setup/SetupProgressBar';
import { SetupGoalsPresetsGrid, MobileGoalPresetConfig } from '../../components/setup/SetupGoalsPresetsGrid';
import { UserGoalItem } from '@money-matters/types';

export default function SetupGoalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    goals,
    setGoals,
    isRerun,
    isAud,
    totalSteps,
    handleUpdateGoalField,
    handleRemoveGoal,
  } = useSetupWizard();

  const [customName, setCustomName] = useState('');
  const [customTarget, setCustomTarget] = useState(isAud ? '5000' : '0');
  const [customDate, setCustomDate] = useState('');
  const [customFrequency, setCustomFrequency] = useState<'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'>('MONTHLY');
  const [customType, setCustomType] = useState<'TARGET_BALANCE' | 'RECURRING'>('TARGET_BALANCE');

  const tz = getMobileLocaleConfig().timezone;
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  const isCustomPastDate = Boolean(customType === 'TARGET_BALANCE' && customDate && customDate < todayStr);

  const isPresetActive = (name: string) =>
    goals.some((g) => g.name.trim().toLowerCase() === name.trim().toLowerCase());

  const handlePromptRemoveGoal = (goal: UserGoalItem) => {
    if (goal.isSurplusTarget) return;
    const isExisting = !goal.id.startsWith('g-');
    if (isRerun && isExisting) {
      showMobileConfirm({
        title: t('setup.confirmArchiveEnvelopeTitle'),
        message: t('setup.confirmArchiveEnvelopeDesc', { name: goal.name }),
        confirmText: t('common.remove'),
        isDestructive: true,
        onConfirm: () => handleRemoveGoal(goal.id),
      });
    } else {
      handleRemoveGoal(goal.id);
    }
  };

  const togglePreset = (preset: MobileGoalPresetConfig) => {
    const existing = goals.find((g) => g.name.trim().toLowerCase() === preset.name.trim().toLowerCase());
    if (existing) {
      handlePromptRemoveGoal(existing);
    } else {
      const isOngoing = preset.fundingMode === 'RECURRING';
      const d = new Date();
      d.setMonth(d.getMonth() + (preset.defaultMonths || 12));
      const dueDate = isOngoing ? null : new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
      const targetAmt = isAud ? preset.defaultTarget : 0;
      setGoals((prev) => [
        ...prev,
        {
          id: `g-${Date.now()}`,
          name: preset.name,
          targetAmount: targetAmt,
          dueDate,
          fundingMode: preset.fundingMode,
          monthlyAmount: isOngoing ? targetAmt : Math.round(targetAmt / (preset.defaultMonths || 12)),
          icon: preset.icon,
          isPriority: false,
        },
      ]);
    }
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const defaultCustomAmt = isAud ? (customType === 'RECURRING' ? 250 : 1000) : 0;
    const amountNum = parseFloat(customTarget) || defaultCustomAmt;
    if (customType === 'RECURRING') {
      const monthly = customFrequency === 'WEEKLY'
        ? Math.round((amountNum * 52) / 12)
        : customFrequency === 'FORTNIGHTLY'
        ? Math.round((amountNum * 26) / 12)
        : customFrequency === 'QUARTERLY'
        ? Math.round((amountNum * 4) / 12)
        : customFrequency === 'ANNUALLY'
        ? Math.round(amountNum / 12)
        : Math.round(amountNum);
      setGoals((prev) => [
        ...prev,
        {
          id: `g-${Date.now()}`,
          name: customName.trim(),
          targetAmount: amountNum,
          enteredAmount: amountNum,
          dueDate: null,
          fundingMode: 'RECURRING',
          monthlyAmount: monthly,
          budgetFrequency: customFrequency,
          icon: 'target',
          isPriority: false,
        },
      ]);
    } else {
      let dueDate = customDate;
      if (!dueDate) {
        const d = new Date();
        d.setMonth(d.getMonth() + 12);
        dueDate = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
      }
      setGoals((prev) => [
        ...prev,
        {
          id: `g-${Date.now()}`,
          name: customName.trim(),
          targetAmount: amountNum,
          dueDate,
          fundingMode: 'TARGET_BALANCE',
          monthlyAmount: Math.round(amountNum / 12),
          icon: 'target',
          isPriority: false,
        },
      ]);
    }
    setCustomName('');
    setCustomDate('');
    setCustomTarget(customType === 'RECURRING' ? '250' : '5000');
  };

  const currentStep = isRerun ? 2 : 3;

  const proceedToNextStep = () => {
    if (isRerun) {
      router.push({ pathname: '/(setup)/categories', params: { mode: 'rerun' } });
    } else {
      router.push('/(setup)/lifestyle');
    }
  };

  const handleNext = () => {
    if (customName.trim()) {
      showMobileConfirm({
        title: t('setup.goals.unsavedGoalTitle'),
        message: t('setup.goals.unsavedGoalMessage', { name: customName.trim() }),
        confirmText: t('setup.goals.addAndProceed'),
        cancelText: t('setup.goals.discardAndProceed'),
        onConfirm: () => {
          handleAddCustom();
          proceedToNextStep();
        },
        onCancel: () => {
          setCustomName('');
          proceedToNextStep();
        },
      });
      return;
    }
    proceedToNextStep();
  };

  const handleBack = () => {
    if (isRerun) {
      router.push({ pathname: '/(setup)/income', params: { mode: 'rerun' } });
    } else {
      router.back();
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: Math.max(insets.top + 16, 20), paddingBottom: Math.max(insets.bottom + 20, 20) },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <SetupProgressBar currentStep={currentStep} totalSteps={totalSteps} isRerun={isRerun} />

      <Text style={styles.stepLabel}>{t('setup.stepOf', { step: currentStep, total: totalSteps })}</Text>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('setup.goals.title')}</Text>
        <InfoTooltip title={t('setup.goals.tooltipTitle')} content={t('setup.goals.tooltipContent')} />
      </View>

      <SetupGoalsPresetsGrid onTogglePreset={togglePreset} isPresetActive={isPresetActive} isAud={isAud} />

      <View style={styles.customBox}>
        <Text style={styles.customHeading}>{t('setup.goals.addCustomGoal')}</Text>
        <TextInput
          style={styles.customInput}
          placeholder={t('setup.goals.customGoalPlaceholder')}
          placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
          value={customName}
          onChangeText={setCustomName}
        />
        <View style={styles.toggleWrap}>
          <MobileGoalModeToggle value={customType} onChange={setCustomType} />
        </View>
        {customType === 'RECURRING' && (
          <View style={styles.freqSelectSection}>
            <Text style={styles.freqSectionLabel}>{t('categories.recurrence')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.freqChipsRow}>
              {(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'] as const).map((f) => {
                const label = f === 'WEEKLY'
                  ? t('categories.frequencyWeekly')
                  : f === 'FORTNIGHTLY'
                  ? t('categories.frequencyFortnightly')
                  : f === 'QUARTERLY'
                  ? t('setup.frequencyQuarterly')
                  : f === 'ANNUALLY'
                  ? t('categories.frequencyAnnually')
                  : t('categories.frequencyMonthly');
                return (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setCustomFrequency(f)}
                    style={[styles.freqChip, customFrequency === f && styles.freqChipActive]}
                  >
                    <Text style={[styles.freqChipText, customFrequency === f && styles.freqChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
        {customType === 'TARGET_BALANCE' && (
          <View style={styles.datePickerWrap}>
            <Text style={styles.fieldLabel}>{t('categories.targetDateLabel')}</Text>
            <MobileDatePickerField
              compact
              value={customDate}
              onChange={setCustomDate}
            />
          </View>
        )}
        <View style={styles.customTargetRow}>
          <View style={styles.flexOne}>
            <AmountInput
              label={customType === 'RECURRING' ? t('setup.goals.recurringContributionLabel') : t('setup.goals.targetAmountLabel')}
              value={customTarget}
              onChangeText={setCustomTarget}
            />
          </View>
          <TouchableOpacity
            style={[styles.addCustomBtn, !customName.trim() && styles.disabledBtn]}
            onPress={handleAddCustom}
            disabled={!customName.trim()}
          >
            <Text style={styles.addCustomBtnText}>+ {t('common.add')}</Text>
          </TouchableOpacity>
        </View>
        {isCustomPastDate && (
          <Text style={styles.pastDateWarning}>{t('categories.goalPastDateWarning')}</Text>
        )}
      </View>

      {goals.length > 0 && (
        <View style={styles.rerunSection}>
          <Text style={styles.sectionHeading}>
            {t('setup.goals.yourSavingsGoals', { count: goals.length })}
          </Text>
          {goals.map((g) => (
            <SetupGoalCard
              key={g.id}
              goal={g}
              onUpdate={handleUpdateGoalField}
              onRemove={() => handlePromptRemoveGoal(g)}
            />
          ))}
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('setup.previousStep')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>
            {isRerun ? t('common.next') : `${t('common.next')} →`}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: DESIGN_TOKENS.colors.background, flexGrow: 1 },
  stepLabel: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', color: DESIGN_TOKENS.colors.primary, flex: 1 },
  pastDateWarning: { fontSize: 11, fontWeight: '700', color: DESIGN_TOKENS.colors.warning, marginTop: 8 },
  sectionHeading: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.textPrimary, marginBottom: 8 },
  marginTop16: { marginTop: 16 },
  rerunSection: { marginBottom: 16 },
  customBox: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    padding: 12,
    borderRadius: DESIGN_TOKENS.radius.lg,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    marginTop: 12,
    marginBottom: 20,
  },
  customHeading: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.primary, marginBottom: 8 },
  customInput: {
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: DESIGN_TOKENS.colors.textPrimary,
    marginBottom: 8,
  },
  toggleWrap: {
    marginBottom: 8,
  },
  freqSelectSection: {
    marginBottom: 10,
  },
  freqSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
    marginBottom: 4,
  },
  freqChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  freqChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  freqChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  freqChipTextActive: {
    color: '#1D4ED8',
  },
  datePickerWrap: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
    marginBottom: 4,
  },
  recurringMonthlyNote: {
    fontSize: 11,
    fontWeight: '500',
    color: DESIGN_TOKENS.colors.slate[500],
    marginBottom: 8,
  },
  customTargetRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  flexOne: { flex: 1 },
  addCustomBtn: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: DESIGN_TOKENS.radius.md,
  },
  disabledBtn: { opacity: 0.5 },
  addCustomBtnText: { color: DESIGN_TOKENS.colors.onAccent, fontWeight: '700', fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 40 },
  backBtn: { flex: 1, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.surface, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[300], borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  backBtnText: { fontSize: 14, fontWeight: '700', color: DESIGN_TOKENS.colors.slate[600] },
  nextBtn: { flex: 2, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.accent, borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  nextBtnText: { fontSize: 14, fontWeight: '800', color: DESIGN_TOKENS.colors.onAccent },
});
