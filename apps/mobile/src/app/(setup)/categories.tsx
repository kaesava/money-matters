import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, showMobileConfirm, InfoTooltip, useMobileToast } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { useSetupWizard } from '../../context/SetupWizardContext';
import { SetupCategoryRow } from '../../components/setup/SetupCategoryRow';

export default function SetupCategoriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useMobileToast();
  const {
    incomes, goals, activeCategories, activeEveryday, activeRegular,
    categoryFrequencies, setCategoryFrequencies, setAmountOverrides,
    setRemovedCategoryNames, setCustomCategories,
    totalAllocatedMonthly, totalEverydayMonthly, totalRegularMonthly,
    estimation,
  } = useSetupWizard();

  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('100');
  const [autoCreateExpenseSchedules, setAutoCreateExpenseSchedules] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bankAccountsQuery = trpc.getBankAccountsWithMappings.useQuery();
  const poolsQuery = trpc.listPools.useQuery();
  const saveSetupBudgetMut = trpc.saveSetupBudget.useMutation();

  const netSurplus = estimation.totalMonthlyIncomeAud - totalAllocatedMonthly;

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const amt = parseFloat(customAmount) || 0;
    setCustomCategories((prev) => [
      ...prev,
      { name: customName.trim(), type: 'REGULAR', monthlyAud: amt, icon: '📌' },
    ]);
    setCustomName('');
    setCustomAmount('100');
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const existingPools = poolsQuery.data || [];
      const existingEveryday = existingPools.find((p) => p.poolType === 'EVERYDAY');
      const existingRegular = existingPools.find((p) => p.poolType === 'REGULAR');
      const accountsPayload = (bankAccountsQuery.data || []).map((acc) => ({
        id: acc.id,
        name: acc.name,
        bankProvider: acc.bankProvider || 'CBA',
        lastKnownBalance: String(acc.lastKnownBalance || '0.00'),
        unbudgetedBuffer: String(acc.unbudgetedBuffer || '0.00'),
        isPrivate: Boolean(acc.isPrivate),
      }));

      const poolsPayload = [
        { id: existingEveryday?.id, name: existingEveryday?.name || 'Everyday Spending', poolType: 'EVERYDAY' as const, everydayAllowanceAmount: (totalEverydayMonthly || 1000).toFixed(2), isSurplusTarget: false, isCommitted: false, isPrivate: false },
        { id: existingRegular?.id, name: existingRegular?.name || 'Regular Bills', poolType: 'REGULAR' as const, isSurplusTarget: false, isCommitted: false, isPrivate: false },
        ...goals.map((g, idx) => ({ id: g.id?.startsWith('g-') ? undefined : g.id, name: g.name, poolType: 'GOAL' as const, targetAmount: (g.targetAmount || g.monthlyAmount * 12 || 1000).toFixed(2), targetDate: g.dueDate || null, isSurplusTarget: idx === 0, isCommitted: true, isPrivate: false })),
      ];

      const categoriesPayload = activeCategories.map((c) => {
        const rawFreq = categoryFrequencies[c.name];
        const budgetFreq: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY' =
          rawFreq === 'YEARLY' ? 'ANNUALLY' : 'MONTHLY';
        const catId = 'id' in c && typeof c.id === 'string' && !c.id.startsWith('temp-') ? c.id : undefined;
        return {
          id: catId,
          name: c.name,
          poolType: c.type,
          monthlyAmount: (c.monthlyAud || 0).toFixed(2),
          enteredAmount: (c.monthlyAud || 0).toFixed(2),
          budgetFrequency: budgetFreq,
          icon: c.icon || 'wallet',
          isEssential: c.type === 'REGULAR',
        };
      });

      const incomesPayload = incomes.map((inc) => ({
        id: inc.id?.startsWith('inc-') ? undefined : inc.id,
        name: inc.name,
        type: 'SALARY' as const,
        amount: (inc.amount || 0).toFixed(2),
        frequency: inc.frequency as any,
        receivingAccountId: inc.receivingAccountId || null,
      }));

      await saveSetupBudgetMut.mutateAsync({
        incomes: incomesPayload,
        bankAccounts: accountsPayload.length > 0 ? accountsPayload : [
          { name: 'Primary Account', bankProvider: 'CBA', lastKnownBalance: '1000.00', unbudgetedBuffer: '0.00', isPrivate: false },
        ],
        pools: poolsPayload,
        categories: categoriesPayload,
        archivedPools: [],
        archivedCategoryIds: [],
        archetypeApplied: accountsPayload.length >= 2 ? 'AUSSIE_2_ACCOUNT' : 'ALL_IN_ONE_CUSTOM',
        autoCreateExpenseSchedules,
      });

      router.replace('/(setup)/complete');
    } catch {
      toast.error("Couldn't save setup. Please try again.", 'Setup Error');
    } finally {
      setIsSubmitting(false);
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
      <Text style={styles.stepLabel}>{t('setup.stepOf', { step: 5, total: 5 })}</Text>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('setup.reviewSummaryTitle')}</Text>
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
            onRemove={() => setRemovedCategoryNames((prev) => new Set(prev).add(cat.name))}
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
            <Text style={styles.toggleHelp}>{t('setup.autoScheduleBillsHelp')}</Text>
          </View>
        </TouchableOpacity>
        {activeRegular.map((cat) => (
          <SetupCategoryRow
            key={cat.name}
            cat={cat}
            freq={categoryFrequencies[cat.name] || 'MONTHLY'}
            onUpdateAmount={(amt) => setAmountOverrides((prev) => ({ ...prev, [cat.name]: amt }))}
            onUpdateFreq={(f) => setCategoryFrequencies((prev) => ({ ...prev, [cat.name]: f }))}
            onRemove={() => setRemovedCategoryNames((prev) => new Set(prev).add(cat.name))}
          />
        ))}
      </View>

      <View style={styles.customBox}>
        <Text style={styles.customHeading}>{t('setup.addCustomCategory')}</Text>
        <View style={styles.customRow}>
          <TextInput
            style={styles.customInput}
            value={customName}
            onChangeText={setCustomName}
            placeholder={t('setup.addCustomCategoryPlaceholder')}
            placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
          />
          <TouchableOpacity
            style={[styles.addBtn, !customName.trim() && { opacity: 0.5 }]}
            onPress={handleAddCustom}
            disabled={!customName.trim()}
          >
            <Text style={styles.addBtnText}>{t('setup.addCustomCategoryBtn')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('setup.previousStep')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleFinish} style={styles.nextBtn} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={DESIGN_TOKENS.colors.onAccent} size="small" />
          ) : (
            <Text style={styles.nextBtnText}>{t('setup.finish.cta')}</Text>
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
  title: { fontSize: 20, fontWeight: '900', color: DESIGN_TOKENS.colors.primary },
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
  customBox: { backgroundColor: DESIGN_TOKENS.colors.surface, padding: 12, borderRadius: DESIGN_TOKENS.radius.lg, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200], marginBottom: 20 },
  customHeading: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.primary, marginBottom: 8 },
  customRow: { flexDirection: 'row', gap: 8 },
  customInput: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.surfaceVariant, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200], borderRadius: DESIGN_TOKENS.radius.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: DESIGN_TOKENS.colors.textPrimary },
  addBtn: { backgroundColor: DESIGN_TOKENS.colors.accent, paddingHorizontal: 16, justifyContent: 'center', borderRadius: DESIGN_TOKENS.radius.md },
  addBtnText: { color: DESIGN_TOKENS.colors.onAccent, fontWeight: '700', fontSize: 12 },
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
