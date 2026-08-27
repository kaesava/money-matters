import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { trpc } from '../../lib/trpc';
import { AUSTRALIAN_FAMILY_PRESETS, SetupPreset } from '@money-matters/types';

export default function SetupCategoriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ incomeName: string; incomeAmount: string; incomeFrequency: string; mode?: string }>();

  // State
  const [selected, setSelected] = useState<Set<string>>(() => {
    const defaults = AUSTRALIAN_FAMILY_PRESETS.filter(p => p.defaultSelected).map(p => p.id);
    return new Set(defaults);
  });
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [customName, setCustomName] = useState('');
  const [customPresets, setCustomPresets] = useState<SetupPreset[]>([]);
  const [excessBucketId, setExcessBucketId] = useState('emergency');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries & Mutations
  const existingCategoriesQuery = trpc.listCategories.useQuery(undefined, { enabled: params.mode === 'rerun' });
  const createIncomeSource = trpc.createIncomeSource.useMutation();
  const createCategory = trpc.createCategory.useMutation();
  const createCategorySchedule = trpc.createCategorySchedule.useMutation();
  const generateEvents = trpc.maintainRollingWindow.useMutation();
  const reSetupBudget = trpc.reSetupBudget.useMutation();

  const allPresets = [...AUSTRALIAN_FAMILY_PRESETS, ...customPresets];

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (excessBucketId === id && next.size > 0) {
        setExcessBucketId(Array.from(next)[0]!);
      }
      return next;
    });
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const id = `custom-${Date.now()}`;
    const newCat: SetupPreset = {
      id,
      name: customName.trim(),
      type: 'REGULAR',
      emoji: '📌',
      suggestedMonthlyAud: 100,
      defaultSelected: false
    };
    setCustomPresets((prev) => [...prev, newCat]);
    setSelected((prev) => new Set([...prev, id]));
    setCustomName('');
  };

  const handleCompleteSetup = async () => {
    setIsSubmitting(true);
    try {
      const isRerun = params.mode === 'rerun';

      if (isRerun) {
        const existingCats = existingCategoriesQuery.data ?? [];
        const selectedList = allPresets.filter((p) => selected.has(p.id));
        const categoriesList = selectedList.map((c) => {
          const targetAmt = parseFloat(targets[c.id] || c.suggestedMonthlyAud.toString()) || 0;
          const matched = existingCats.find((ec) => ec.name.trim().toLowerCase() === c.name.trim().toLowerCase() && ec.type === c.type);
          return {
            id: matched?.id,
            name: c.name,
            type: c.type as "EVERYDAY" | "REGULAR" | "GOAL",
            monthlyAmount: targetAmt,
            targetAmount: targetAmt,
          };
        });

        const totalBillsCap = categoriesList
          .filter((c) => c.type === 'REGULAR')
          .reduce((sum, c) => sum + (c.monthlyAmount || 0), 0);

        Alert.alert(
          "Reconcile & Apply Budget Changes",
          `Your new monthly Bills target cap will be $${totalBillsCap.toLocaleString()}. Changes take effect on your next payday. Continue?`,
          [
            { text: "Keep Editing", style: "cancel", onPress: () => setIsSubmitting(false) },
            {
              text: "Confirm & Reconcile",
              onPress: async () => {
                try {
                  await reSetupBudget.mutateAsync({
                    everydayTargetCap: 2000,
                    billsTargetCap: totalBillsCap,
                    categoriesList,
                  });
                  router.replace('/(app)/home');
                } catch (err) {
                  Alert.alert("Re-setup Failed", "Could not complete budget reconciliation.");
                } finally {
                  setIsSubmitting(false);
                }
              },
            },
          ]
        );
        return;
      } else {
        // 1. Create main income source
        const numericAmount = parseFloat(params.incomeAmount || '0') || 0;
        await createIncomeSource.mutateAsync({
          name: params.incomeName || t('setup.income.defaultName', { defaultValue: 'My Salary' }),
          amount: numericAmount.toFixed(2),
          isRecurring: true,
          startDate: new Date().toISOString().split('T')[0]!,
          frequency: (params.incomeFrequency as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY') || 'FORTNIGHTLY',
        });

        // 2. Save categories & schedule targets in parallel batches
        const selectedList = allPresets.filter((p) => selected.has(p.id));
        const createdCategories = await Promise.all(
          selectedList.map(async (cat) => {
            const targetAmt = targets[cat.id] || allPresets.find((p) => p.id === cat.id)!.suggestedMonthlyAud.toString();
            const created = await createCategory.mutateAsync({
              name: cat.name,
              type: cat.type,
              budgetFrequency: 'MONTHLY',
              enteredAmount: targetAmt,
              monthlyAmount: targetAmt,
            });
            return { presetId: cat.id, createdId: created.id };
          })
        );

        const schedulePromises = createdCategories.map(({ presetId, createdId }) => {
          const targetAmt = targets[presetId] || allPresets.find((p) => p.id === presetId)!.suggestedMonthlyAud.toString();
          if (parseFloat(targetAmt) > 0) {
            return createCategorySchedule.mutateAsync({
              categoryId: createdId,
              targetAmount: parseFloat(targetAmt).toFixed(2),
            });
          }
          return Promise.resolve();
        });
        await Promise.all(schedulePromises);

        // 3. Trigger events burst generator
        await generateEvents.mutateAsync();
      }

      router.replace('/(app)/home');
    } catch (err) {
      Alert.alert("Setup Failed", "We couldn't save your setup values. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.progressRow}>
        <View style={styles.progressDot} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
      </View>
      
      <Text style={styles.stepLabel}>{t('setup.stepOfTwo', { step: 2, total: 2, defaultValue: 'Step 2 of 2' })}</Text>
      <Text style={styles.title}>{t('setup.bills.title', { defaultValue: 'Which bills do you have?' })}</Text>
      <Text style={styles.subtitle}>{t('setup.bills.subtitle', { defaultValue: "Tick the ones that apply and adjust the monthly amounts." })}</Text>

      {/* REGULAR BILLS */}
      <Text style={styles.sectionTitle}>{t('setup.bills.regularSection', { defaultValue: 'Regular Bills & Obligations' })}</Text>
      {allPresets.filter(p => p.type === 'REGULAR').map((p) => {
        const on = selected.has(p.id);
        return (
          <View key={p.id} style={[styles.row, on && styles.rowActive]}>
            <TouchableOpacity
              style={styles.rowPressable}
              onPress={() => toggle(p.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{p.emoji}</Text>
              <Text style={[styles.name, on && styles.nameActive]}>{p.name}</Text>
            </TouchableOpacity>

            {on && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Monthly ($)</Text>
                <TextInput
                  style={styles.inlineInput}
                  keyboardType="numeric"
                  placeholder={p.suggestedMonthlyAud.toString()}
                  placeholderTextColor="#9CA3AF"
                  value={targets[p.id] ?? ''}
                  onChangeText={(val) => setTargets(prev => ({ ...prev, [p.id]: val }))}
                />
              </View>
            )}

            <TouchableOpacity onPress={() => toggle(p.id)} style={[styles.check, on && styles.checkActive]}>
              {on && <Text style={styles.checkMark}>✓</Text>}
            </TouchableOpacity>
          </View>
        );
      })}

      {/* SAVINGS GOALS */}
      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>{t('setup.bills.savingsSection', { defaultValue: 'Savings Goals' })}</Text>
      {allPresets.filter(p => p.type === 'GOAL').map((p) => {
        const on = selected.has(p.id);
        return (
          <View key={p.id} style={[styles.row, on && styles.rowActive]}>
            <TouchableOpacity
              style={styles.rowPressable}
              onPress={() => toggle(p.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{p.emoji}</Text>
              <Text style={[styles.name, on && styles.nameActive]}>{p.name}</Text>
            </TouchableOpacity>

            {on && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Target ($)</Text>
                <TextInput
                  style={styles.inlineInput}
                  keyboardType="numeric"
                  placeholder={p.suggestedMonthlyAud.toString()}
                  placeholderTextColor="#9CA3AF"
                  value={targets[p.id] ?? ''}
                  onChangeText={(val) => setTargets(prev => ({ ...prev, [p.id]: val }))}
                />
              </View>
            )}

            <TouchableOpacity onPress={() => toggle(p.id)} style={[styles.check, on && styles.checkActive]}>
              {on && <Text style={styles.checkMark}>✓</Text>}
            </TouchableOpacity>
          </View>
        );
      })}

      <View style={styles.customRow}>
        <TextInput
          style={styles.customInput}
          placeholder={t('setup.bills.customAddCta', { defaultValue: 'Add custom bill or goal...' })}
          placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
          value={customName}
          onChangeText={setCustomName}
        />
        <TouchableOpacity
          style={[styles.addBtn, !customName.trim() && styles.addBtnOff]}
          onPress={handleAddCustom}
          disabled={!customName.trim()}
        >
          <Text style={styles.addBtnText}>{t('common.add')}</Text>
        </TouchableOpacity>
      </View>

      {selected.size > 0 && (
        <View style={styles.excessContainer}>
          <Text style={styles.excessLabel}>{t('setup.bills.excessLabel', { defaultValue: 'Where should leftover money go?' })}</Text>
          <View style={styles.pickerRow}>
            {allPresets.filter(p => selected.has(p.id)).map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.pickerItem, excessBucketId === p.id && styles.pickerItemActive]}
                onPress={() => setExcessBucketId(p.id)}
              >
                <Text style={[styles.pickerText, excessBucketId === p.id && styles.pickerTextActive]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.next, (selected.size === 0 || isSubmitting) && styles.nextOff]}
        onPress={handleCompleteSetup}
        disabled={selected.size === 0 || isSubmitting}
        activeOpacity={0.85}
      >
        {isSubmitting ? (
          <ActivityIndicator color={DESIGN_TOKENS.colors.onAccent} />
        ) : (
          <Text style={styles.nextText}>{t('setup.bills.completeCta', { defaultValue: 'Complete Setup 🎉' })}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: D.spacing.containerMargin, paddingTop: 56, paddingBottom: 40, backgroundColor: D.colors.background },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  progressDot: { width: 48, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  progressDotActive: { backgroundColor: D.colors.accent },
  stepLabel: { fontSize: 12, color: D.colors.textMuted, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: D.colors.primary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: D.colors.textMuted, lineHeight: 18, marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: D.colors.textMuted, textTransform: 'uppercase', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: D.colors.surface, borderRadius: D.radius.md, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  rowActive: { borderColor: D.colors.accent, backgroundColor: `${D.colors.accent}0D` },
  rowPressable: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  emoji: { fontSize: 20, marginRight: 8 },
  name: { fontSize: 13, color: D.colors.textPrimary, flexShrink: 1 },
  nameActive: { color: D.colors.accent, fontWeight: '600' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inputLabel: { fontSize: 9, color: D.colors.textMuted, fontWeight: '600' },
  inlineInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 6, width: 60, paddingHorizontal: 6, paddingVertical: 4, fontSize: 11, backgroundColor: '#FFF', color: D.colors.textPrimary, textAlign: 'right' },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkActive: { borderColor: D.colors.accent, backgroundColor: D.colors.accent },
  checkMark: { fontSize: 12, color: '#FFF', fontWeight: '700' },
  customRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 16 },
  customInput: { flex: 1, backgroundColor: D.colors.surface, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: D.radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: D.colors.textPrimary },
  addBtn: { backgroundColor: D.colors.primary, paddingHorizontal: 18, borderRadius: D.radius.md, justifyContent: 'center' },
  addBtnOff: { opacity: 0.4 },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  excessContainer: { backgroundColor: D.colors.surface, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: D.radius.md, padding: 12, marginBottom: 20 },
  excessLabel: { fontSize: 11, fontWeight: '700', color: D.colors.textMuted, textTransform: 'uppercase', marginBottom: 8 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pickerItem: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  pickerItemActive: { borderColor: D.colors.accent, backgroundColor: D.colors.accent + '1A' },
  pickerText: { fontSize: 11, color: D.colors.textPrimary },
  pickerTextActive: { color: D.colors.accent, fontWeight: '700' },
  next: { backgroundColor: D.colors.accent, paddingVertical: 15, borderRadius: D.radius.md, alignItems: 'center' },
  nextOff: { opacity: 0.4 },
  nextText: { color: D.colors.onAccent, fontWeight: '700', fontSize: 16 },
});
