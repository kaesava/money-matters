import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, InfoTooltip, useMobileToast } from '@money-matters/ui/mobile';
import { formatMobileCurrency } from '../../lib/format';
import { useSetupWizard } from '../../context/SetupWizardContext';
import { SetupCategoryRow } from '../../components/setup/SetupCategoryRow';
import { SetupCategoriesGoalsList } from '../../components/setup/SetupCategoriesGoalsList';
import { SetupBalanceSweepModal } from '../../components/setup/SetupBalanceSweepModal';
import { EnvelopeFormModal, EnvelopeDraftPayload } from '../../components/EnvelopeFormModal';
import { useSetupCategoriesSubmission } from '../../context/useSetupCategoriesSubmission';

export default function SetupCategoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useMobileToast();
  const [showAddEnvelopeModal, setShowAddEnvelopeModal] = useState(false);
  const {
    isRerun,
    goals,
    setGoals,
    activeEveryday,
    activeRegular,
    activeGoals,
    bankAccounts,
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
      <View style={styles.titleRow}>
        <Text style={styles.title}>
          {t('setup.reviewSummary.title')}
        </Text>
        <InfoTooltip title={t('setup.reviewSummary.title')} content={t('setup.reviewSummary.subtitle')} />
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>{t('setup.reviewSummary.monthlyNetIncome')}</Text>
          <Text style={styles.summaryCardVal}>{formatMobileCurrency(estimation.totalMonthlyIncomeAud)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>{t('setup.reviewSummary.totalAllocated')}</Text>
          <Text style={styles.summaryCardVal}>{formatMobileCurrency(totalAllocatedMonthly)}</Text>
        </View>
        <View style={[styles.summaryCard, netSurplus >= 0 ? styles.surplusBg : styles.deficitBg]}>
          <Text style={styles.summaryCardLabel}>
            {netSurplus >= 0
              ? t('setup.reviewSummary.estimatedMonthlyExtra')
              : t('setup.reviewSummary.estimatedMonthlyShortfall')}
          </Text>
          <Text style={styles.summaryCardVal}>{formatMobileCurrency(Math.abs(netSurplus))}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('setup.reviewSummary.everydaySpending')}</Text>
          <Text style={styles.sectionTotal}>{formatMobileCurrency(totalEverydayMonthly)}/mo</Text>
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
          <Text style={styles.sectionTitle}>{t('setup.reviewSummary.regularBills')}</Text>
          <Text style={styles.sectionTotal}>{formatMobileCurrency(totalRegularMonthly)}/mo</Text>
        </View>
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

      <TouchableOpacity
        onPress={() => setShowAddEnvelopeModal(true)}
        style={styles.addEnvelopeBtn}
      >
        <Text style={styles.addEnvelopeBtnText}>{t('setup.reviewSummary.addEnvelopeBtn')}</Text>
      </TouchableOpacity>

      <EnvelopeFormModal
        visible={showAddEnvelopeModal}
        onClose={() => setShowAddEnvelopeModal(false)}
        bankAccounts={bankAccounts}
        onSaveDraft={(draft: EnvelopeDraftPayload) => {
          const num = parseFloat(draft.monthlyAmount || draft.targetAmount || '0') || 0;
          if (draft.type === 'GOAL') {
            const id = `g-${Date.now()}`;
            setGoals((prev) => [
              ...prev,
              {
                id,
                name: draft.name,
                targetAmount: parseFloat(draft.targetAmount || String(num)),
                enteredAmount: parseFloat(draft.enteredAmount || String(num)),
                dueDate: draft.goalMode === 'ONGOING' ? null : draft.endDate || null,
                goalMode: draft.goalMode || 'TARGET_DATE',
                monthlyAmount: num,
                budgetFrequency: draft.budgetFrequency || 'MONTHLY',
                startDate: draft.startDate,
                rrule: draft.rrule,
                icon: 'target',
              },
            ]);
          } else {
            setCustomCategories((prev) => [
              ...prev,
              {
                name: draft.name,
                type: draft.type,
                monthlyAud: num,
                icon: draft.type === 'REGULAR' ? '📌' : '🛒',
              },
            ]);
          }
          setShowAddEnvelopeModal(false);
        }}
      />

      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={() => {
            if (isRerun) {
              router.push({ pathname: '/(setup)/goals', params: { mode: 'rerun' } });
            } else {
              router.back();
            }
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backBtnText}>{t('setup.previousStep')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleFinish} style={styles.nextBtn} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={DESIGN_TOKENS.colors.onAccent} size="small" />
          ) : (
            <Text style={styles.nextBtnText}>
              {isRerun ? t('setup.reviewSummary.recalibrateBudget') : t('setup.reviewSummary.saveBudget')}
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', color: DESIGN_TOKENS.colors.primary, flex: 1 },
  summaryGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.surface, padding: 10, borderRadius: DESIGN_TOKENS.radius.md, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200] },
  summaryCardLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', color: DESIGN_TOKENS.colors.textMuted },
  summaryCardVal: { fontSize: 15, fontWeight: '800', color: DESIGN_TOKENS.colors.primary, marginTop: 2, fontFamily: 'monospace' },
  surplusBg: { backgroundColor: DESIGN_TOKENS.colors.successLight, borderColor: DESIGN_TOKENS.colors.successBorder },
  deficitBg: { backgroundColor: DESIGN_TOKENS.colors.criticalLight, borderColor: DESIGN_TOKENS.colors.criticalBorder },
  sectionCard: { backgroundColor: DESIGN_TOKENS.colors.surface, padding: 14, borderRadius: DESIGN_TOKENS.radius.lg, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200], marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: DESIGN_TOKENS.colors.slate[100], paddingBottom: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: DESIGN_TOKENS.colors.primary },
  sectionTotal: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent, fontFamily: 'monospace' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 40 },
  addEnvelopeBtn: {
    paddingVertical: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: DESIGN_TOKENS.colors.accent,
    borderRadius: DESIGN_TOKENS.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
  },
  addEnvelopeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
  backBtn: { flex: 1, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.surface, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[300], borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  backBtnText: { fontSize: 14, fontWeight: '700', color: DESIGN_TOKENS.colors.slate[600] },
  nextBtn: { flex: 2, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.accent, borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  nextBtnText: { fontSize: 14, fontWeight: '800', color: DESIGN_TOKENS.colors.onAccent },
});
