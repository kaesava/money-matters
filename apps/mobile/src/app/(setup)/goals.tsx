import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, AmountInput, MobileGoalModeToggle, useMobileToast } from '@money-matters/ui/mobile';
import { useSetupWizard } from '../../context/SetupWizardContext';
import { SetupGoalCard } from '../../components/setup/SetupGoalCard';
import { getMobileLocaleConfig } from '../../lib/format';
import { SetupProgressBar } from '../../components/setup/SetupProgressBar';
import { SetupBalanceSweepModal } from '../../components/setup/SetupBalanceSweepModal';
import { SetupGoalsPresetsGrid, MobileGoalPresetConfig } from '../../components/setup/SetupGoalsPresetsGrid';

export default function SetupGoalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    goals,
    setGoals,
    isRerun,
    totalSteps,
    activeSweepPool,
    setActiveSweepPool,
    availablePools,
    selectedSweepDest,
    setSelectedSweepDest,
    dirtyGoalIds,
    handleUpdateGoalField,
    handleSaveGoalImmediate,
    handleRemoveGoal,
    confirmSweepAndRemove,
  } = useSetupWizard();

  const [customName, setCustomName] = useState('');
  const [customTarget, setCustomTarget] = useState('5000');
  const [customType, setCustomType] = useState<'TARGET_DATE' | 'ONGOING'>('TARGET_DATE');

  const tz = getMobileLocaleConfig().timezone;

  const isPresetActive = (name: string) =>
    goals.some((g) => g.name.trim().toLowerCase() === name.trim().toLowerCase());

  const togglePreset = (preset: MobileGoalPresetConfig) => {
    const existing = goals.find((g) => g.name.trim().toLowerCase() === preset.name.trim().toLowerCase());
    if (existing) {
      handleRemoveGoal(existing.id);
    } else {
      const isOngoing = preset.mode === 'ONGOING';
      const d = new Date();
      d.setMonth(d.getMonth() + (preset.defaultMonths || 12));
      const dueDate = isOngoing ? null : new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
      setGoals((prev) => [
        ...prev,
        {
          id: `g-${Date.now()}`,
          name: preset.name,
          targetAmount: preset.defaultTarget,
          dueDate,
          goalMode: preset.mode,
          monthlyAmount: isOngoing ? preset.defaultTarget : Math.round(preset.defaultTarget / (preset.defaultMonths || 12)),
          icon: preset.icon,
        },
      ]);
    }
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const amountNum = parseFloat(customTarget) || (customType === 'ONGOING' ? 250 : 1000);
    if (customType === 'ONGOING') {
      setGoals((prev) => [
        ...prev,
        {
          id: `g-${Date.now()}`,
          name: customName.trim(),
          targetAmount: amountNum,
          enteredAmount: amountNum,
          dueDate: null,
          goalMode: 'ONGOING',
          monthlyAmount: amountNum,
          budgetFrequency: 'MONTHLY',
          icon: 'target',
        },
      ]);
    } else {
      const d = new Date();
      d.setMonth(d.getMonth() + 12);
      const dueDate = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
      setGoals((prev) => [
        ...prev,
        {
          id: `g-${Date.now()}`,
          name: customName.trim(),
          targetAmount: amountNum,
          dueDate,
          goalMode: 'TARGET_DATE',
          monthlyAmount: Math.round(amountNum / 12),
          icon: 'target',
        },
      ]);
    }
    setCustomName('');
    setCustomTarget(customType === 'ONGOING' ? '250' : '5000');
  };

  const currentStep = isRerun ? 2 : 3;

  const toast = useMobileToast();

  const handleNext = async () => {
    if (isRerun && dirtyGoalIds.size > 0) {
      await Promise.all(Array.from(dirtyGoalIds).map((id) => handleSaveGoalImmediate(id)));
      toast.success(t('toasts.saved'));
    }
    if (isRerun) {
      router.push({ pathname: '/(setup)/categories', params: { mode: 'rerun' } });
    } else {
      router.push('/(setup)/lifestyle');
    }
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
      </View>

      <SetupGoalsPresetsGrid onTogglePreset={togglePreset} isPresetActive={isPresetActive} />

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
        {customType === 'ONGOING' && (
          <Text style={styles.recurringMonthlyNote}>
            {t('setup.goals.recurringMonthlyNote')}
          </Text>
        )}
        <View style={styles.customTargetRow}>
          <View style={styles.flexOne}>
            <AmountInput
              label={customType === 'ONGOING' ? t('setup.goals.recurringContributionLabel') : t('setup.goals.targetAmountLabel')}
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
              isRerun={isRerun}
              isDirty={dirtyGoalIds.has(g.id)}
              onUpdate={handleUpdateGoalField}
              onRemove={handleRemoveGoal}
              onSave={handleSaveGoalImmediate}
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

      <SetupBalanceSweepModal
        visible={Boolean(activeSweepPool)}
        activePool={activeSweepPool}
        availablePools={availablePools}
        selectedDest={selectedSweepDest}
        onSelectDest={setSelectedSweepDest}
        onConfirm={confirmSweepAndRemove}
        onCancel={() => setActiveSweepPool(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: DESIGN_TOKENS.colors.background, flexGrow: 1 },
  stepLabel: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  titleRow: { marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', color: DESIGN_TOKENS.colors.primary },
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
