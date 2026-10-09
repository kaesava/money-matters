import React, { useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { MobileMatrixFrozenColumn, MobileMatrixCategoryItem, MobileMatrixGroupData } from './MobileMatrixFrozenColumn';
import { MobileMatrixScrollableGrid } from './MobileMatrixScrollableGrid';
import { MobileMatrixFilterBar } from './MobileMatrixFilterBar';
import type { MobileMatrixColumnData } from './MobileMatrixPaydayColumnHeader';

export interface MobileSpreadsheetMatrixProps {
  readonly columns: MobileMatrixColumnData[];
  readonly groups: MobileMatrixGroupData[];
  readonly categories: MobileMatrixCategoryItem[];
  readonly columnStateMap: Record<string, 'AUTO' | 'SAVED' | 'CONFIRMED'>;
  readonly savedPlanOverrides?: Record<string, number>;
  readonly savingColId: string | null;
  readonly onReview: (colId: string) => void;
  readonly onSave: (colId: string, totalIncome: number) => void;
  readonly onDelete: (colId: string) => void;
  readonly onOpenCategoryDrawer: (poolId: string, poolName: string) => void;
}

export const MobileSpreadsheetMatrix: React.FC<MobileSpreadsheetMatrixProps> = ({
  columns,
  groups,
  categories,
  columnStateMap,
  savedPlanOverrides = {},
  savingColId,
  onReview,
  onSave,
  onDelete,
  onOpenCategoryDrawer,
}) => {
  const [showFull12, setShowFull12] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'CONFIRMED'>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'SHARED' | 'PRIVATE'>('ALL');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Horizon filtering (Next 5 vs 12 months)
  const horizonColumns = showFull12 ? columns : columns.slice(0, 5);

  // Status & Scope column filtering
  const filteredColumns = useMemo(() => {
    return horizonColumns.filter((col) => {
      const state = columnStateMap[col.id] || 'AUTO';
      const isConfirmed = state === 'CONFIRMED';
      if (statusFilter === 'PENDING' && isConfirmed) return false;
      if (statusFilter === 'CONFIRMED' && !isConfirmed) return false;
      return true;
    });
  }, [horizonColumns, columnStateMap, statusFilter]);

  // Scope category filtering
  const filteredCategories = useMemo(() => {
    if (scopeFilter === 'PRIVATE') return categories.filter((c) => c.isPrivate);
    if (scopeFilter === 'SHARED') return categories.filter((c) => !c.isPrivate);
    return categories;
  }, [categories, scopeFilter]);

  // Cell values map with saved overrides applied
  const cellValues = useMemo(() => {
    const map: Record<string, { allocated: number; projectedBalance: number }> = {};
    for (const group of groups) {
      for (const row of group.rows) {
        for (const col of filteredColumns) {
          const key = `${col.id}_${row.categoryId}`;
          const rawRow = row as { cells?: Record<string, { allocated: number; projectedBalance?: number }> };
          const baseCell = rawRow.cells?.[col.id];
          const overrideVal = savedPlanOverrides[key];
          const allocated = overrideVal !== undefined ? overrideVal : (baseCell?.allocated || 0);
          const projectedBalance = baseCell?.projectedBalance ?? 0;
          map[key] = { allocated, projectedBalance };
        }
      }
    }
    return map;
  }, [groups, filteredColumns, savedPlanOverrides]);

  return (
    <View style={styles.rootContainer}>
      {/* Top Filter & Horizon Bar */}
      <MobileMatrixFilterBar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        scopeFilter={scopeFilter}
        onScopeFilterChange={setScopeFilter}
        showFull12={showFull12}
        onToggleHorizon={() => setShowFull12((prev) => !prev)}
      />

      {/* Spreadsheet Table Container */}
      <View style={styles.tableCard}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.tableVerticalContent}
        >
          <View style={styles.tableRowContainer}>
            {/* Frozen Left Column */}
            <MobileMatrixFrozenColumn
              groups={groups}
              categories={filteredCategories}
              collapsedGroups={collapsedGroups}
              onToggleGroup={toggleGroup}
              onOpenCategoryDrawer={onOpenCategoryDrawer}
            />

            {/* Scrollable Payday Columns Grid */}
            <MobileMatrixScrollableGrid
              columns={filteredColumns}
              groups={groups}
              cellValues={cellValues}
              columnStateMap={columnStateMap}
              savingColId={savingColId}
              collapsedGroups={collapsedGroups}
              onReview={onReview}
              onSave={onSave}
              onDelete={onDelete}
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    gap: 8,
  },
  tableCard: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    backgroundColor: DESIGN_TOKENS.colors.surface,
    overflow: 'hidden',
  },
  tableVerticalContent: {
    flexGrow: 1,
  },
  tableRowContainer: {
    flexDirection: 'row',
  },
});
