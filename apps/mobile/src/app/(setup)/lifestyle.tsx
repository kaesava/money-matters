import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, showMobileConfirm, InfoTooltip, AmountInput } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { useSetupWizard } from '../../context/SetupWizardContext';
import { HousingType } from '@money-matters/types';
import { LifestyleVehicleSubCard } from '../../components/setup/LifestyleVehicleSubCard';
import { LifestyleChildSubCard } from '../../components/setup/LifestyleChildSubCard';

const HOUSING_OPTIONS: { id: HousingType; label: string }[] = [
  { id: 'RENT_SOLO', label: 'Rent (Solo)' },
  { id: 'RENT_SHARE', label: 'Sharehouse' },
  { id: 'OWN_MORTGAGE', label: 'Mortgage' },
  { id: 'OWN_OUTRIGHT', label: 'Outright' },
];

export default function SetupLifestyleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const updatePref = trpc.updateUserPreferences.useMutation();
  const {
    housingType, setHousingType, hasCars, setHasCars, vehicles, setVehicles,
    hasKids, setHasKids, children, setChildren, hasPrivateHealth, setHasPrivateHealth,
    hasDebt, setHasDebt, debtMonthlyRepayment, setDebtMonthlyRepayment, hasPets, setHasPets,
    weeklyGroceries, weeklyDining, weeklyPersonal,
  } = useSetupWizard();

  const handleSkip = () => {
    showMobileConfirm({
      title: t('setup.skipConfirmTitle'),
      message: t('setup.skipConfirmMessage'),
      confirmText: t('setup.skipConfirmButton'),
      onConfirm: async () => {
        try {
          await updatePref.mutateAsync({ setupCompleted: true });
        } catch {
          // Ignore
        }
        router.replace('/(app)/home');
      },
    });
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: Math.max(insets.top + 16, 20), paddingBottom: Math.max(insets.bottom + 20, 20) },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topNavRow}>
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
        </View>
        <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.skipBtnText}>{t('setup.skipForNow')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.stepLabel}>{t('setup.stepOf', { step: 4, total: 5 })}</Text>
      <View style={styles.titleRow}>
        <Text style={styles.title}>🏡 Lifestyle Setup</Text>
        <InfoTooltip title="Australian Benchmarks" content="We calculate initial estimates based on ABS benchmarks." />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Housing Setup</Text>
        <View style={styles.chipGrid}>
          {HOUSING_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.chip, housingType === opt.id && styles.chipActive]}
              onPress={() => setHousingType(opt.id)}
            >
              <Text style={[styles.chipText, housingType === opt.id && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>🚗 Vehicles</Text>
          <TouchableOpacity onPress={() => setHasCars(!hasCars)}>
            <Text style={styles.toggleText}>{hasCars ? '✓ Own Vehicles' : 'No Vehicle'}</Text>
          </TouchableOpacity>
        </View>
        {hasCars && (
          <View style={{ marginTop: 8 }}>
            {vehicles.map((v, i) => (
              <LifestyleVehicleSubCard
                key={v.id}
                vehicle={v}
                index={i}
                showRemove={vehicles.length > 1}
                onUpdate={(id, f, val) => setVehicles(prev => prev.map(veh => veh.id === id ? { ...veh, [f]: val } : veh))}
                onRemove={(id) => setVehicles(prev => prev.filter(veh => veh.id !== id))}
              />
            ))}
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setVehicles(prev => [...prev, { id: `veh-${Date.now()}`, name: `Car ${prev.length + 1}`, size: 'MID_SUV' }])}
            >
              <Text style={styles.addBtnText}>+ Add Vehicle</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>👨‍👩‍👧 Dependents / Kids</Text>
          <TouchableOpacity onPress={() => setHasKids(!hasKids)}>
            <Text style={styles.toggleText}>{hasKids ? '✓ Have Kids' : 'No Kids'}</Text>
          </TouchableOpacity>
        </View>
        {hasKids && (
          <View style={{ marginTop: 8 }}>
            {children.map((c, i) => (
              <LifestyleChildSubCard
                key={c.id}
                child={c}
                index={i}
                showRemove={children.length > 1}
                onUpdate={(id, f, val) => setChildren(prev => prev.map(ch => ch.id === id ? { ...ch, [f]: val } : ch))}
                onRemove={(id) => setChildren(prev => prev.filter(ch => ch.id !== id))}
              />
            ))}
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setChildren(prev => [...prev, { id: `child-${Date.now()}`, name: `Child ${prev.length + 1}`, stage: 'PRIMARY', type: 'PUBLIC' }])}
            >
              <Text style={styles.addBtnText}>+ Add Child</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Healthcare & Pets</Text>
        <View style={styles.rowWrap}>
          <TouchableOpacity
            style={[styles.chip, hasPrivateHealth && styles.chipActive]}
            onPress={() => setHasPrivateHealth(!hasPrivateHealth)}
          >
            <Text style={[styles.chipText, hasPrivateHealth && styles.chipTextActive]}>
              {hasPrivateHealth ? '✓ Private Health' : 'Private Health'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, hasPets && styles.chipActive]}
            onPress={() => setHasPets(!hasPets)}
          >
            <Text style={[styles.chipText, hasPets && styles.chipTextActive]}>
              {hasPets ? '✓ Have Pets' : 'Pets'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>💳 Active Debt Repayments</Text>
          <TouchableOpacity onPress={() => setHasDebt(!hasDebt)}>
            <Text style={styles.toggleText}>{hasDebt ? '✓ Have Debt' : 'None'}</Text>
          </TouchableOpacity>
        </View>
        {hasDebt && (
          <View style={{ marginTop: 8 }}>
            <AmountInput
              value={debtMonthlyRepayment ? String(debtMonthlyRepayment) : ''}
              onChangeText={(v) => setDebtMonthlyRepayment(parseFloat(v) || 0)}
              placeholder="Monthly repayment amount"
            />
          </View>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Weekly Discretionary Spending</Text>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>🛒 Groceries</Text>
          <Text style={styles.budgetValue}>${weeklyGroceries}/wk</Text>
        </View>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>☕ Dining & Fun</Text>
          <Text style={styles.budgetValue}>${weeklyDining}/wk</Text>
        </View>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>🛍️ Personal Buffer</Text>
          <Text style={styles.budgetValue}>${weeklyPersonal}/wk</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('setup.previousStep')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(setup)/categories')} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>{t('common.next')} →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: DESIGN_TOKENS.colors.background, flexGrow: 1 },
  topNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  progressRow: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 24, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0' },
  progressDotActive: { backgroundColor: DESIGN_TOKENS.colors.accent },
  skipBtnText: { fontSize: 13, fontWeight: '600', color: DESIGN_TOKENS.colors.textMuted },
  stepLabel: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', color: DESIGN_TOKENS.colors.primary },
  sectionCard: { backgroundColor: DESIGN_TOKENS.colors.surface, padding: 14, borderRadius: DESIGN_TOKENS.radius.lg, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: DESIGN_TOKENS.colors.primary, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleText: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: DESIGN_TOKENS.radius.full, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: DESIGN_TOKENS.colors.surfaceVariant },
  chipActive: { backgroundColor: DESIGN_TOKENS.colors.accent, borderColor: DESIGN_TOKENS.colors.accent },
  chipText: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted },
  chipTextActive: { color: DESIGN_TOKENS.colors.onAccent, fontWeight: '600' },
  addBtn: { borderWidth: 1, borderColor: DESIGN_TOKENS.colors.accent, borderStyle: 'dashed', borderRadius: DESIGN_TOKENS.radius.md, paddingVertical: 8, alignItems: 'center', marginTop: 4 },
  addBtnText: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent },
  budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  budgetLabel: { fontSize: 13, color: DESIGN_TOKENS.colors.textPrimary },
  budgetValue: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.accent },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 40 },
  backBtn: { flex: 1, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.surface, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  backBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  nextBtn: { flex: 2, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.accent, borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  nextBtnText: { fontSize: 14, fontWeight: '800', color: DESIGN_TOKENS.colors.onAccent },
});
