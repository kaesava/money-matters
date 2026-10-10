import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, InfoTooltip, useMobileToast } from '@money-matters/ui/mobile';
import { useSetupWizard } from '../../context/SetupWizardContext';
import { SetupCategoryRow } from '../../components/setup/SetupCategoryRow';
import { SetupProgressBar } from '../../components/setup/SetupProgressBar';
import { SetupCategoriesCustomInput } from '../../components/setup/SetupCategoriesCustomInput';
import { SetupCategoriesGoalsList } from '../../components/setup/SetupCategoriesGoalsList';
import { SetupBalanceSweepModal } from '../../components/setup/SetupBalanceSweepModal';
import { useSetupCategoriesSubmission } from './useSetupCategoriesSubmission';

export default function SetupCategoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useMobileToast();
  const {
    isRerun,
    totalSteps,
    goals,
    activeCategories,
    activeEveryday,
    activeRegular,
    activeGoals,
    categoryFrequencies,
    setCategoryFrequencies,
    setAmountOverrides,
    setRemovedCategoryNames,
    setCustomCategories,
    totalAllocatedMonthly,
    totalEverydayMonthly,
    totalRegularMonthly,
    totalGoalMonthly,
    estimation,
    activeSweepPool,
    setActiveSweepPool,
    availablePools,
    selectedSweepDest,
    setSelectedSweepDest,
    confirmSweepAndRemove,
    autoCreateExpenseSchedules,
    setAutoCreateExpenseSchedules,
  } = useSetupWizard();

  const { isSubmitting, handleFinish } = useSetupCategoriesSubmission();

  const netSurplus = estimation.totalMonthlyIncomeAud - totalAllocatedMonthly;

  const handleAttemptRemoveCategory = (name: string) => {
    const lower = name.trim().toLowerCase();
    if (lower.includes('emergency') || lower.includes('surplus') || lower.includes('reserve')) {
      toast.error(t('setup.surplusTargetDeleteWarning'), t('setup.protectedPoolTitle'));
      return;
    }
    setRemovedCategoryNames((prev) => new Set(prev).add(name));
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: Math.max(insets.top + 16, 20), paddingBottom: Math.max(insets.bottom + 20, 20) },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <SetupProgressBar currentStep={totalSteps} totalSteps={totalSteps} isRerun={isRerun} />

      <Text style={styles.stepLabel}>{t('setup.stepOf', { step: totalSteps, total: totalSteps })}</Text>
      <View style={styles.titleRow}>
        <Text style={styles.title}>
          {isRerun ? t('setup.recalibrateTitle') : t('setup.reviewSummaryTitle')}
        </Text>
        <InfoTooltip title={t('setup.reviewSummaryTooltipTitle')} content={t('setup.reviewSummaryTooltipContent')} />
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>{t('setup.netIncomeLabel')}</Text>
          <Text style={styles.summaryCardVal}>${estimation.totalMonthlyIncomeAud.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>{t('setup.allocatedLabel')}</Text>
          <Text style={styles.summaryCardVal}>${totalAllocatedMonthly.toLocaleString()}</Text>
        </View>
        <View style={[styles.summaryCard, netSurplus >= 0 ? styles.surplusBg : styles.deficitBg]}>
          <Text style={styles.summaryCardLabel}>{netSurplus >= 0 ? t('setup.surplusLabel') : t('setup.deficitLabel')}</Text>
          <Text style={styles.summaryCardVal}>${Math.abs(netSurplus).toLocaleString()}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('setup.everydayPoolTitle')}</Text>
          <Text style={styles.sectionTotal}>${totalEverydayMonthly.toLocaleString()}/mo</Text>
        </View>
        {activeEveryday.map((cat) => (
          <SetupCategoryRow
            key={cat.name}
            cat={cat}
            freq={categoryFrequencies[cat.name] || 'MONTHLY'}
            onUpdateAmount={(amt) => setAmountOverrides((prev) => ({ ...prev, [cat.name]: amt }))}
            onUpdateFreq={(f) => setCategoryFrequencies((prev) => ({ ...prev, [cat.name]: f }))}
            onRemove={() => handleAttemptRemoveCategory(cat.name)}
          />
        ))}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('setup.billsPoolTitle')}</Text>
          <Text style={styles.sectionTotal}>${totalRegularMonthly.toLocaleString()}/mo</Text>
        </View>
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setAutoCreateExpenseSchedules((prev) => !prev)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, autoCreateExpenseSchedules && styles.checkboxActive]}>
            {autoCreateExpenseSchedules && <Text style={styles.checkmarkText}>✓</Text>}
          </View>
          <View style={styles.toggleTextCol}>
            <Text style={styles.toggleLabel}>{t('setup.autoScheduleBillsLabel')}</Text>
            <Text style={styles.toggleHelp}>
              {isRerun ? t('setup.autoScheduleBillsRerunHelp') : t('setup.autoScheduleBillsHelp')}
            </Text>
          </View>
        </TouchableOpacity>
        {activeRegular.map((cat) => (
          <SetupCategoryRow
            key={cat.name}
            cat={cat}
            freq={categoryFrequencies[cat.name] || 'MONTHLY'}
            onUpdateAmount={(amt) => setAmountOverrides((prev) => ({ ...prev, [cat.name]: amt }))}
            onUpdateFreq={(f) => setCategoryFrequencies((prev) => ({ ...prev, [cat.name]: f }))}
            onRemove={() => handleAttemptRemoveCategory(cat.name)}
          />
        ))}
      </View>

      <SetupCategoriesGoalsList
        goals={activeGoals}
        userGoals={goals}
        totalGoalMonthly={totalGoalMonthly}
        onRemove={handleAttemptRemoveCategory}
      />

      <SetupCategoriesCustomInput
        onAdd={(newCat) => setCustomCategories((prev) => [...prev, newCat])}
      />

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('setup.previousStep')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleFinish} style={styles.nextBtn} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={DESIGN_TOKENS.colors.onAccent} size="small" />
          ) : (
            <Text style={styles.nextBtnText}>
              {isRerun ? t('setup.recalibrateBudget') : t('setup.finish.cta')}
            </Text>
          )}
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', color: DESIGN_TOKENS.colors.primary, flex: 1 },
  summaryGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.surface, padding: 10, borderRadius: DESIGN_TOKENS.radius.md, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200] },
  summaryCardLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', color: DESIGN_TOKENS.colors.textMuted },
  summaryCardVal: { fontSize: 15, fontWeight: '800', color: DESIGN_TOKENS.colors.primary, marginTop: 2 },
  surplusBg: { backgroundColor: DESIGN_TOKENS.colors.successLight, borderColor: DESIGN_TOKENS.colors.successBorder },
  deficitBg: { backgroundColor: DESIGN_TOKENS.colors.criticalLight, borderColor: DESIGN_TOKENS.colors.criticalBorder },
  sectionCard: { backgroundColor: DESIGN_TOKENS.colors.surface, padding: 14, borderRadius: DESIGN_TOKENS.radius.lg, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200], marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: DESIGN_TOKENS.colors.slate[100], paddingBottom: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: DESIGN_TOKENS.colors.primary },
  sectionTotal: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 40 },
  backBtn: { flex: 1, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.surface, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[300], borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  backBtnText: { fontSize: 14, fontWeight: '700', color: DESIGN_TOKENS.colors.slate[600] },
  nextBtn: { flex: 2, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.accent, borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  nextBtnText: { fontSize: 14, fontWeight: '800', color: DESIGN_TOKENS.colors.onAccent },
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: DESIGN_TOKENS.colors.surfaceVariant, padding: 10, borderRadius: DESIGN_TOKENS.radius.md, marginVertical: 8, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200] },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: DESIGN_TOKENS.colors.slate[400], alignItems: 'center', justifyContent: 'center', marginTop: 1, backgroundColor: DESIGN_TOKENS.colors.surface },
  checkboxActive: { backgroundColor: DESIGN_TOKENS.colors.accent, borderColor: DESIGN_TOKENS.colors.accent },
  checkmarkText: { color: DESIGN_TOKENS.colors.onAccent, fontSize: 11, fontWeight: '900', lineHeight: 12 },
  toggleTextCol: { flex: 1 },
  toggleLabel: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.primary },
  toggleHelp: { fontSize: 10, color: DESIGN_TOKENS.colors.textMuted, marginTop: 2, lineHeight: 14 },
});
