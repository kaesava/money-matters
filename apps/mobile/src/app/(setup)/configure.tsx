import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui';

/**
 * Setup Step 3 — Configure Categories
 * Phase 4: Placeholder screen. Full form (target amounts, schedules, priority ranks)
 * will be built in Phase 5 once category IDs are persisted from Step 2.
 */
export default function SetupConfigureScreen() {
  const router = useRouter();

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

      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderIcon}>⚙️</Text>
        <Text style={styles.placeholderTitle}>Category Configuration</Text>
        <Text style={styles.placeholderBody}>
          Set target amounts and payment schedules for your MAJOR and RECURRING categories.
          Full configuration available in Phase 5 once categories are persisted.
        </Text>
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.backText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={() => router.push('/(setup)/bank-accounts')} activeOpacity={0.85}>
          <Text style={styles.nextText}>{t('common.next')} →</Text>
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
  navRow: { flexDirection: 'row', gap: 12 },
  backBtn: { flex: 1, paddingVertical: 15, borderRadius: D.radius.md, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: D.colors.surface },
  backText: { fontSize: 15, color: D.colors.textPrimary, fontWeight: '600' },
  nextBtn: { flex: 2, backgroundColor: D.colors.accent, paddingVertical: 15, borderRadius: D.radius.md, alignItems: 'center' },
  nextText: { color: D.colors.onAccent, fontWeight: '700', fontSize: 16 },
});
