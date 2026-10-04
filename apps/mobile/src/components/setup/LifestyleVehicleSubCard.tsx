import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { VehicleConfig, CarSize } from '@money-matters/types';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface LifestyleVehicleSubCardProps {
  vehicle: VehicleConfig;
  index: number;
  showRemove: boolean;
  onUpdate: (id: string, field: 'name' | 'size', value: any) => void;
  onRemove: (id: string) => void;
}

const CAR_SIZES: { key: CarSize; label: string }[] = [
  { key: 'SMALL', label: 'Small' },
  { key: 'MID_SUV', label: 'Mid SUV' },
  { key: 'LUXURY', label: '4WD/Perf' },
];

export function LifestyleVehicleSubCard({
  vehicle,
  index,
  showRemove,
  onUpdate,
  onRemove,
}: LifestyleVehicleSubCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>Vehicle #{index + 1}</Text>
        {showRemove && (
          <TouchableOpacity onPress={() => onRemove(vehicle.id)}>
            <Text style={styles.removeText}>{t('common.remove')}</Text>
          </TouchableOpacity>
        )}
      </View>
      <TextInput
        style={styles.input}
        value={vehicle.name}
        onChangeText={(txt) => onUpdate(vehicle.id, 'name', txt)}
        placeholder="Vehicle label (e.g. My SUV)"
        placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
      />
      <View style={styles.sizeRow}>
        {CAR_SIZES.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sizeChip, vehicle.size === s.key && styles.sizeChipActive]}
            onPress={() => onUpdate(vehicle.id, 'size', s.key)}
          >
            <Text style={[styles.sizeChipText, vehicle.size === s.key && styles.sizeChipTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
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
  sizeRow: { flexDirection: 'row', gap: 6 },
  sizeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: DESIGN_TOKENS.radius.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
  },
  sizeChipActive: { backgroundColor: DESIGN_TOKENS.colors.accent, borderColor: DESIGN_TOKENS.colors.accent },
  sizeChipText: { fontSize: 11, color: DESIGN_TOKENS.colors.textMuted },
  sizeChipTextActive: { color: DESIGN_TOKENS.colors.onAccent, fontWeight: '600' },
});
