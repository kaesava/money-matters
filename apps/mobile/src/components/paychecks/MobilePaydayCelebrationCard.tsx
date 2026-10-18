import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { MobilePaydayMetricsGrid } from './MobilePaydayMetricsGrid';
import { MobilePaydayActionButtons } from './MobilePaydayActionButtons';

interface MobilePaydayCelebrationCardProps {
  everydayAllocated?: number;
  billsAllocated: number;
  goalsAllocated: number;
  safeToSpend: number;
  isConfirmed: boolean;
  isLocked?: boolean;
  isDirty?: boolean;
  isFutureDate?: boolean;
  submitting: boolean;
  isDeficit?: boolean;
  onConfirm: () => void;
  onUnlockAndRecalculate?: () => void;
  onRecalculate?: () => void;
  onLockSplit?: () => void;
  onSaveChanges?: () => void;
  onDiscardEdits?: () => void;
}

export function MobilePaydayCelebrationCard({
  everydayAllocated = 0,
  billsAllocated,
  goalsAllocated,
  safeToSpend,
  isConfirmed,
  isLocked = false,
  isDirty = false,
  isFutureDate = false,
  submitting,
  isDeficit = false,
  onConfirm,
  onUnlockAndRecalculate,
  onRecalculate,
  onLockSplit,
  onSaveChanges,
  onDiscardEdits,
}: MobilePaydayCelebrationCardProps) {
  const badgeText = isConfirmed
    ? t('paydayDrawer.confirmedBadge')
    : isLocked
    ? isDirty ? t('paydayDrawer.lockedUnsavedBadge') : t('paydayDrawer.lockedBadge')
    : isDirty ? t('paydayDrawer.customSplitsBadge') : t('paydayDrawer.autoBadge');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <Text style={styles.sparkle}>{isLocked ? '🔒' : '✨'}</Text>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
        <Text style={styles.title}>{t('paydayDrawer.celebrationTitle')}</Text>
        <Text style={styles.subtitle}>{t('paydayDrawer.celebrationSubtitle')}</Text>
      </View>

      <MobilePaydayActionButtons
        isConfirmed={isConfirmed}
        isLocked={isLocked}
        isDirty={isDirty}
        isDeficit={isDeficit}
        isFutureDate={isFutureDate}
        submitting={submitting}
        onConfirm={onConfirm}
        onUnlockAndRecalculate={onUnlockAndRecalculate}
        onRecalculate={onRecalculate}
        onLockSplit={onLockSplit}
        onSaveChanges={onSaveChanges}
        onDiscardEdits={onDiscardEdits}
      />

      <MobilePaydayMetricsGrid
        everydayAllocated={everydayAllocated}
        billsAllocated={billsAllocated}
        goalsAllocated={goalsAllocated}
        safeToSpend={safeToSpend}
        isDeficit={isDeficit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.primary,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  header: {
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sparkle: {
    fontSize: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#93C5FD',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#BFDBFE',
    lineHeight: 18,
  },
});
