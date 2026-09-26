import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { formatAUD, formatDate } from '../../lib/format';

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
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.badgeRow}>
            <Text style={styles.cycleBadge}>Payday #{index + 1}</Text>
            {isConfirmed ? (
              <View style={styles.confirmedBadge}>
                <Text style={styles.confirmedBadgeText}>{t('matrix.confirmedBadge')}</Text>
              </View>
            ) : isSaved ? (
              <View style={styles.savedBadge}>
                <Text style={styles.savedBadgeText}>{t('matrix.savedBadge')}</Text>
              </View>
            ) : null}
            {isDeficit ? (
              <View style={styles.deficitBadge}>
                <Text style={styles.deficitText}>
                  ⚠️ Deficit {formatAUD(Math.abs(surplusAmount))}
                </Text>
              </View>
            ) : (
              <View style={styles.surplusBadge}>
                <Text style={styles.surplusText}>
                  Surplus {formatAUD(surplusAmount)}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.payDate}>
            {item.date ? formatDate(item.date) : item.dateLabel || ''}
          </Text>
          <Text style={styles.sourceName}>{item.sourceName || ''}</Text>
        </View>

        <View style={styles.incomeCol}>
          <Text style={styles.incomeLabel}>Net Pay</Text>
          <Text style={styles.incomeAmount}>{formatAUD(item.totalIncome)}</Text>
        </View>
      </View>

      {/* Summary Allocations Breakdown */}
      <View style={styles.breakdownGrid}>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownItemLabel}>📅 Bills</Text>
          <Text style={styles.breakdownItemVal}>{formatAUD(billsTotal)}</Text>
        </View>

        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownItemLabel}>🎯 Goals</Text>
          <Text style={styles.breakdownItemVal}>{formatAUD(goalsTotal)}</Text>
        </View>

        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownItemLabel}>☕ Everyday</Text>
          <Text style={styles.breakdownItemVal}>{formatAUD(everydayTotal)}</Text>
        </View>
      </View>

      {/* Expandable Bills Accordion */}
      <TouchableOpacity onPress={onToggleExpand} style={styles.accordionToggle}>
        <Text style={styles.accordionToggleText}>
          {isExpanded ? 'Hide Scheduled Bills' : 'Show Scheduled Bills'}
        </Text>
        <Feather
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#2563eb"
        />
      </TouchableOpacity>

      {isExpanded && billsGroup && (
        <View style={styles.billsList}>
          {billsGroup.rows
            .filter((r) => (r.cells[item.id]?.allocated || 0) > 0)
            .map((r) => {
              const allocated = r.cells[item.id]?.allocated || 0;
              return (
                <TouchableOpacity
                  key={r.categoryId}
                  style={styles.billRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (onOpenCategoryModal) {
                      onOpenCategoryModal({
                        poolId: r.categoryId,
                        poolName: r.categoryName,
                        events: [
                          {
                            id: `ev_${r.categoryId}_${item.id}`,
                            name: r.categoryName,
                            amount: allocated,
                            dueDate: item.date || '',
                            status: planStatus,
                          },
                        ],
                      });
                    }
                  }}
                >
                  <Text style={styles.billName} numberOfLines={1}>
                    {r.categoryName}
                  </Text>
                  <View style={styles.billRight}>
                    <Text style={styles.billAmount}>{formatAUD(allocated)}</Text>
                    <Feather name="chevron-right" size={13} color="#94A3B8" />
                  </View>
                </TouchableOpacity>
              );
            })}
        </View>
      )}

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={onReview} style={styles.reviewBtn}>
          <Feather name="sliders" size={14} color="#FFFFFF" />
          <Text style={styles.reviewBtnText}>{t('matrix.review')}</Text>
        </TouchableOpacity>

        {!isConfirmed && !isSaved && (
          <TouchableOpacity onPress={onSave} style={styles.saveBtn}>
            <Feather name="bookmark" size={14} color="#2563eb" />
            <Text style={styles.saveBtnText}>{t('matrix.save')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Feather name="trash-2" size={14} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  cycleBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  confirmedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  confirmedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  savedBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E40AF',
  },
  surplusBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  surplusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  deficitBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deficitText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#BA1A1A',
  },
  payDate: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1B2B4B',
  },
  sourceName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  incomeCol: {
    alignItems: 'flex-end',
  },
  incomeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  incomeAmount: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: '#2563eb',
  },
  breakdownGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  breakdownItemLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  breakdownItemVal: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#1B2B4B',
    marginTop: 2,
  },
  accordionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  accordionToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  billsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  billName: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    marginRight: 8,
  },
  billRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  billAmount: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
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
    color: '#FFFFFF',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
