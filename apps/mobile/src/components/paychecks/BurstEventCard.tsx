import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../lib/format';
import { BurstEventItem } from './burst-types';
import { BurstEventEditForm } from './BurstEventEditForm';

interface BurstEventCardProps {
  evt: BurstEventItem;
  isIncome: boolean;
  isEditing: boolean;
  isFuture: boolean;
  editAmount: string;
  editDate: string;
  submitting: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEditAmountChange: (val: string) => void;
  onEditDateChange: (val: string) => void;
  onSaveEdit: () => void;
  onMarkPaid: () => void;
  onDeleteOccurrence: () => void;
}

export function BurstEventCard({
  evt,
  isIncome,
  isEditing,
  isFuture,
  editAmount,
  editDate,
  submitting,
  onStartEdit,
  onCancelEdit,
  onEditAmountChange,
  onEditDateChange,
  onSaveEdit,
  onMarkPaid,
  onDeleteOccurrence,
}: BurstEventCardProps) {
  const isPaid = evt.status === 'CONFIRMED';
  const amtVal = parseFloat(evt.actualAmount || evt.expectedAmount || '0');

  return (
    <View style={[styles.eventItemCard, isPaid && styles.paidEventItemCard]}>
      <View style={styles.eventItemHeader}>
        <View style={styles.dateCol}>
          <View style={styles.statusIndicatorRow}>
            <Text style={styles.statusDot}>{isPaid ? '✓' : '📅'}</Text>
            <Text style={styles.eventDateText}>{formatDate(evt.expectedDate)}</Text>
            {isPaid && (
              <View style={styles.paidBadge}>
                <Text style={styles.paidBadgeText}>
                  {t('expenseStatus.confirmedLabel')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {!isEditing && (
          <Text style={[styles.eventAmountText, isIncome ? styles.incomeText : styles.expenseText]}>
            {isIncome ? '+' : '−'}{formatAUD(amtVal)}
          </Text>
        )}
      </View>

      {isEditing ? (
        <BurstEventEditForm
          editAmount={editAmount}
          editDate={editDate}
          isIncome={isIncome}
          isFuture={isFuture}
          submitting={submitting}
          onEditAmountChange={onEditAmountChange}
          onEditDateChange={onEditDateChange}
          onSaveEdit={onSaveEdit}
          onMarkPaid={onMarkPaid}
          onCancelEdit={onCancelEdit}
        />
      ) : (
        !isPaid && (
          <View style={styles.itemActionRow}>
            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={onMarkPaid}
              disabled={submitting}
            >
              <Feather name="check" size={12} color={DESIGN_TOKENS.colors.onPrimary} />
              <Text style={styles.actionBtnPrimaryText}>
                {isIncome ? t('common.runSplit') : t('common.markSpent')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnOutline}
              onPress={onStartEdit}
              disabled={submitting}
            >
              <Feather name="edit-2" size={12} color={DESIGN_TOKENS.colors.slate[600]} />
              <Text style={styles.actionBtnOutlineText}>{t('common.edit')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnDanger}
              onPress={onDeleteOccurrence}
              disabled={submitting}
            >
              <Feather name="trash-2" size={12} color={DESIGN_TOKENS.colors.critical} />
              <Text style={styles.actionBtnDangerText}>{t('common.delete')}</Text>
            </TouchableOpacity>
          </View>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  eventItemCard: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 12,
    gap: 8,
  },
  paidEventItemCard: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderColor: DESIGN_TOKENS.colors.successBorder,
  },
  eventItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateCol: {
    flex: 1,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    fontSize: 12,
  },
  eventDateText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.primary,
  },
  paidBadge: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  paidBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.successDark,
    textTransform: 'uppercase',
  },
  eventAmountText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  incomeText: { color: DESIGN_TOKENS.colors.successDark },
  expenseText: { color: DESIGN_TOKENS.colors.critical },
  itemActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DESIGN_TOKENS.colors.successDark,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionBtnPrimaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.onPrimary,
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionBtnOutlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  actionBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionBtnDangerText: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.critical,
  },
});
