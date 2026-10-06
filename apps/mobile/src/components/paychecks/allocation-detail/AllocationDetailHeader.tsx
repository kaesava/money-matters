import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../../lib/format';
import type { MobilePaydayAllocationRecord } from '../MobilePaydayAllocationDetailModal';

interface AllocationDetailHeaderProps {
  allocation: MobilePaydayAllocationRecord;
  totalIncome: number;
  isConfirmed: boolean;
}

export const AllocationDetailHeader: React.FC<AllocationDetailHeaderProps> = ({
  allocation,
  totalIncome,
  isConfirmed,
}) => {
  return (
    <View style={styles.topCard}>
      <View style={styles.topCardRow}>
        <View style={styles.flex1}>
          <Text style={styles.sourceTitle}>{allocation.incomeName}</Text>
          {allocation.receivingAccountName && (
            <Text style={styles.accountMeta}>
              {t('paydayDrawer.bankAccount')}: {allocation.receivingAccountName}
            </Text>
          )}
        </View>

        <View style={styles.statusCol}>
          <View
            style={[
              styles.statusBadge,
              isConfirmed ? styles.confirmedBadge : styles.savedBadge,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isConfirmed ? styles.confirmedText : styles.savedText,
              ]}
            >
              {isConfirmed ? t('transactions.statusConfirmed') : t('transactions.statusDraft')}
            </Text>
          </View>
          <Text style={styles.totalIncomeText}>{formatAUD(totalIncome)}</Text>
        </View>
      </View>

      <View style={styles.dateMetaBox}>
        <View style={styles.dateMetaRow}>
          <Text style={styles.dateMetaLabel}>{t('paydayDrawer.incomeDate')}:</Text>
          <Text style={styles.dateMetaValue}>{formatDate(allocation.expectedDate)}</Text>
        </View>
        <View style={styles.dateMetaRow}>
          <Text style={styles.dateMetaLabel}>{t('paydayDrawer.incomeSplitDate')}:</Text>
          <Text style={styles.dateMetaValue}>{formatDate(allocation.createdAt)}</Text>
        </View>
      </View>

      {allocation.note ? (
        <Text style={styles.noteText}>
          {t('paydayDrawer.incomeNote')}: {allocation.note}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  topCard: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 14,
    gap: 8,
  },
  topCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sourceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  accountMeta: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
  },
  statusCol: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  confirmedBadge: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
  },
  confirmedText: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  savedBadge: {
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
  },
  savedText: {
    color: DESIGN_TOKENS.colors.warningDark,
  },
  totalIncomeText: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.accent,
  },
  noteText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[600],
    fontStyle: 'italic',
  },
  dateMetaBox: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  dateMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateMetaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  dateMetaValue: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
  },
});
