import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui';

type CategoryType = 'MAJOR' | 'RECURRING' | 'EVERYDAY';

interface PresetCategory {
  id: string;
  name: string;
  type: CategoryType;
  emoji: string;
}

const PRESETS: PresetCategory[] = [
  { id: 'emergency', name: 'Emergency Fund', type: 'MAJOR', emoji: '🛡️' },
  { id: 'holiday', name: 'Holiday / Travel', type: 'MAJOR', emoji: '✈️' },
  { id: 'car', name: 'Car Replacement', type: 'MAJOR', emoji: '🚗' },
  { id: 'rent', name: 'Rent / Mortgage', type: 'RECURRING', emoji: '🏡' },
  { id: 'electricity', name: 'Electricity', type: 'RECURRING', emoji: '⚡' },
  { id: 'internet', name: 'Internet', type: 'RECURRING', emoji: '📡' },
  { id: 'insurance', name: 'Insurance', type: 'RECURRING', emoji: '📋' },
  { id: 'groceries', name: 'Groceries', type: 'EVERYDAY', emoji: '🛒' },
  { id: 'fuel', name: 'Fuel', type: 'EVERYDAY', emoji: '⛽' },
  { id: 'eating-out', name: 'Eating Out', type: 'EVERYDAY', emoji: '🍽️' },
];

const SECTIONS: CategoryType[] = ['MAJOR', 'RECURRING', 'EVERYDAY'];
const SECTION_TITLES: Record<CategoryType, string> = {
  MAJOR: 'setup.categories.majorSection',
  RECURRING: 'setup.categories.recurringSection',
  EVERYDAY: 'setup.categories.everydaySection',
};

export default function SetupCategoriesScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(['emergency', 'rent', 'groceries']));
  const [customName, setCustomName] = useState('');
  const [presets, setPresets] = useState(PRESETS);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const id = `custom-${Date.now()}`;
    setPresets((prev) => [...prev, { id, name: customName.trim(), type: 'EVERYDAY', emoji: '📦' }]);
    setSelected((prev) => new Set([...prev, id]));
    setCustomName('');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.progressRow}>
        {[1, 2, 3, 4].map((s) => (
          <View key={s} style={[styles.dot, s === 2 && styles.dotActive]} />
        ))}
      </View>
      <Text style={styles.stepLabel}>{t('setup.stepOf', { step: 2, total: 4 })}</Text>
      <Text style={styles.title}>{t('setup.categories.title')}</Text>
      <Text style={styles.subtitle}>{t('setup.categories.subtitle')}</Text>
      <Text style={styles.count}>{t('setup.categories.selectedCount', { count: selected.size })}</Text>

      {SECTIONS.map((section) => (
        <View key={section} style={styles.section}>
          <Text style={styles.sectionTitle}>{t(SECTION_TITLES[section])}</Text>
          {presets.filter((p) => p.type === section).map((p) => {
            const on = selected.has(p.id);
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.row, on && styles.rowActive]}
                onPress={() => toggle(p.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.emoji}>{p.emoji}</Text>
                <Text style={[styles.name, on && styles.nameActive]}>{p.name}</Text>
                <View style={[styles.check, on && styles.checkActive]}>
                  {on && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      <View style={styles.customRow}>
        <TextInput
          style={styles.customInput}
          placeholder={t('setup.categories.customNamePlaceholder')}
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

      <TouchableOpacity
        style={[styles.next, selected.size === 0 && styles.nextOff]}
        onPress={() => router.push('/(setup)/configure')}
        disabled={selected.size === 0}
        activeOpacity={0.85}
      >
        <Text style={styles.nextText}>{t('common.next')} →</Text>
      </TouchableOpacity>
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
  subtitle: { fontSize: 13, color: D.colors.textMuted, lineHeight: 18, marginBottom: 8 },
  count: { fontSize: 12, fontWeight: '600', color: D.colors.accent, marginBottom: 16 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: D.colors.textMuted, textTransform: 'uppercase', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: D.colors.surface, borderRadius: D.radius.md, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  rowActive: { borderColor: D.colors.accent, backgroundColor: `${D.colors.accent}0D` },
  emoji: { fontSize: 20, marginRight: 12 },
  name: { flex: 1, fontSize: 14, color: D.colors.textPrimary },
  nameActive: { color: D.colors.accent, fontWeight: '600' },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkActive: { borderColor: D.colors.accent, backgroundColor: D.colors.accent },
  checkMark: { fontSize: 12, color: '#FFF', fontWeight: '700' },
  customRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  customInput: { flex: 1, backgroundColor: D.colors.surface, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: D.radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: D.colors.textPrimary },
  addBtn: { backgroundColor: D.colors.primary, paddingHorizontal: 18, borderRadius: D.radius.md, justifyContent: 'center' },
  addBtnOff: { opacity: 0.4 },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  next: { backgroundColor: D.colors.accent, paddingVertical: 15, borderRadius: D.radius.md, alignItems: 'center' },
  nextOff: { opacity: 0.4 },
  nextText: { color: D.colors.onAccent, fontWeight: '700', fontSize: 16 },
});
