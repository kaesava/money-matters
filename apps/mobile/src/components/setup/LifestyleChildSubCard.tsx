import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ChildConfig, SchoolStage, SchoolType } from '@money-matters/types';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface LifestyleChildSubCardProps {
  child: ChildConfig;
  index: number;
  showRemove: boolean;
  onUpdate: (id: string, field: 'name' | 'stage' | 'type', value: any) => void;
  onRemove: (id: string) => void;
}

const STAGES: { key: SchoolStage; label: string }[] = [
  { key: 'CHILDCARE', label: 'Daycare' },
  { key: 'PRIMARY', label: 'Primary' },
  { key: 'SECONDARY', label: 'High' },
];

const TYPES: { key: SchoolType; label: string }[] = [
  { key: 'PUBLIC', label: 'Public' },
  { key: 'CATHOLIC', label: 'Catholic' },
  { key: 'PRIVATE', label: 'Private' },
];

export function LifestyleChildSubCard({
  child,
  index,
  showRemove,
  onUpdate,
  onRemove,
}: LifestyleChildSubCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>Child #{index + 1}</Text>
        {showRemove && (
          <TouchableOpacity onPress={() => onRemove(child.id)}>
            <Text style={styles.removeText}>{t('common.remove')}</Text>
          </TouchableOpacity>
        )}
      </View>
      <TextInput
        style={styles.input}
        value={child.name}
        onChangeText={(txt) => onUpdate(child.id, 'name', txt)}
        placeholder="Child name"
        placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
      />
      <View style={styles.chipsGroup}>
        <View style={styles.chipRow}>
          {STAGES.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.chip, child.stage === s.key && styles.chipActive]}
              onPress={() => onUpdate(child.id, 'stage', s.key)}
            >
              <Text style={[styles.chipText, child.stage === s.key && styles.chipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.chipRow}>
          {TYPES.map((ty) => (
            <TouchableOpacity
              key={ty.key}
              style={[styles.chip, child.type === ty.key && styles.chipActive]}
              onPress={() => onUpdate(child.id, 'type', ty.key)}
            >
              <Text style={[styles.chipText, child.type === ty.key && styles.chipTextActive]}>
                {ty.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    padding: 10,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.primary },
  removeText: { fontSize: 11, fontWeight: '600', color: '#EF4444' },
  input: {
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: DESIGN_TOKENS.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textPrimary,
    marginBottom: 8,
  },
  chipsGroup: { gap: 6 },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: DESIGN_TOKENS.radius.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
  },
  chipActive: { backgroundColor: DESIGN_TOKENS.colors.accent, borderColor: DESIGN_TOKENS.colors.accent },
  chipText: { fontSize: 11, color: DESIGN_TOKENS.colors.textMuted },
  chipTextActive: { color: DESIGN_TOKENS.colors.onAccent, fontWeight: '600' },
});
