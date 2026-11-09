import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '../tokens';
import { t } from '@money-matters/i18n';
import type { TargetCelebrationItem } from '@money-matters/types';

export interface MobileCelebrationBannerProps {
  readonly targetsHit: readonly TargetCelebrationItem[];
  readonly formatCurrency?: (val: number | string) => string;
}

export const MobileCelebrationBanner: React.FC<MobileCelebrationBannerProps> = ({
  targetsHit,
  formatCurrency,
}) => {
  const fmt = formatCurrency ?? ((v: number | string) => (typeof v === 'number' ? `$${v.toFixed(2)}` : String(v)));

  if (!targetsHit || targetsHit.length === 0) return null;

  const isMulti = targetsHit.length > 1;
  const title = isMulti
    ? t('paydayDrawer.celebrationMultiTitle', { count: targetsHit.length })
    : t('paydayDrawer.celebrationSingleTitle');

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={styles.confettiIcon}>🎉</Text>
          <Text style={styles.titleText}>{title}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {targetsHit.length} {t('common.target')}
          </Text>
        </View>
      </View>

      <View style={styles.targetsList}>
        {targetsHit.map((target, idx) => {
          const isGoalMet = target.type === 'GOAL_TARGET_MET';
          const isRecurringGoal = target.type === 'RECURRING_GOAL_FUNDED';
          const isBillsCovered = target.type === 'BILLS_COVERED';

          const icon = isGoalMet ? '🏆' : isRecurringGoal ? '✨' : isBillsCovered ? '🛡️' : '🚀';

          const subtitle = isGoalMet
            ? t('paydayDrawer.celebrationGoalMet', { amount: fmt(target.amount) })
            : isRecurringGoal
            ? t('paydayDrawer.celebrationRecurringGoalFunded', { amount: fmt(target.amount) })
            : isBillsCovered
            ? t('paydayDrawer.celebrationBillsCoveredDesc')
            : t('paydayDrawer.celebrationSurplusSwept', { amount: fmt(target.amount) });

          return (
            <View key={`${target.id}-${idx}`} style={styles.targetItem}>
              <Text style={styles.itemIcon}>{icon}</Text>
              <View style={styles.itemContent}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {target.name}
                </Text>
                <Text style={styles.itemSubtitle}>{subtitle}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  confettiIcon: {
    fontSize: 16,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064e3b',
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  targetsList: {
    gap: 8,
  },
  targetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: '#d1fae5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  itemIcon: {
    fontSize: 14,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  itemSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
    marginTop: 1,
  },
});

export default MobileCelebrationBanner;
