import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../../lib/format';
import type { MatrixPaydayColumn, MatrixPaydayGroup } from '../MatrixPaydayCard';

interface MatrixPaydayBillsAccordionProps {
  readonly item: MatrixPaydayColumn;
  readonly billsGroup?: MatrixPaydayGroup;
  readonly isExpanded: boolean;
  readonly planStatus?: 'PENDING' | 'CONFIRMED';
  readonly onToggleExpand: () => void;
  readonly onOpenCategoryModal?: (params: {
    poolId: string;
    poolName: string;
    events: { id: string; name: string; amount: string | number; dueDate: string; status?: string }[];
  }) => void;
}

export const MatrixPaydayBillsAccordion: React.FC<MatrixPaydayBillsAccordionProps> = ({
  item,
  billsGroup,
  isExpanded,
  planStatus,
  onToggleExpand,
  onOpenCategoryModal,
}) => {
  return (
    <>
      <TouchableOpacity onPress={onToggleExpand} style={styles.accordionToggle}>
        <Text style={styles.accordionToggleText}>
          {isExpanded ? t('matrix.hideBills') : t('matrix.showBills')}
        </Text>
        <Feather
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={DESIGN_TOKENS.colors.accent}
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
                    <Feather name="chevron-right" size={13} color={DESIGN_TOKENS.colors.slate[400]} />
                  </View>
                </TouchableOpacity>
              );
            })}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
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
    color: DESIGN_TOKENS.colors.accent,
  },
  billsList: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
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
    color: DESIGN_TOKENS.colors.slate[700],
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
    color: DESIGN_TOKENS.colors.primary,
  },
});
