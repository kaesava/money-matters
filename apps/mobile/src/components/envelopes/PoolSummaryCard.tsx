import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD } from '../../lib/format';

interface PoolSummaryCardProps {
  pool: {
    id: string;
    name: string;
    envelopeType?: string;
    poolType?: string;
    currentBalance?: number | string | null;
    isSurplusTarget?: boolean | null;
  };
  bankAccountName?: string | null;
  onEdit: () => void;
}

export function PoolSummaryCard({
  pool,
  bankAccountName,
  onEdit,
}: PoolSummaryCardProps) {
  const badgeText = pool.envelopeType === 'SCHEDULED_BILL'
    ? t('categories.scheduledBillBadge')
    : pool.envelopeType === 'FLEXIBLE_BILL'
    ? t('categories.flexibleBillBadge')
    : pool.envelopeType === 'TARGET_GOAL'
    ? t('categories.targetDateGoalBadge')
    : pool.envelopeType === 'ONGOING_GOAL'
    ? t('categories.ongoingGoalBadge')
    : pool.envelopeType === 'EVERYDAY' || pool.poolType === 'EVERYDAY'
    ? t('categories.everydayBadge')
    : pool.poolType === 'GOAL'
    ? t('poolTypes.goals')
    : t('poolTypes.bills');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.tagsRow}>
            <View style={[
              styles.badgeWrap,
              pool.envelopeType === 'SCHEDULED_BILL'
                ? styles.scheduledBillBadge
                : pool.envelopeType === 'FLEXIBLE_BILL'
                ? styles.flexibleBillBadge
                : pool.envelopeType === 'TARGET_GOAL'
                ? styles.targetGoalBadge
                : pool.envelopeType === 'ONGOING_GOAL'
                ? styles.ongoingGoalBadge
                : styles.everydayBadge
            ]}>
              <Text style={[
                styles.poolTypeTag,
                pool.envelopeType === 'SCHEDULED_BILL'
                  ? styles.scheduledBillBadgeText
                  : pool.envelopeType === 'FLEXIBLE_BILL'
                  ? styles.flexibleBillBadgeText
                  : pool.envelopeType === 'TARGET_GOAL'
                  ? styles.targetGoalBadgeText
                  : pool.envelopeType === 'ONGOING_GOAL'
                  ? styles.ongoingGoalBadgeText
                  : styles.everydayBadgeText
              ]}>
                {badgeText}
              </Text>
            </View>
            {pool.isSurplusTarget && (
              <View style={styles.surplusPill}>
                <Text style={styles.surplusPillText}>{t('categories.surplusBadgeText')}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{pool.name}</Text>
          {bankAccountName && (
            <Text style={styles.bankNameMeta}>
              {t('categories.linkedAccount', { name: bankAccountName })}
            </Text>
          )}
        </View>

        <View style={styles.balanceCol}>
          <Text style={styles.balanceLabel}>{t('categories.currentBalance')}</Text>
          <Text style={styles.balanceAmount}>{formatAUD(pool.currentBalance ?? 0)}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={onEdit} style={styles.primaryActionBtn}>
          <Feather name="edit-2" size={15} color="#FFFFFF" />
          <Text style={styles.primaryActionBtnText}>{t('categories.editPool')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  badgeWrap: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  poolTypeTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
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
  surplusPill: { backgroundColor: DESIGN_TOKENS.colors.successLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  surplusPillText: { fontSize: 10, fontWeight: '700', color: DESIGN_TOKENS.colors.successDark },
  name: { fontSize: 18, fontWeight: '900', color: DESIGN_TOKENS.colors.primary },
  bankNameMeta: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, marginTop: 2 },
  balanceCol: { alignItems: 'flex-end' },
  balanceLabel: { fontSize: 10, fontWeight: '700', color: DESIGN_TOKENS.colors.slate[400], textTransform: 'uppercase' },
  balanceAmount: { fontSize: 20, fontWeight: '900', fontFamily: 'monospace', color: DESIGN_TOKENS.colors.accent },
  actionRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: DESIGN_TOKENS.colors.slate[100], paddingTop: 12 },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderRadius: 12,
    paddingVertical: 10,
    shadowColor: DESIGN_TOKENS.colors.accent,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  primaryActionBtnText: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.onAccent },
});
