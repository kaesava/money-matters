import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../../lib/format';

export interface MobileMatrixColumnData {
  id: string;
  sourceName?: string;
  date?: string | null;
  dateLabel?: string;
  totalIncome: number;
  hiddenAllocationsTotal?: number;
}

interface MobileMatrixPaydayColumnHeaderProps {
  readonly col: MobileMatrixColumnData;
  readonly isConfirmed: boolean;
  readonly isSaved: boolean;
  readonly isSaving?: boolean;
  readonly onReview: (colId: string) => void;
  readonly onSave: (colId: string, totalIncome: number) => void;
  readonly onDelete: (colId: string) => void;
}

export const MobileMatrixPaydayColumnHeader: React.FC<MobileMatrixPaydayColumnHeaderProps> = ({
  col,
  isConfirmed,
  isSaved,
  isSaving,
  onReview,
  onSave,
  onDelete,
}) => {
  const dateStr = col.date ? formatDate(col.date) : col.dateLabel || '';

  return (
    <View
      style={[
        styles.columnHeader,
        isConfirmed && styles.confirmedCol,
        isSaved && styles.savedCol,
      ]}
    >
      {/* Row 1: Source Name */}
      <Text style={styles.sourceName} numberOfLines={1}>
        {col.sourceName || t('common.income')}
      </Text>

      {/* Row 2: Date */}
      <Text style={styles.dateText}>{dateStr}</Text>

      {/* Row 3: Total Income */}
      <Text style={styles.incomeAmount}>+{formatAUD(col.totalIncome)}</Text>

      {/* Row 4: Actions & Badges */}
      {isConfirmed ? (
        <View style={styles.actionRow}>
          <View style={styles.confirmedBadge}>
            <Text style={styles.confirmedBadgeText}>{t('matrix.confirmedBadge')}</Text>
          </View>
          <TouchableOpacity onPress={() => onReview(col.id)} style={styles.reviewBtn}>
            <Text style={styles.reviewText}>{t('matrix.review')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actionRow}>
          {isSaved && (
            <View style={styles.savedBadge}>
              <Text style={styles.savedBadgeText}>{t('matrix.savedBadge')}</Text>
            </View>
          )}

          <TouchableOpacity onPress={() => onReview(col.id)} style={styles.reviewBtn}>
            <Text style={styles.reviewText}>{t('matrix.review')}</Text>
          </TouchableOpacity>

          <Text style={styles.separator}>|</Text>

          {!isSaved && (
            <>
              <TouchableOpacity
                onPress={() => onSave(col.id, col.totalIncome)}
                disabled={isSaving}
                style={styles.saveBtn}
              >
                <Text style={styles.saveText}>{isSaving ? '…' : t('matrix.save')}</Text>
              </TouchableOpacity>
              <Text style={styles.separator}>|</Text>
            </>
          )}

          <TouchableOpacity onPress={() => onDelete(col.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {col.hiddenAllocationsTotal !== undefined && col.hiddenAllocationsTotal > 0 && (
        <Text style={styles.privateFootnote}>
          ({formatAUD(col.hiddenAllocationsTotal)} {t('common.private')})
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  columnHeader: {
    width: 140,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: DESIGN_TOKENS.colors.slate[200],
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    gap: 3,
  },
  confirmedCol: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
  },
  savedCol: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  sourceName: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: 'center',
  },
  incomeAmount: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.successDark,
    textAlign: 'center',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  confirmedBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: DESIGN_TOKENS.colors.successBorder,
  },
  confirmedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.successDark,
  },
  savedBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
  },
  savedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.accentDark,
  },
  reviewBtn: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  reviewText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  saveBtn: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  saveText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  deleteBtn: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  deleteText: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.burnRed,
  },
  separator: {
    fontSize: 10,
    color: DESIGN_TOKENS.colors.slate[300],
  },
  privateFootnote: {
    fontSize: 9,
    color: DESIGN_TOKENS.colors.slate[400],
    marginTop: 2,
  },
});
