import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, InfoTooltip, useMobileToast, showMobileConfirm } from '@money-matters/ui/mobile';
import { EstimatedCategoryItem } from '@money-matters/types';
import { formatMobileCurrency } from '../../lib/format';
import { useSetupWizard } from '../../context/SetupWizardContext';
import { SetupProgressBar } from '../../components/setup/SetupProgressBar';
import { SetupCategoryRow } from '../../components/setup/SetupCategoryRow';
import { SetupCategoriesGoalsList } from '../../components/setup/SetupCategoriesGoalsList';
import { MobilePaydaySandboxModal } from '../../components/setup/MobilePaydaySandboxModal';
import { EnvelopeFormModal, EnvelopeDraftPayload, EnvelopeItem } from '../../components/EnvelopeFormModal';
import { useSetupCategoriesSubmission } from '../../context/useSetupCategoriesSubmission';

export default function SetupCategoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useMobileToast();
  const [showAddEnvelopeModal, setShowAddEnvelopeModal] = useState(false);
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [envelopeToEditDraft, setEnvelopeToEditDraft] = useState<EnvelopeItem | null>(null);
  const {
    isRerun,
    totalSteps,
    incomes,
    goals,
    setGoals,
    handleRemoveGoal,
    activeEveryday,
    activeRegular,
    activeGoals,
    bankAccounts,
    categoryFrequencies,
    setCategoryFrequencies,
    setAmountOverrides,
    setBillTypeOverrides,
    setRemovedCategoryNames,
    setCustomCategories,
    totalAllocatedMonthly,
    totalEverydayMonthly,
    totalRegularMonthly,
    totalGoalMonthly,
    estimation,
    convertFromMonthly,
  } = useSetupWizard();

  const { isSubmitting, handleFinish } = useSetupCategoriesSubmission();
  const netSurplus = estimation.totalMonthlyIncomeAud - totalAllocatedMonthly;

  const [everydayOpen, setEverydayOpen] = useState(false);
  const [billsOpen, setBillsOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);

  const executeRemoveCategory = (name: string) => {
    setRemovedCategoryNames((prev) => new Set(prev).add(name));
    const matchedGoal = goals.find((g) => g.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (matchedGoal) {
      handleRemoveGoal(matchedGoal.id);
    }
  };

  const handleAttemptRemoveCategory = (name: string) => {
    const allItems = [...activeEveryday, ...activeRegular, ...activeGoals];
    const matchedCat = allItems.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
    const matchedGoal = goals.find((g) => g.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (matchedCat?.isSurplusTarget || matchedGoal?.isSurplusTarget) {
      toast.error(t('setup.surplusTargetDeleteWarning', { name }), t('setup.protectedPoolTitle'));
      return;
    }
    const isExistingDbItem = Boolean(
      (matchedCat?.id && !matchedCat.id.startsWith('temp-')) ||
        (matchedGoal?.id && !matchedGoal.id.startsWith('g-'))
    );
    if (isRerun && isExistingDbItem) {
      showMobileConfirm({
        title: t('setup.confirmArchiveEnvelopeTitle'),
        message: t('setup.confirmArchiveEnvelopeDesc', { name }),
        confirmText: t('common.remove'),
        isDestructive: true,
        onConfirm: () => executeRemoveCategory(name),
      });
      return;
    }
    executeRemoveCategory(name);
  };

  const handleOpenEditCategory = (cat: EstimatedCategoryItem) => {
    const rawFreq =
      categoryFrequencies[cat.name] ||
      (cat.budgetFrequency === 'ANNUALLY' ? 'YEARLY' : cat.budgetFrequency) ||
      'MONTHLY';
    const displayAmt =
      cat.type === 'GOAL'
        ? cat.enteredAmount ?? cat.targetAmount ?? cat.monthlyAud
        : convertFromMonthly(
            cat.monthlyAud,
            rawFreq as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
          );
    const budgetFreq = rawFreq === 'YEARLY' ? 'ANNUALLY' : rawFreq;
    setEnvelopeToEditDraft({
      id: cat.id || `temp-${cat.name}`,
      name: cat.name,
      type: cat.type,
      envelopeType: cat.envelopeType || (cat.type === 'EVERYDAY' ? 'EVERYDAY' : cat.type === 'GOAL' ? 'GOAL' : 'BILL'),
      fundingMode: cat.fundingMode || (cat.type === 'EVERYDAY' || cat.type === 'GOAL' ? 'TARGET_BALANCE' : 'RECURRING'),
      isPriority: cat.isPriority ?? true,
      isSurplusTarget: cat.isSurplusTarget ?? false,
      bankAccountId: cat.bankAccountId || bankAccounts[0]?.id,
      safetyBufferFloor: cat.safetyBufferFloor !== undefined ? String(cat.safetyBufferFloor) : '0.00',
      monthlyAmount: String(cat.monthlyAud || '0'),
      enteredAmount: String(displayAmt || '0'),
      targetAmount: String(cat.targetAmount ?? displayAmt ?? '0'),
      budgetFrequency: budgetFreq,
      startDate: cat.startDate,
      endDate: cat.endDate,
      rrule: cat.rrule,
      hasScheduledEvents: cat.generateEvents ?? true,
    });
    setShowAddEnvelopeModal(true);
  };

  const handleSaveEnvelopeDraft = (draft: EnvelopeDraftPayload) => {
    const oldName = envelopeToEditDraft?.name;
    if (oldName && oldName.trim().toLowerCase() !== draft.name.trim().toLowerCase()) {
      setRemovedCategoryNames((prev) => new Set(prev).add(oldName));
    }
    if (draft.isSurplusTarget) {
      setGoals((prev) => prev.map((g) => ({ ...g, isSurplusTarget: false })));
      setCustomCategories((prev) => prev.map((c) => ({ ...c, isSurplusTarget: false })));
    }
    const num = parseFloat(draft.monthlyAmount || draft.targetAmount || '0') || 0;
    if (draft.type === 'GOAL') {
      const id = envelopeToEditDraft?.id && !envelopeToEditDraft.id.startsWith('temp-') ? envelopeToEditDraft.id : `g-${Date.now()}`;
      const targetVal = parseFloat(draft.targetAmount || draft.enteredAmount || String(num)) || 0;
      const enteredVal = parseFloat(draft.enteredAmount || draft.targetAmount || String(num)) || 0;
      let goalMonthly = num;
      if (draft.fundingMode === 'TARGET_BALANCE' && !draft.monthlyAmount) {
        const now = new Date();
        const target = draft.endDate ? new Date(draft.endDate) : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        const months = Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
        goalMonthly = Math.round(targetVal / months);
      }
      setGoals((prev) => {
        const existing = prev.filter(
          (g) =>
            g.id !== id &&
            g.name.trim().toLowerCase() !== draft.name.trim().toLowerCase() &&
            (!oldName || g.name.trim().toLowerCase() !== oldName.trim().toLowerCase())
        );
        return [
          ...existing,
          {
            id,
            name: draft.name,
            targetAmount: targetVal,
            enteredAmount: enteredVal,
            dueDate: draft.fundingMode === 'RECURRING' ? null : draft.endDate || null,
            fundingMode: draft.fundingMode || 'TARGET_BALANCE',
            isPriority: draft.isPriority ?? true,
            isSurplusTarget: draft.isSurplusTarget ?? false,
            bankAccountId: draft.bankAccountId,
            monthlyAmount: goalMonthly,
            budgetFrequency: draft.budgetFrequency || 'MONTHLY',
            startDate: draft.startDate,
            rrule: draft.rrule,
            icon: 'target',
          },
        ];
      });
      setRemovedCategoryNames((prev) => {
        const next = new Set(prev);
        next.delete(draft.name);
        return next;
      });
    } else {
      const existingId = envelopeToEditDraft?.id && !envelopeToEditDraft.id.startsWith('temp-') ? envelopeToEditDraft.id : undefined;
      const updatedMonthly = draft.type === 'EVERYDAY' ? (parseFloat(envelopeToEditDraft?.monthlyAmount || '0') || num) : num;
      setCustomCategories((prev) => {
        const existing = prev.filter(
          (c) =>
            (!existingId || c.id !== existingId) &&
            c.name.trim().toLowerCase() !== draft.name.trim().toLowerCase() &&
            (!oldName || c.name.trim().toLowerCase() !== oldName.trim().toLowerCase())
        );
        return [
          ...existing,
          {
            id: existingId,
            name: draft.name,
            type: draft.envelopeType,
            envelopeType: draft.envelopeType,
            fundingMode: draft.fundingMode,
            isPriority: draft.isPriority ?? true,
            isSurplusTarget: draft.isSurplusTarget ?? false,
            bankAccountId: draft.bankAccountId,
            safetyBufferFloor: draft.safetyBufferFloor ? parseFloat(draft.safetyBufferFloor) : 0,
            enteredAmount: draft.enteredAmount ? parseFloat(draft.enteredAmount) : updatedMonthly,
            targetAmount: draft.targetAmount ? parseFloat(draft.targetAmount) : null,
            monthlyAud: updatedMonthly,
            startDate: draft.startDate,
            endDate: draft.endDate,
            rrule: draft.rrule,
            budgetFrequency: draft.budgetFrequency,
            generateEvents: draft.generateEvents,
            icon: draft.type === 'BILL' ? '📌' : '🛒',
          },
        ];
      });
      setRemovedCategoryNames((prev) => {
        const next = new Set(prev);
        next.delete(draft.name);
        return next;
      });
      if (draft.budgetFrequency) {
        setCategoryFrequencies((prev) => ({
          ...prev,
          [draft.name]:
            draft.budgetFrequency === 'ANNUALLY'
              ? 'YEARLY'
              : (draft.budgetFrequency as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY'),
        }));
      }
      if (draft.type !== 'EVERYDAY') {
        setAmountOverrides((prev) => ({
          ...prev,
          [draft.name]: updatedMonthly,
        }));
      }
      if (draft.fundingMode) {
        setBillTypeOverrides((prev) => ({
          ...prev,
          [draft.name]: draft.fundingMode || 'RECURRING',
        }));
      }
    }
    setShowAddEnvelopeModal(false);
    setEnvelopeToEditDraft(null);
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
        <Text style={styles.title}>{t('setup.reviewSummary.title')}</Text>
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>{t('setup.reviewSummary.monthlyNetIncome')}</Text>
          <Text style={styles.summaryCardVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {formatMobileCurrency(estimation.totalMonthlyIncomeAud)}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardLabel}>{t('setup.reviewSummary.totalAllocated')}</Text>
          <Text style={styles.summaryCardVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {formatMobileCurrency(totalAllocatedMonthly)}
          </Text>
        </View>
        <View style={[styles.summaryCard, netSurplus >= 0 ? styles.surplusBg : styles.deficitBg]}>
          <Text style={styles.summaryCardLabel}>
            {netSurplus >= 0
              ? t('setup.reviewSummary.estimatedMonthlyExtra')
              : t('setup.reviewSummary.estimatedMonthlyShortfall')}
          </Text>
          <Text style={styles.summaryCardVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {formatMobileCurrency(Math.abs(netSurplus))}
          </Text>
        </View>
      </View>

      {/* Accordion 1: Everyday Spending Envelope */}
      <View style={styles.sectionCard}>
        <TouchableOpacity
          onPress={() => setEverydayOpen((prev) => !prev)}
          style={styles.sectionHeader}
          activeOpacity={0.7}
        >
          <View style={styles.rowCenterGap6}>
            <Text style={styles.sectionTitle}>{t('setup.reviewSummary.everydaySpending')}</Text>
            <Text style={styles.countText}>({activeEveryday.length})</Text>
            <InfoTooltip
              title={t('setup.reviewSummary.everydayTooltipTitle')}
              content={t('setup.reviewSummary.everydayTooltipContent')}
            />
          </View>
          <View style={styles.rowCenterGap8}>
            <Text style={styles.sectionTotal}>{formatMobileCurrency(totalEverydayMonthly)} {t('setup.freqSuffixMo')}</Text>
            <Text style={styles.countText}>{everydayOpen ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>
        {everydayOpen && activeEveryday.map((cat) => (
          <SetupCategoryRow
            key={cat.name}
            cat={cat}
            freq={categoryFrequencies[cat.name] || 'MONTHLY'}
            isLastEveryday={activeEveryday.length <= 1}
            onUpdateAmount={(amt) => setAmountOverrides((prev) => ({ ...prev, [cat.name]: amt }))}
            onUpdateFreq={(f) => setCategoryFrequencies((prev) => ({ ...prev, [cat.name]: f }))}
            onEditCategory={() => handleOpenEditCategory(cat)}
            onRemove={() => handleAttemptRemoveCategory(cat.name)}
          />
        ))}
      </View>

      {/* Accordion 2: Regular & Flexible Bills */}
      <View style={styles.sectionCard}>
        <TouchableOpacity
          onPress={() => setBillsOpen((prev) => !prev)}
          style={styles.sectionHeader}
          activeOpacity={0.7}
        >
          <View style={styles.rowCenterGap6}>
            <Text style={styles.sectionTitle}>{t('setup.reviewSummary.regularBills')}</Text>
            <Text style={styles.countText}>({activeRegular.length})</Text>
            <InfoTooltip
              title={t('setup.reviewSummary.billsTooltipTitle')}
              content={t('setup.reviewSummary.billsTooltipContent')}
            />
          </View>
          <View style={styles.rowCenterGap8}>
            <Text style={styles.sectionTotal}>{formatMobileCurrency(totalRegularMonthly)} {t('setup.freqSuffixMo')}</Text>
            <Text style={styles.countText}>{billsOpen ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>
        {billsOpen && activeRegular.map((cat) => (
          <SetupCategoryRow
            key={cat.name}
            cat={cat}
            freq={categoryFrequencies[cat.name] || 'MONTHLY'}
            onUpdateAmount={(amt) => setAmountOverrides((prev) => ({ ...prev, [cat.name]: amt }))}
            onUpdateFreq={(f) => setCategoryFrequencies((prev) => ({ ...prev, [cat.name]: f }))}
            onToggleBillType={(newType) => setBillTypeOverrides((prev) => ({ ...prev, [cat.name]: newType }))}
            onEditCategory={() => handleOpenEditCategory(cat)}
            onRemove={() => handleAttemptRemoveCategory(cat.name)}
          />
        ))}
      </View>

      {/* Accordion 3: Goals & Savings */}
      <View style={styles.sectionCard}>
        <TouchableOpacity
          onPress={() => setGoalsOpen((prev) => !prev)}
          style={styles.sectionHeader}
          activeOpacity={0.7}
        >
          <View style={styles.rowCenterGap6}>
            <Text style={styles.sectionTitle}>{t('setup.reviewSummary.savingsGoals')}</Text>
            <Text style={styles.countText}>({activeGoals.length})</Text>
            <InfoTooltip
              title={t('setup.reviewSummary.goalsTooltipTitle')}
              content={t('setup.reviewSummary.goalsTooltipContent')}
            />
          </View>
          <View style={styles.rowCenterGap8}>
            <Text style={styles.sectionTotal}>{formatMobileCurrency(totalGoalMonthly)} {t('setup.freqSuffixMo')}</Text>
            <Text style={styles.countText}>{goalsOpen ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>
        {goalsOpen && (
          <SetupCategoriesGoalsList
            goals={activeGoals}
            userGoals={goals}
            totalGoalMonthly={totalGoalMonthly}
            onRemove={handleAttemptRemoveCategory}
            onEditGoal={handleOpenEditCategory}
          />
        )}
      </View>

      <TouchableOpacity
        onPress={() => {
          setEnvelopeToEditDraft(null);
          setShowAddEnvelopeModal(true);
        }}
        style={styles.addEnvelopeBtn}
      >
        <Text style={styles.addEnvelopeBtnText}>{t('setup.reviewSummary.addEnvelopeBtn')}</Text>
      </TouchableOpacity>

      {!isRerun && (
        <TouchableOpacity
          onPress={() => setShowSandboxModal(true)}
          style={styles.sandboxBtn}
        >
          <Text style={styles.sandboxBtnText}>{t('setup.complete.simulateFirstPayday')}</Text>
        </TouchableOpacity>
      )}

      <EnvelopeFormModal
        visible={showAddEnvelopeModal}
        onClose={() => {
          setShowAddEnvelopeModal(false);
          setEnvelopeToEditDraft(null);
        }}
        categoryToEdit={envelopeToEditDraft}
        bankAccounts={bankAccounts}
        onSaveDraft={handleSaveEnvelopeDraft}
      />

      <MobilePaydaySandboxModal
        visible={showSandboxModal}
        onClose={() => setShowSandboxModal(false)}
        incomes={incomes}
        bankAccounts={bankAccounts}
        activeEveryday={activeEveryday}
        activeRegular={activeRegular}
        activeGoals={activeGoals}
        goals={goals}
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
  summaryCardVal: { fontSize: 15, fontWeight: '800', color: DESIGN_TOKENS.colors.primary, marginTop: 2, fontFamily: 'monospace' },
  surplusBg: { backgroundColor: DESIGN_TOKENS.colors.successLight, borderColor: DESIGN_TOKENS.colors.successBorder },
  deficitBg: { backgroundColor: DESIGN_TOKENS.colors.criticalLight, borderColor: DESIGN_TOKENS.colors.criticalBorder },
  sectionCard: { backgroundColor: DESIGN_TOKENS.colors.surface, padding: 14, borderRadius: DESIGN_TOKENS.radius.lg, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200], marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: DESIGN_TOKENS.colors.slate[100], paddingBottom: 8, marginBottom: 4 },
  rowCenterGap6: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowCenterGap8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countText: { fontSize: 12, color: DESIGN_TOKENS.colors.slate[400], fontWeight: '700' },
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
    marginBottom: 12,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
  },
  addEnvelopeBtnText: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.accent },
  sandboxBtn: {
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: DESIGN_TOKENS.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: DESIGN_TOKENS.colors.surface,
  },
  sandboxBtnText: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.accent },
  backBtn: { flex: 1, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.surface, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[300], borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  backBtnText: { fontSize: 14, fontWeight: '700', color: DESIGN_TOKENS.colors.slate[600] },
  nextBtn: { flex: 2, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.accent, borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  nextBtnText: { fontSize: 14, fontWeight: '800', color: DESIGN_TOKENS.colors.onAccent },
});
