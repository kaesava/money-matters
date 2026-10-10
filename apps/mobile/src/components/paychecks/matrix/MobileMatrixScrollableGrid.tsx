import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import {
  MobileMatrixPaydayColumnHeader,
  MobileMatrixColumnData,
} from './MobileMatrixPaydayColumnHeader';
import { MobileMatrixCell } from './MobileMatrixCell';
import type { MobileMatrixGroupData } from './MobileMatrixFrozenColumn';

interface MobileMatrixScrollableGridProps {
  readonly columns: MobileMatrixColumnData[];
  readonly groups: MobileMatrixGroupData[];
  readonly cellValues: Record<string, { allocated: number; projectedBalance: number }>;
  readonly columnStateMap: Record<string, 'AUTO' | 'SAVED' | 'CONFIRMED'>;
  readonly savingColId: string | null;
  readonly collapsedGroups: Record<string, boolean>;
  readonly onReview: (colId: string) => void;
  readonly onSave: (colId: string, totalIncome: number) => void;
  readonly onReset?: (colId: string) => void;
  readonly onDelete: (colId: string) => void;
}

export const MobileMatrixScrollableGrid: React.FC<MobileMatrixScrollableGridProps> = ({
  columns,
  groups,
  cellValues,
  columnStateMap,
  savingColId,
  collapsedGroups,
  onReview,
  onSave,
  onReset,
  onDelete,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={true}
      contentContainerStyle={styles.scrollContainer}
    >
      {columns.map((col) => {
        const colState = columnStateMap[col.id] || 'AUTO';
        const isConfirmed = colState === 'CONFIRMED';
        const isSaved = colState === 'SAVED';
        const isSaving = savingColId === col.id;

        return (
          <View key={col.id} style={styles.columnWrapper}>
            {/* Column Header */}
            <MobileMatrixPaydayColumnHeader
              col={col}
              isConfirmed={isConfirmed}
              isSaved={isSaved}
              isSaving={isSaving}
              onReview={onReview}
              onSave={onSave}
              onReset={onReset}
              onDelete={onDelete}
            />

            {/* Column Body Cells by Group */}
            {groups.map((group) => {
              const isSurplus = group.id === 'surplus';
              const isCollapsed = !isSurplus && Boolean(collapsedGroups[group.id]);

              return (
                <View key={group.id} style={styles.groupCellsContainer}>
                  {/* Empty group header spacer to match frozen column group row height */}
                  <View style={styles.groupHeaderSpacer} />

                  {!isCollapsed &&
                    group.rows.map((row) => {
                      const cellKey = `${col.id}_${row.categoryId}`;
                      const cell = cellValues[cellKey] || {
                        allocated: 0,
                        projectedBalance: 0,
                      };

                      return (
                        <View key={row.categoryId} style={styles.cellRowWrapper}>
                          <MobileMatrixCell
                            value={cell.allocated}
                            projectedBalance={cell.projectedBalance}
                            isSurplusTarget={row.isSurplusTarget}
                          />
                        </View>
                      );
                    })}
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexDirection: 'row',
  },
  columnWrapper: {
    width: 140,
    borderRightWidth: 1,
    borderRightColor: DESIGN_TOKENS.colors.slate[200],
    backgroundColor: DESIGN_TOKENS.colors.surface,
  },
  groupCellsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[200],
  },
  groupHeaderSpacer: {
    height: 38,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[200],
  },
  cellRowWrapper: {
    height: 52,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[100],
  },
});
