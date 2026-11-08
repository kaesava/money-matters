import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, CardDrawerIndicator, formatRecurrenceSuffix } from '@money-matters/ui/mobile';
import { formatMobileCurrency } from '../../lib/format';
import { useRouter, type Href } from 'expo-router';

interface PoolItemCardProps {
  pool: {
    id: string;
    name: string;
    envelopeType?: string | null;
    poolType?: string | null;
    goalMode?: string | null;
    budgetFrequency?: string | null;
    rrule?: string | null;
    endDate?: string | null;
    targetDate?: string | null;
    currentBalance?: number | string | null;
    targetAmount?: string | null;
    enteredAmount?: string | null;
    monthlyAmount?: string | null;
    isSurplusTarget?: boolean | null;
    fundingMode?: "TARGET_BALANCE" | "RECURRING" | null;
    isPriority?: boolean | null;
    isEssential?: boolean | null;
    isCommitted?: boolean | null;
  };
}

export function PoolItemCard({
  pool,
}: PoolItemCardProps) {
  const router = useRouter();
  const isBill = pool.envelopeType === 'BILL' || pool.envelopeType === 'SCHEDULED_BILL' || pool.envelopeType === 'FLEXIBLE_BILL';
  const isGoal = pool.envelopeType === 'GOAL' || pool.envelopeType === 'TARGET_GOAL' || pool.envelopeType === 'ONGOING_GOAL' || pool.poolType === 'GOAL';
  const isEveryday = pool.envelopeType === 'EVERYDAY' || pool.poolType === 'EVERYDAY';
  const isPriority = Boolean(pool.isPriority || pool.isEssential || pool.isCommitted);

  const target = pool.targetAmount ? parseFloat(pool.targetAmount) : 0;
  const entered = pool.enteredAmount ? parseFloat(pool.enteredAmount) : 0;
  const monthly = pool.monthlyAmount ? parseFloat(pool.monthlyAmount) : 0;
  const currentBal = typeof pool.currentBalance === 'number' ? pool.currentBalance : parseFloat(String(pool.currentBalance || 0));
  const pct = target > 0 ? Math.min(100, Math.round((currentBal / target) * 100)) : 0;

  const subTypeBadge = isEveryday
    ? t('categories.everydayBadge')
    : pool.fundingMode === 'TARGET_BALANCE'
    ? t('categories.targetBalanceBadge')
    : pool.fundingMode === 'RECURRING'
    ? t('categories.recurringBadge')
    : pool.envelopeType === 'SCHEDULED_BILL'
    ? t('categories.scheduledBillBadge')
    : pool.envelopeType === 'FLEXIBLE_BILL'
    ? t('categories.flexibleBillBadge')
    : pool.envelopeType === 'TARGET_GOAL'
    ? t('categories.targetDateGoalBadge')
    : pool.envelopeType === 'ONGOING_GOAL'
    ? t('categories.ongoingGoalBadge')
    : null;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/(app)/envelopes/${pool.id}` as Href)}
        style={styles.cardHeader}
      >
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.poolName}>{pool.name}</Text>
            {subTypeBadge && (
              <View style={[
                styles.subTypeBadge,
                isBill
                  ? styles.scheduledBillBadge
                  : isGoal
                  ? styles.targetGoalBadge
                  : styles.everydayBadge
              ]}>
                <Text style={[
                  styles.subTypeBadgeText,
                  isBill
                    ? styles.scheduledBillBadgeText
                    : isGoal
                    ? styles.targetGoalBadgeText
                    : styles.everydayBadgeText
                ]}>
                  {subTypeBadge}
                </Text>
              </View>
            )}
            {isPriority && !isEveryday && (
              <View style={[styles.subTypeBadge, styles.essentialBadge]}>
                <Text style={[styles.subTypeBadgeText, styles.essentialBadgeText]}>
                  {t('categories.priorityBadge')}
                </Text>
              </View>
            )}
            {pool.isSurplusTarget && (
              <View style={styles.surplusBadge}>
                <Text style={styles.surplusBadgeText}>{t('categories.surplusBadgeText')}</Text>
              </View>
            )}
          </View>

        </View>

        <View style={styles.balWrap}>
          <View style={styles.balCol}>
            <Text style={styles.balNum}>{formatMobileCurrency(pool.currentBalance ?? 0)}</Text>
            <Text style={styles.balSub}>
              {isGoal
                ? pool.goalMode === 'ONGOING' || pool.envelopeType === 'ONGOING_GOAL'
                  ? (() => {
                      const freq = pool.budgetFrequency || 'MONTHLY';
                      const suffix = formatRecurrenceSuffix(pool.rrule, freq);
                      const contrib = entered > 0 ? entered : monthly > 0 ? monthly : 0;
                      if (contrib > 0) {
                        return `${formatMobileCurrency(contrib)}${suffix}`;
                      }
                      return target > 0 ? `${formatMobileCurrency(target)} target` : t('categories.noTarget');
                    })()
                  : target > 0
                  ? `${pct}% of ${formatMobileCurrency(target)}`
                  : t('categories.noTarget')
                : pool.envelopeType === 'SCHEDULED_BILL'
                ? (() => {
                    const freq = pool.budgetFrequency || 'MONTHLY';
                    const suffix = formatRecurrenceSuffix(pool.rrule, freq);
                    const amt = entered > 0 ? entered : monthly > 0 ? monthly : target;
                    return amt > 0 ? `${formatMobileCurrency(amt)}${suffix}` : t('categories.mainPool');
                  })()
                : (monthly > 0 ? monthly : target > 0 ? target : 0) > 0
                ? `${formatMobileCurrency(monthly > 0 ? monthly : target)}/mo`
                : t('categories.mainPool')}
            </Text>
          </View>
          <CardDrawerIndicator size={18} />
        </View>
      </TouchableOpacity>

      {isGoal && target > 0 && pool.goalMode !== 'ONGOING' && pool.envelopeType !== 'ONGOING_GOAL' && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  poolName: { fontSize: 14, fontWeight: '800', color: DESIGN_TOKENS.colors.primary },
  subTypeBadge: { paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6, borderWidth: 1 },
  subTypeBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  scheduledBillBadge: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  scheduledBillBadgeText: { color: '#1D4ED8' },
  flexibleBillBadge: { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' },
  flexibleBillBadgeText: { color: '#0369A1' },
  targetGoalBadge: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  targetGoalBadgeText: { color: '#047857' },
  ongoingGoalBadge: { backgroundColor: '#F0FDFA', borderColor: '#99F6E4' },
  ongoingGoalBadgeText: { color: '#0F766E' },
  everydayBadge: { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' },
  everydayBadgeText: { color: '#7E22CE' },
  essentialBadge: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  essentialBadgeText: { color: '#B45309' },
  committedBadge: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  committedBadgeText: { color: '#4338CA' },
  surplusBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  surplusBadgeText: { fontSize: 9, fontWeight: '700', color: '#047857' },
  bankBadgeWrap: { marginTop: 3 },
  bankNameText: { fontSize: 11, color: DESIGN_TOKENS.colors.textMuted },
  balWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  balCol: { alignItems: 'flex-end' },
  balNum: { fontSize: 14, fontWeight: '800', fontFamily: 'monospace', color: DESIGN_TOKENS.colors.primary },
  balSub: { fontSize: 10, color: DESIGN_TOKENS.colors.textMuted, marginTop: 1 },
  progressTrack: { height: 4, backgroundColor: '#F1F5F9', width: '100%' },
  progressFill: { height: '100%', backgroundColor: DESIGN_TOKENS.colors.accent },
});
