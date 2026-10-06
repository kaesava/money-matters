import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { MatrixPaydayHeader } from './matrix/MatrixPaydayHeader';
import { MatrixPaydaySummaryGrid } from './matrix/MatrixPaydaySummaryGrid';
import { MatrixPaydayBillsAccordion } from './matrix/MatrixPaydayBillsAccordion';

export interface MatrixPaydayColumn {
  id: string;
  date?: string | null;
  dateLabel?: string;
  sourceName?: string;
  totalIncome: number;
  hiddenAllocationsTotal?: number;
}

export interface MatrixPaydayGroupRow {
  categoryId: string;
  categoryName: string;
  cells: Record<string, { allocated: number }>;
}

export interface MatrixPaydayGroup {
  id: string;
  title?: string;
  name?: string;
  rows: MatrixPaydayGroupRow[];
}

export interface MatrixPaydayCardProps {
  item: MatrixPaydayColumn;
  index: number;
  groups: MatrixPaydayGroup[];
  cardWidth: number;
  isExpanded: boolean;
  planStatus?: 'PENDING' | 'CONFIRMED';
  onToggleExpand: () => void;
  onReview: () => void;
  onSave: () => void;
  onDelete: () => void;
  onOpenCategoryModal?: (params: {
    poolId: string;
    poolName: string;
    events: { id: string; name: string; amount: string | number; dueDate: string; status?: string }[];
  }) => void;
}

export function MatrixPaydayCard({
  item,
  index,
  groups,
  cardWidth,
  isExpanded,
  planStatus,
  onToggleExpand,
  onReview,
  onSave,
  onDelete,
  onOpenCategoryModal,
}: MatrixPaydayCardProps) {
  let billsTotal = 0;
  let goalsTotal = 0;
  let everydayTotal = 0;
  let surplusAmount = 0;

  const billsGroup = groups.find((g) => g.id === 'bills');
  const goalsGroup = groups.find((g) => g.id === 'goals');
  const everydayGroup = groups.find((g) => g.id === 'everyday');
  const surplusGroup = groups.find((g) => g.id === 'surplus');

  if (billsGroup) {
    for (const r of billsGroup.rows) {
      billsTotal += r.cells[item.id]?.allocated || 0;
    }
  }
  if (goalsGroup) {
    for (const r of goalsGroup.rows) {
      goalsTotal += r.cells[item.id]?.allocated || 0;
    }
  }
  if (everydayGroup) {
    for (const r of everydayGroup.rows) {
      everydayTotal += r.cells[item.id]?.allocated || 0;
    }
  }
  if (surplusGroup && surplusGroup.rows[0]) {
    surplusAmount = surplusGroup.rows[0].cells[item.id]?.allocated || 0;
  }

  const isDeficit = surplusAmount < 0;
  const isConfirmed = planStatus === 'CONFIRMED';
  const isSaved = planStatus === 'PENDING';

  return (
    <View style={[styles.card, { width: cardWidth }]}>
      <MatrixPaydayHeader
        item={item}
        index={index}
        isConfirmed={isConfirmed}
        isSaved={isSaved}
        isDeficit={isDeficit}
        surplusAmount={surplusAmount}
      />

      <MatrixPaydaySummaryGrid
        billsTotal={billsTotal}
        goalsTotal={goalsTotal}
        everydayTotal={everydayTotal}
      />

      <MatrixPaydayBillsAccordion
        item={item}
        billsGroup={billsGroup}
        isExpanded={isExpanded}
        planStatus={planStatus}
        onToggleExpand={onToggleExpand}
        onOpenCategoryModal={onOpenCategoryModal}
      />

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={onReview} style={styles.reviewBtn}>
          <Feather name="sliders" size={14} color={DESIGN_TOKENS.colors.onAccent} />
          <Text style={styles.reviewBtnText}>{t('matrix.review')}</Text>
        </TouchableOpacity>

        {!isConfirmed && !isSaved && (
          <TouchableOpacity onPress={onSave} style={styles.saveBtn}>
            <Feather name="bookmark" size={14} color={DESIGN_TOKENS.colors.accent} />
            <Text style={styles.saveBtnText}>{t('matrix.save')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Feather name="trash-2" size={14} color={DESIGN_TOKENS.colors.critical} />
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
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 18,
    shadowColor: DESIGN_TOKENS.colors.slate[900],
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    gap: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewBtn: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reviewBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.onAccent,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.accent,
  },
  deleteBtn: {
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.criticalBorder,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MatrixPaydayCard;
