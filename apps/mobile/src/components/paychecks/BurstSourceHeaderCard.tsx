import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../lib/format';
import { BurstSourceItem } from './burst-types';

interface BurstSourceHeaderCardProps {
  source: BurstSourceItem;
  freqLabel: string;
  isIncome: boolean;
  onEditSchedule: () => void;
}

export function BurstSourceHeaderCard({
  source,
  freqLabel,
  isIncome,
  onEditSchedule,
}: BurstSourceHeaderCardProps) {
  return (
    <View style={styles.sourceMetaCard}>
      <View style={styles.metaRow}>
        <View style={styles.badgeWrap}>
          <Text style={[styles.freqBadgeText, isIncome ? styles.incomeBadge : styles.expenseBadge]}>
            {freqLabel}
          </Text>
        </View>
        <Text style={[styles.amountText, isIncome ? styles.incomeText : styles.expenseText]}>
          {isIncome ? '+' : '−'}{formatAUD(parseFloat(String(source.amount)))}
        </Text>
      </View>

      <View style={styles.detailsRow}>
        {source.startDate && (
          <Text style={styles.metaSubtext}>
            {t('common.date')}: {formatDate(source.startDate)}
          </Text>
        )}
        {isIncome && source.accountName && (
          <Text style={styles.metaSubtext}>
            🏦 {source.accountName}
          </Text>
        )}
        {!isIncome && source.categoryName && (
          <Text style={styles.metaSubtext}>
            📁 {source.categoryName}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.editScheduleBtn}
        onPress={onEditSchedule}
      >
        <Feather name="edit-2" size={13} color={DESIGN_TOKENS.colors.sereneBlue} />
        <Text style={styles.editScheduleText}>
          {isIncome ? t('incomeAndBills.incomeSchedule') : t('incomeAndBills.billSchedule')} {t('common.edit')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sourceMetaCard: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 14,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeWrap: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  freqBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  incomeBadge: { color: DESIGN_TOKENS.colors.successDark },
  expenseBadge: { color: DESIGN_TOKENS.colors.sereneBlue },
  amountText: {
    fontSize: 17,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  incomeText: { color: DESIGN_TOKENS.colors.successDark },
  expenseText: { color: DESIGN_TOKENS.colors.critical },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  metaSubtext: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
    fontWeight: '500',
  },
  editScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
  },
  editScheduleText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
});
