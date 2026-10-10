import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, AmountInput } from '@money-matters/ui/mobile';
import { useSetupWizard } from '../../context/SetupWizardContext';
import { UserGoalItem } from '@money-matters/types';
import { SetupGoalCard } from '../../components/setup/SetupGoalCard';
import { getMobileLocaleConfig } from '../../lib/format';
import { SetupProgressBar } from '../../components/setup/SetupProgressBar';
import { SetupBalanceSweepModal } from '../../components/setup/SetupBalanceSweepModal';

const PRESET_GOALS = [
  { name: 'Emergency Reserve (3-6 Months)', icon: '🛡️', defaultTarget: 10000, defaultMonths: 12 },
  { name: 'Annual Family Holiday', icon: '✈️', defaultTarget: 5000, defaultMonths: 12 },
  { name: 'New Car', icon: '🚗', defaultTarget: 15000, defaultMonths: 24 },
  { name: 'Home Maintenance & Repairs', icon: '🏡', defaultTarget: 4000, defaultMonths: 12 },
  { name: 'Investment & Wealth Building', icon: '📈', defaultTarget: 20000, defaultMonths: 36 },
  { name: 'Tech & Gadget Upgrade', icon: '💻', defaultTarget: 1500, defaultMonths: 6 },
];

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
    handleRemoveGoal,
    confirmSweepAndRemove,
  } = useSetupWizard();

  const [customName, setCustomName] = useState('');
  const [customTarget, setCustomTarget] = useState('5000');

  const tz = getMobileLocaleConfig().timezone;

  const isPresetActive = (name: string) =>
    goals.some((g) => g.name.trim().toLowerCase() === name.trim().toLowerCase());

  const togglePreset = (preset: typeof PRESET_GOALS[0]) => {
    const existing = goals.find((g) => g.name.trim().toLowerCase() === preset.name.trim().toLowerCase());
    if (existing) {
      handleRemoveGoal(existing.id);
    } else {
      const d = new Date();
      d.setMonth(d.getMonth() + preset.defaultMonths);
      const dueDate = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
      setGoals((prev) => [
        ...prev,
        {
          id: `g-${Date.now()}`,
          name: preset.name,
          targetAmount: preset.defaultTarget,
          dueDate,
          monthlyAmount: Math.round(preset.defaultTarget / preset.defaultMonths),
          icon: preset.icon,
        },
      ]);
    }
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const target = parseFloat(customTarget) || 1000;
    const d = new Date();
    d.setMonth(d.getMonth() + 12);
    const dueDate = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
    setGoals((prev) => [
      ...prev,
      {
        id: `g-${Date.now()}`,
        name: customName.trim(),
        targetAmount: target,
        dueDate,
        monthlyAmount: Math.round(target / 12),
        icon: '🎯',
      },
    ]);
    setCustomName('');
    setCustomTarget('5000');
  };

  const handleUpdateGoal = (id: string, field: keyof UserGoalItem, val: string | number) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, [field]: val } : g)));
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: Math.max(insets.top + 16, 20), paddingBottom: Math.max(insets.bottom + 20, 20) },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <SetupProgressBar currentStep={3} totalSteps={totalSteps} isRerun={isRerun} />

      <Text style={styles.stepLabel}>{t('setup.stepOf', { step: 3, total: totalSteps })}</Text>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('setup.categories.goalSection')}</Text>
      </View>

      <Text style={styles.sectionHeading}>Popular Goal Presets:</Text>
      <View style={styles.presetsGrid}>
        {PRESET_GOALS.map((preset) => {
          const active = isPresetActive(preset.name);
          return (
            <TouchableOpacity
              key={preset.name}
              onPress={() => togglePreset(preset)}
              style={[styles.presetCard, active && styles.presetCardActive]}
            >
              <Text style={styles.presetIcon}>{preset.icon}</Text>
              <Text style={styles.presetName} numberOfLines={1}>{preset.name}</Text>
              <Text style={styles.presetMeta}>${preset.defaultTarget.toLocaleString()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionHeading, styles.marginTop16]}>Your Savings Goals ({goals.length}):</Text>
      {goals.map((g) => (
        <SetupGoalCard
          key={g.id}
          goal={g}
          onUpdate={handleUpdateGoal}
          onRemove={handleRemoveGoal}
        />
      ))}

      <View style={styles.customBox}>
        <Text style={styles.customHeading}>Add Custom Goal:</Text>
        <TextInput
          style={styles.customInput}
          placeholder="Goal name (e.g. Wedding, Japan Trip)"
          placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
          value={customName}
          onChangeText={setCustomName}
        />
        <View style={styles.customTargetRow}>
          <View style={styles.flexOne}>
            <AmountInput value={customTarget} onChangeText={setCustomTarget} />
          </View>
          <TouchableOpacity
            style={[styles.addCustomBtn, !customName.trim() && styles.disabledBtn]}
            onPress={handleAddCustom}
            disabled={!customName.trim()}
          >
            <Text style={styles.addCustomBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('setup.previousStep')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(setup)/lifestyle')} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>{t('common.next')} →</Text>
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
  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  presetCard: {
    width: '48%',
    backgroundColor: DESIGN_TOKENS.colors.surface,
    padding: 10,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  presetCardActive: { borderColor: DESIGN_TOKENS.colors.accent, backgroundColor: DESIGN_TOKENS.colors.accentLight },
  presetIcon: { fontSize: 20, marginBottom: 4 },
  presetName: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.primary },
  presetMeta: { fontSize: 11, color: DESIGN_TOKENS.colors.textMuted, marginTop: 2 },
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
