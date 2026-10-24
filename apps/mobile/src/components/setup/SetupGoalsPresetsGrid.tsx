import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatMobileCurrency } from '../../lib/format';

export interface MobileGoalPresetConfig {
  name: string;
  nameKey: string;
  mode: 'TARGET_DATE' | 'ONGOING';
  icon: string;
  defaultTarget: number;
  defaultMonths?: number;
}

export const PRESET_GOALS: MobileGoalPresetConfig[] = [
  {
    name: 'Annual Family Holiday',
    nameKey: 'setup.goals.presetHoliday',
    mode: 'TARGET_DATE',
    icon: 'plane',
    defaultTarget: 5000,
    defaultMonths: 12,
  },
  {
    name: 'Car / Vehicle',
    nameKey: 'setup.goals.presetVehicle',
    mode: 'TARGET_DATE',
    icon: 'car',
    defaultTarget: 15000,
    defaultMonths: 24,
  },
  {
    name: 'Tech Upgrade',
    nameKey: 'setup.goals.presetTech',
    mode: 'TARGET_DATE',
    icon: 'laptop',
    defaultTarget: 1500,
    defaultMonths: 6,
  },
  {
    name: 'Emergency Reserve',
    nameKey: 'setup.goals.presetEmergency',
    mode: 'ONGOING',
    icon: 'shield',
    defaultTarget: 300,
  },
  {
    name: 'Education Fund',
    nameKey: 'setup.goals.presetEducation',
    mode: 'ONGOING',
    icon: 'book',
    defaultTarget: 200,
  },
  {
    name: 'Wealth Building',
    nameKey: 'setup.goals.presetWealth',
    mode: 'ONGOING',
    icon: 'trending-up',
    defaultTarget: 400,
  },
];

interface SetupGoalsPresetsGridProps {
  onTogglePreset: (preset: MobileGoalPresetConfig) => void;
  isPresetActive: (name: string) => boolean;
}

export function SetupGoalsPresetsGrid({
  onTogglePreset,
  isPresetActive,
}: SetupGoalsPresetsGridProps) {
  return (
    <>
      <Text style={styles.sectionHeading}>{t('setup.goals.popularPresets')}</Text>
      <View style={styles.presetsGrid}>
        {PRESET_GOALS.map((preset) => {
          const active = isPresetActive(preset.name);
          const isOngoing = preset.mode === 'ONGOING';
          const displayLabel = t(preset.nameKey as unknown as Parameters<typeof t>[0]);

          return (
            <TouchableOpacity
              key={preset.name}
              onPress={() => onTogglePreset(preset)}
              style={[styles.presetCard, active && styles.presetCardActive]}
            >
              <View style={styles.badgeRow}>
                <Text style={[styles.badgeText, isOngoing ? styles.badgeOngoing : styles.badgeTarget]}>
                  {isOngoing ? t('setup.goals.recurringBadge') : t('setup.goals.targetDateBadge')}
                </Text>
              </View>
              <Text style={styles.presetName} numberOfLines={1}>{displayLabel}</Text>
              <Text style={styles.presetMeta}>
                {isOngoing ? `${formatMobileCurrency(preset.defaultTarget)}/mo` : `Target: ${formatMobileCurrency(preset.defaultTarget)}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeading: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.textPrimary, marginBottom: 8 },
  presetsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  presetCard: {
    width: '48%',
    backgroundColor: DESIGN_TOKENS.colors.surface,
    padding: 10,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  presetCardActive: { borderColor: DESIGN_TOKENS.colors.accent, backgroundColor: DESIGN_TOKENS.colors.accentLight },
  badgeRow: { marginBottom: 4 },
  badgeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  badgeOngoing: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  badgeTarget: { backgroundColor: '#FEF3C7', color: '#92400E' },
  presetName: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.primary },
  presetMeta: { fontSize: 11, color: DESIGN_TOKENS.colors.textMuted, marginTop: 2, fontFamily: 'monospace' },
});
