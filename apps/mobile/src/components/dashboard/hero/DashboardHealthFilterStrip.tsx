import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface DashboardHealthFilterStripProps {
  readonly behindCount: number;
  readonly needsAttentionCount: number;
  readonly onTrackCount: number;
  readonly onSelectFilter?: (health: string) => void;
}

export const DashboardHealthFilterStrip: React.FC<DashboardHealthFilterStripProps> = ({
  behindCount,
  needsAttentionCount,
  onTrackCount,
  onSelectFilter,
}) => {
  return (
    <View style={styles.badgesRow}>
      <TouchableOpacity
        style={[styles.statusBadge, styles.redBadge]}
        onPress={() => onSelectFilter?.('RED')}
        activeOpacity={0.7}
      >
        <View style={[styles.statusDot, { backgroundColor: DESIGN_TOKENS.colors.critical }]} />
        <Text style={[styles.statusText, { color: DESIGN_TOKENS.colors.criticalDark }]}>
          {t('dashboard.upcoming.healthBehind')}
        </Text>
        <View style={[styles.countPill, { backgroundColor: DESIGN_TOKENS.colors.criticalBorder }]}>
          <Text style={[styles.countText, { color: DESIGN_TOKENS.colors.criticalDark }]}>{behindCount}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.statusBadge, styles.amberBadge]}
        onPress={() => onSelectFilter?.('AMBER')}
        activeOpacity={0.7}
      >
        <View style={[styles.statusDot, { backgroundColor: DESIGN_TOKENS.colors.warning }]} />
        <Text style={[styles.statusText, { color: DESIGN_TOKENS.colors.warningDark }]}>
          {t('dashboard.upcoming.healthNeedsAttention')}
        </Text>
        <View style={[styles.countPill, { backgroundColor: DESIGN_TOKENS.colors.warningBorder }]}>
          <Text style={[styles.countText, { color: DESIGN_TOKENS.colors.warningDark }]}>
            {needsAttentionCount}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.statusBadge, styles.greenBadge]}
        onPress={() => onSelectFilter?.('GREEN')}
        activeOpacity={0.7}
      >
        <View style={[styles.statusDot, { backgroundColor: DESIGN_TOKENS.colors.success }]} />
        <Text style={[styles.statusText, { color: DESIGN_TOKENS.colors.successDark }]}>
          {t('dashboard.upcoming.healthOnTrack')}
        </Text>
        <View style={[styles.countPill, { backgroundColor: DESIGN_TOKENS.colors.successBorder }]}>
          <Text style={[styles.countText, { color: DESIGN_TOKENS.colors.successDark }]}>{onTrackCount}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  statusBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: DESIGN_TOKENS.radius.full,
    gap: 4,
    borderWidth: 1,
  },
  redBadge: {
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    borderColor: DESIGN_TOKENS.colors.criticalBorder,
  },
  amberBadge: {
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderColor: DESIGN_TOKENS.colors.warningBorder,
  },
  greenBadge: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderColor: DESIGN_TOKENS.colors.successBorder,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  countPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
