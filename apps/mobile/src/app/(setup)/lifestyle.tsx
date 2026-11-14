import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, InfoTooltip, AmountInput, MobileDiscretionarySliders } from '@money-matters/ui/mobile';
import { useSetupWizard } from '../../context/SetupWizardContext';
import { HousingType } from '@money-matters/types';
import { LifestyleVehicleSubCard } from '../../components/setup/LifestyleVehicleSubCard';
import { LifestyleChildSubCard } from '../../components/setup/LifestyleChildSubCard';
import { SetupProgressBar } from '../../components/setup/SetupProgressBar';

export default function SetupLifestyleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    isRerun,
    totalSteps,
    country,
    housingType,
    setHousingType,
    hasCars,
    setHasCars,
    vehicles,
    setVehicles,
    usePublicTransport,
    setUsePublicTransport,
    useRideshare,
    setUseRideshare,
    hasKids,
    setHasKids,
    children,
    setChildren,
    hasPrivateHealth,
    setHasPrivateHealth,
    hasGym,
    setHasGym,
    hasMedicalOutofPocket,
    setHasMedicalOutofPocket,
    hasDebt,
    setHasDebt,
    debtMonthlyRepayment,
    setDebtMonthlyRepayment,
    hasPets,
    setHasPets,
    petsCount,
    setPetsCount,
    hasCharityGiving,
    setHasCharityGiving,
    charityMonthlyAmount,
    setCharityMonthlyAmount,
    weeklyGroceries,
    setWeeklyGroceries,
    weeklyDining,
    setWeeklyDining,
    weeklyPersonal,
    setWeeklyPersonal,
    totalRegularMonthly,
    totalEverydayMonthly,
  } = useSetupWizard();

  const housingOptions: { id: HousingType; label: string }[] = [
    { id: 'RENT_SOLO', label: t('setup.lifestyle.housingSolo') },
    { id: 'RENT_SHARE', label: t('setup.lifestyle.housingShare') },
    { id: 'OWN_MORTGAGE', label: t('setup.lifestyle.housingMortgage') },
    { id: 'OWN_OUTRIGHT', label: t('setup.lifestyle.housingOutright') },
  ];

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: Math.max(insets.top + 16, 20), paddingBottom: Math.max(insets.bottom + 20, 20) },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <SetupProgressBar currentStep={4} totalSteps={totalSteps} isRerun={isRerun} />

      <Text style={styles.stepLabel}>{t('setup.stepOf', { step: 4, total: totalSteps })}</Text>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('setup.lifestyle.title')}</Text>
        {country === 'AU' && (
          <InfoTooltip title={t('setup.lifestyle.benchmarksTitle')} content={t('setup.lifestyle.benchmarksContent')} />
        )}
      </View>

      <View style={styles.liveEstimatesCard}>
        <Text style={styles.liveEstimatesText}>
          📊 {t('setup.lifestyle.liveEstimates', { bills: Math.round(totalRegularMonthly), everyday: Math.round(totalEverydayMonthly) })}
        </Text>
      </View>

      {/* Housing */}
      <View style={styles.sectionCard}>
        <View style={styles.rowWithGap}>
          <Text style={styles.sectionTitle}>{t('setup.lifestyle.housingTitle')}</Text>
          <InfoTooltip
            title={t('setup.lifestyle.housingTooltipTitle')}
            content={t('setup.lifestyle.housingTooltipContent')}
          />
        </View>
        <View style={styles.chipGrid}>
          {housingOptions.map((opt) => (
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

      {/* Transport & Vehicles */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('setup.lifestyle.vehiclesTitle')}</Text>
        <View style={styles.rowWrap}>
          <TouchableOpacity
            style={[styles.chip, hasCars && styles.chipActive]}
            onPress={() => setHasCars(!hasCars)}
          >
            <Text style={[styles.chipText, hasCars && styles.chipTextActive]}>
              {t('setup.lifestyle.ownVehicles')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, usePublicTransport && styles.chipActive]}
            onPress={() => setUsePublicTransport(!usePublicTransport)}
          >
            <Text style={[styles.chipText, usePublicTransport && styles.chipTextActive]}>
              {t('setup.lifestyle.publicTransport')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, useRideshare && styles.chipActive]}
            onPress={() => setUseRideshare(!useRideshare)}
          >
            <Text style={[styles.chipText, useRideshare && styles.chipTextActive]}>
              {t('setup.lifestyle.rideshareTaxi')}
            </Text>
          </TouchableOpacity>
        </View>
        {hasCars && (
          <View style={styles.marginTop8}>
            {vehicles.map((v, i) => (
              <LifestyleVehicleSubCard
                key={v.id}
                vehicle={v}
                index={i}
                showRemove={vehicles.length > 1}
                onUpdate={(id, f, val) => setVehicles((prev) => prev.map((veh) => (veh.id === id ? { ...veh, [f]: val } : veh)))}
                onRemove={(id) => setVehicles((prev) => prev.filter((veh) => veh.id !== id))}
              />
            ))}
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setVehicles((prev) => [...prev, { id: `veh-${Date.now()}`, name: `Vehicle ${prev.length + 1}`, size: 'MID_SUV' }])}
            >
              <Text style={styles.addBtnText}>+ {t('setup.lifestyle.addVehicle')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Dependents */}
      <View style={styles.sectionCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>{t('setup.lifestyle.dependentsTitle')}</Text>
          <TouchableOpacity onPress={() => setHasKids(!hasKids)}>
            <Text style={styles.toggleText}>{hasKids ? t('setup.lifestyle.haveKids') : t('setup.lifestyle.noKids')}</Text>
          </TouchableOpacity>
        </View>
        {hasKids && (
          <View style={styles.marginTop8}>
            {children.map((c, i) => (
              <LifestyleChildSubCard
                key={c.id}
                child={c}
                index={i}
                showRemove={children.length > 1}
                onUpdate={(id, f, val) => setChildren((prev) => prev.map((ch) => (ch.id === id ? { ...ch, [f]: val } : ch)))}
                onRemove={(id) => setChildren((prev) => prev.filter((ch) => ch.id !== id))}
              />
            ))}
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setChildren((prev) => [...prev, { id: `child-${Date.now()}`, name: `Child ${prev.length + 1}`, stage: 'PRIMARY', type: 'PUBLIC' }])}
            >
              <Text style={styles.addBtnText}>+ {t('setup.lifestyle.addChild')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Health, Fitness & Medical */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('setup.lifestyle.healthcarePetsTitle')}</Text>
        <View style={styles.rowWrap}>
          <TouchableOpacity
            style={[styles.chip, hasPrivateHealth && styles.chipActive]}
            onPress={() => setHasPrivateHealth(!hasPrivateHealth)}
          >
            <Text style={[styles.chipText, hasPrivateHealth && styles.chipTextActive]}>
              {t('setup.lifestyle.privateHealth')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, hasGym && styles.chipActive]}
            onPress={() => setHasGym(!hasGym)}
          >
            <Text style={[styles.chipText, hasGym && styles.chipTextActive]}>
              {t('setup.lifestyle.gym')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, hasMedicalOutofPocket && styles.chipActive]}
            onPress={() => setHasMedicalOutofPocket(!hasMedicalOutofPocket)}
          >
            <Text style={[styles.chipText, hasMedicalOutofPocket && styles.chipTextActive]}>
              {t('setup.lifestyle.medicalOutofPocket')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Debt, Pets & Charity */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('setup.lifestyle.debtTitle')}</Text>
        <View style={styles.rowWrap}>
          <TouchableOpacity
            style={[styles.chip, hasDebt && styles.chipActive]}
            onPress={() => setHasDebt(!hasDebt)}
          >
            <Text style={[styles.chipText, hasDebt && styles.chipTextActive]}>
              {t('setup.lifestyle.haveDebt')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, hasPets && styles.chipActive]}
            onPress={() => setHasPets(!hasPets)}
          >
            <Text style={[styles.chipText, hasPets && styles.chipTextActive]}>
              {t('setup.lifestyle.pets')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, hasCharityGiving && styles.chipActive]}
            onPress={() => setHasCharityGiving(!hasCharityGiving)}
          >
            <Text style={[styles.chipText, hasCharityGiving && styles.chipTextActive]}>
              {t('setup.lifestyle.charityFamily')}
            </Text>
          </TouchableOpacity>
        </View>

        {hasDebt && (
          <View style={styles.marginTop8}>
            <AmountInput
              value={debtMonthlyRepayment ? String(debtMonthlyRepayment) : ''}
              onChangeText={(v) => setDebtMonthlyRepayment(parseFloat(v) || 0)}
              placeholder={t('setup.lifestyle.debtRepaymentPlaceholder')}
            />
          </View>
        )}

        {hasPets && (
          <View style={[styles.rowWithGap, styles.marginTop8]}>
            <Text style={styles.petCountLabel}>{t('setup.lifestyle.petsCountLabel')}:</Text>
            <TextInput
              style={styles.petCountInput}
              keyboardType="number-pad"
              value={String(petsCount || 1)}
              onChangeText={(v) => setPetsCount(Math.max(1, Math.min(10, parseInt(v, 10) || 1)))}
            />
          </View>
        )}

        {hasCharityGiving && (
          <View style={styles.marginTop8}>
            <AmountInput
              value={charityMonthlyAmount ? String(charityMonthlyAmount) : ''}
              onChangeText={(v) => setCharityMonthlyAmount(parseFloat(v) || 0)}
              placeholder={t('setup.lifestyle.charityAmountPlaceholder')}
            />
          </View>
        )}
      </View>

      <MobileDiscretionarySliders
        weeklyGroceries={weeklyGroceries}
        setWeeklyGroceries={setWeeklyGroceries}
        weeklyDining={weeklyDining}
        setWeeklyDining={setWeeklyDining}
        weeklyPersonal={weeklyPersonal}
        setWeeklyPersonal={setWeeklyPersonal}
        isZeroBased={country !== 'AU'}
      />

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{t('setup.previousStep')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(setup)/envelopes')} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>{t('common.next')} →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: DESIGN_TOKENS.colors.background, flexGrow: 1 },
  stepLabel: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', color: DESIGN_TOKENS.colors.primary, flex: 1 },
  sectionCard: { backgroundColor: DESIGN_TOKENS.colors.surface, padding: 14, borderRadius: DESIGN_TOKENS.radius.lg, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200], marginBottom: 12 },
  liveEstimatesCard: { backgroundColor: DESIGN_TOKENS.colors.surfaceVariant, padding: 12, borderRadius: DESIGN_TOKENS.radius.md, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.accentBorder, marginBottom: 14 },
  liveEstimatesText: { fontSize: 13, fontWeight: '800', color: DESIGN_TOKENS.colors.primary },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: DESIGN_TOKENS.colors.primary, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowWithGap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleText: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: DESIGN_TOKENS.radius.full, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200], backgroundColor: DESIGN_TOKENS.colors.surfaceVariant },
  chipActive: { backgroundColor: DESIGN_TOKENS.colors.accent, borderColor: DESIGN_TOKENS.colors.accent },
  chipText: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted },
  chipTextActive: { color: DESIGN_TOKENS.colors.onAccent, fontWeight: '600' },
  marginTop8: { marginTop: 8 },
  addBtn: { borderWidth: 1, borderColor: DESIGN_TOKENS.colors.accent, borderStyle: 'dashed', borderRadius: DESIGN_TOKENS.radius.md, paddingVertical: 8, alignItems: 'center', marginTop: 4 },
  addBtnText: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent },
  petCountLabel: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.textPrimary },
  petCountInput: {
    width: 60,
    height: 36,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: DESIGN_TOKENS.radius.md,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
  },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 40 },
  backBtn: { flex: 1, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.surface, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[300], borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  backBtnText: { fontSize: 14, fontWeight: '700', color: DESIGN_TOKENS.colors.slate[600] },
  nextBtn: { flex: 2, paddingVertical: 14, backgroundColor: DESIGN_TOKENS.colors.accent, borderRadius: DESIGN_TOKENS.radius.md, alignItems: 'center' },
  nextBtnText: { fontSize: 14, fontWeight: '800', color: DESIGN_TOKENS.colors.onAccent },
});
