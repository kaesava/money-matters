
/**
 * Setup Step 3 — Configure Categories
 * Phase 4: Placeholder screen. Full form (target amounts, schedules, priority ranks)
 * will be built in Phase 5 once category IDs are persisted from Step 2.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui';
import { trpc } from '../../lib/trpc';

export default function SetupConfigureScreen() {
  const router = useRouter();
  const { data: categories = [], isLoading, refetch } = trpc.listCategories.useQuery();
  const createCategorySchedule = trpc.createCategorySchedule.useMutation();
  const updateCategory = trpc.updateCategory.useMutation();

  const [targets, setTargets] = useState<Record<string, string>>({});
  const [schedules, setSchedules] = useState<Record<string, string>>({});
  const [priorities, setPriorities] = useState<Record<string, string>>({});
  const [excessBucketId, setExcessBucketId] = useState('');
  const [saving, setSaving] = useState(false);

  const savingsRegular = categories.filter(c => c.type === 'GOAL' || c.type === 'REGULAR');

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (const cat of savingsRegular) {
        const targetVal = targets[cat.id] || '0';

        await createCategorySchedule.mutateAsync({
          categoryId: cat.id,
          targetAmount: parseFloat(targetVal).toFixed(2),
        });

        await updateCategory.mutateAsync({
          categoryId: cat.id,
          data: {
            isDefaultExcess: excessBucketId === cat.id,
          },
        });
      }
      router.push('/(setup)/bank-accounts');
    } catch (err) {
      Alert.alert("Configuration Error", "Could not save category targets.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={DESIGN_TOKENS.colors.accent} size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.progressRow}>
        {[1, 2, 3, 4].map((s) => (
          <View key={s} style={[styles.dot, s === 3 && styles.dotActive]} />
        ))}
      </View>
      <Text style={styles.stepLabel}>{t('setup.stepOf', { step: 3, total: 4 })}</Text>
      <Text style={styles.title}>{t('setup.configure.title')}</Text>
      <Text style={styles.subtitle}>{t('setup.configure.subtitle')}</Text>

      {savingsRegular.map((cat) => (
        <View key={cat.id} style={styles.configCard}>
          <Text style={styles.cardName}>{cat.name}</Text>
          
          <Text style={styles.label}>{t('setup.configure.targetLabel')}</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={targets[cat.id] || ''}
            onChangeText={(val) => setTargets(prev => ({ ...prev, [cat.id]: val }))}
            placeholder="0.00"
          />
        </View>
      ))}

      {savingsRegular.length > 0 && (
        <View style={styles.configCard}>
          <Text style={styles.label}>{t('setup.configure.excessLabel', { defaultValue: 'Default Excess Bucket' })}</Text>
          <View style={styles.pickerRow}>
            {savingsRegular.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.pickerItem, excessBucketId === cat.id && styles.pickerItemActive]}
                onPress={() => setExcessBucketId(cat.id)}
              >
                <Text style={[styles.pickerText, excessBucketId === cat.id && styles.pickerTextActive]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.navRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.backText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={handleSaveAll} activeOpacity={0.85} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.nextText}>{t('common.next')} →</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: D.spacing.containerMargin, paddingTop: 56, paddingBottom: 40, backgroundColor: D.colors.background },
  progressRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  dot: { width: 32, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB' },
  dotActive: { backgroundColor: D.colors.accent },
  stepLabel: { fontSize: 12, color: D.colors.textMuted, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: D.colors.primary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: D.colors.textMuted, lineHeight: 18, marginBottom: 24 },
  placeholderCard: { backgroundColor: D.colors.surface, borderRadius: D.radius.lg, padding: 24, alignItems: 'center', gap: 10, marginBottom: 40, shadowColor: '#000', shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8 },
  placeholderIcon: { fontSize: 40 },
  placeholderTitle: { fontSize: 16, fontWeight: '700', color: D.colors.primary },
  placeholderBody: { fontSize: 13, color: D.colors.textMuted, textAlign: 'center', lineHeight: 19 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: D.colors.background },
  navRow: { flexDirection: 'row', gap: 12 },
  backBtn: { flex: 1, paddingVertical: 15, borderRadius: D.radius.md, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: D.colors.surface },
  backText: { fontSize: 15, color: D.colors.textPrimary, fontWeight: '600' },
  nextBtn: { flex: 2, backgroundColor: D.colors.accent, paddingVertical: 15, borderRadius: D.radius.md, alignItems: 'center' },
  nextText: { color: D.colors.onAccent, fontWeight: '700', fontSize: 16 },
  configCard: { backgroundColor: D.colors.surface, borderRadius: D.radius.md, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardName: { fontSize: 16, fontWeight: '700', color: D.colors.primary, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: D.colors.textMuted, marginBottom: 4, textTransform: 'uppercase' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: D.radius.md, padding: 10, fontSize: 14, marginBottom: 12, color: D.colors.textPrimary },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  pickerItemActive: { borderColor: D.colors.accent, backgroundColor: D.colors.accent + '10' },
  pickerText: { fontSize: 13, color: D.colors.textPrimary },
  pickerTextActive: { color: D.colors.accent, fontWeight: '600' },
});
