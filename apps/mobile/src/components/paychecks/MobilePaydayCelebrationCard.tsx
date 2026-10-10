import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../lib/format';

interface MobilePaydayCelebrationCardProps {
  billsAllocated: number;
  goalsAllocated: number;
  safeToSpend: number;
  isConfirmed: boolean;
  submitting: boolean;
  onConfirm: () => void;
}

export function MobilePaydayCelebrationCard({
  billsAllocated,
  goalsAllocated,
  safeToSpend,
  isConfirmed,
  submitting,
  onConfirm,
}: MobilePaydayCelebrationCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <Text style={styles.sparkle}>✨</Text>
          <Text style={styles.badgeText}>
            {isConfirmed ? t('paydayDrawer.confirmedBadge') : t('paydayDrawer.autoBadge')}
          </Text>
        </View>
        <Text style={styles.title}>{t('paydayDrawer.celebrationTitle')}</Text>
        <Text style={styles.subtitle}>{t('paydayDrawer.celebrationSubtitle')}</Text>
      </View>

      {!isConfirmed && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onConfirm}
          disabled={submitting}
          style={styles.confirmBtn}
        >
          <Feather name="check-circle" size={18} color="#FFFFFF" />
          <Text style={styles.confirmBtnText}>{t('paydayDrawer.confirmAndLockIn')}</Text>
        </TouchableOpacity>
      )}

      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>{t('paydayDrawer.ringFencedBills')}</Text>
          <Text style={styles.metricValue}>{formatAUD(billsAllocated)}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>{t('paydayDrawer.fundedGoals')}</Text>
          <Text style={styles.metricValue}>{formatAUD(goalsAllocated)}</Text>
        </View>
        <View style={[styles.metricItem, styles.metricHighlight]}>
          <Text style={styles.metricHighlightLabel}>{t('paydayDrawer.safeToSpend')}</Text>
          <Text style={styles.metricHighlightValue}>{formatAUD(safeToSpend)}</Text>
        </View>
      </View>
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
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DESIGN_TOKENS.colors.success,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  metricItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  metricHighlight: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  metricHighlightLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#86EFAC',
    textAlign: 'center',
  },
  metricHighlightValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#4ADE80',
    fontFamily: 'monospace',
  },
});
