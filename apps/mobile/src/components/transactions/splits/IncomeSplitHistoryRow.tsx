import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatAUD, formatDate } from '../../../lib/format';
import { t } from '@money-matters/i18n';
import { MobilePaydayAllocationRecord } from '../../paychecks/MobilePaydayAllocationDetailModal';

export interface IncomeSplitHistoryRowProps {
  item: MobilePaydayAllocationRecord;
  onPress: () => void;
}

export function IncomeSplitHistoryRow({ item, onPress }: IncomeSplitHistoryRowProps) {
  const displayName = item.incomeName || t('paydayDrawer.incomeDepositDefault');
  const displayAccount = item.receivingAccountName || t('paydayDrawer.mainAccountDefault');

  return (
    <TouchableOpacity style={styles.planCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.planHeader}>
        <View style={styles.titleWrap}>
          <Text style={styles.planTitle}>{displayName}</Text>
          <Text style={styles.planSubtitle}>{displayAccount}</Text>
        </View>
        <Text style={styles.planAmount}>+{formatAUD(item.totalIncomeAmount)}</Text>
      </View>

      <View style={styles.planFooter}>
        <View style={styles.datesCol}>
          <Text style={styles.planDateText}>
            <Text style={styles.planDateLabel}>{t('paydayDrawer.incomeDate')}: </Text>
            {formatDate(item.expectedDate)}
          </Text>
          <Text style={styles.planDateText}>
            <Text style={styles.planDateLabel}>{t('paydayDrawer.incomeSplitDate')}: </Text>
            {formatDate(item.createdAt || item.expectedDate)}
          </Text>
        </View>
        <View style={styles.detailsBtn}>
          <Text style={styles.detailsBtnText}>{t('transactions.details')}</Text>
          <Feather
            name="chevron-right"
            size={14}
            color={DESIGN_TOKENS.colors.sereneBlue}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  planCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    padding: 14,
    gap: 12,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
  },
  planSubtitle: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
  },
  planAmount: {
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    color: DESIGN_TOKENS.colors.successDark,
  },
  planFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.border,
    paddingTop: 10,
  },
  datesCol: {
    gap: 2,
  },
  planDateText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
  },
  planDateLabel: {
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
});
