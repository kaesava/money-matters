import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export const HORIZON_STEPS = [0, 1, 2, 3, 6, 9, 12];

interface ProjectionScrubberProps {
  selectedHorizon: number;
  onSelectHorizon: (h: number) => void;
}

export const ProjectionScrubber: React.FC<ProjectionScrubberProps> = ({
  selectedHorizon,
  onSelectHorizon,
}) => {
  return (
    <View style={styles.scrubberCard}>
      <View style={styles.scrubberHeader}>
        <View style={styles.scrubberLabelWrap}>
          <Feather name="trending-up" size={14} color={DESIGN_TOKENS.colors.accent} />
          <Text style={styles.scrubberTitle}>
            {t('categories.projectionSliderLabel')}
          </Text>
        </View>
        <View style={styles.horizonBadge}>
          <Text style={styles.horizonBadgeText}>
            {selectedHorizon === 0
              ? t('common.today')
              : t('categories.projectedBalances', { months: selectedHorizon })}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizonList}
      >
        {HORIZON_STEPS.map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => onSelectHorizon(m)}
            style={[
              styles.horizonChip,
              selectedHorizon === m && styles.horizonChipActive,
            ]}
          >
            <Text
              style={[
                styles.horizonChipText,
                selectedHorizon === m && styles.horizonChipTextActive,
              ]}
            >
              {m === 0 ? t('common.today') : `+${m}M`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrubberCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 14,
    gap: 12,
  },
  scrubberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scrubberLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scrubberTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  horizonBadge: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
  },
  horizonBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
  horizonList: {
    flexDirection: 'row',
    gap: 8,
  },
  horizonChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  horizonChipActive: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderColor: DESIGN_TOKENS.colors.accent,
  },
  horizonChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  horizonChipTextActive: {
    color: DESIGN_TOKENS.colors.onAccent,
  },
});
