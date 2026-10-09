import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatAUD } from '../../../lib/format';

export interface MobileMatrixCategoryItem {
  id: string;
  name: string;
  currentBalance: number;
  monthlyAmount?: number | null;
  targetAmount?: number | null;
  everydayAllowanceAmount?: number | null;
  isPrivate?: boolean;
}

export interface MobileMatrixGroupData {
  id: string;
  title: string;
  rows: Array<{
    categoryId: string;
    categoryName: string;
    isSurplusTarget?: boolean;
  }>;
}

interface MobileMatrixFrozenColumnProps {
  readonly groups: MobileMatrixGroupData[];
  readonly categories: MobileMatrixCategoryItem[];
  readonly collapsedGroups: Record<string, boolean>;
  readonly onToggleGroup: (groupId: string) => void;
  readonly onOpenCategoryDrawer: (poolId: string, poolName: string) => void;
}

export const MobileMatrixFrozenColumn: React.FC<MobileMatrixFrozenColumnProps> = ({
  groups,
  categories,
  collapsedGroups,
  onToggleGroup,
  onOpenCategoryDrawer,
}) => {
  return (
    <View style={styles.frozenColumnContainer}>
      {/* Top Header matching Payday Column Header height */}
      <View style={styles.frozenHeader}>
        <Text style={styles.frozenHeaderText}>
          {t('paydayDrawer.tableColPool')}
        </Text>
      </View>

      {/* Group and Category Rows */}
      {groups.map((group) => {
        const isSurplus = group.id === 'surplus';
        const isCollapsed = !isSurplus && Boolean(collapsedGroups[group.id]);

        return (
          <View key={group.id} style={styles.groupContainer}>
            {/* Group Header Row */}
            <TouchableOpacity
              activeOpacity={isSurplus ? 1 : 0.7}
              onPress={() => !isSurplus && onToggleGroup(group.id)}
              style={styles.groupHeaderRow}
            >
              {!isSurplus && (
                <Feather
                  name={isCollapsed ? 'chevron-right' : 'chevron-down'}
                  size={12}
                  color={DESIGN_TOKENS.colors.slate[500]}
                />
              )}
              <Text style={styles.groupTitleText} numberOfLines={1}>
                {group.title}
              </Text>
            </TouchableOpacity>

            {/* Category Rows */}
            {!isCollapsed &&
              group.rows.map((row) => {
                const cat = categories.find((c) => c.id === row.categoryId);
                const curBal = cat ? cat.currentBalance : 0;
                const targetVal = cat
                  ? cat.monthlyAmount ?? cat.targetAmount ?? cat.everydayAllowanceAmount
                  : null;

                return (
                  <View key={row.categoryId} style={styles.categoryRow}>
                    <TouchableOpacity
                      onPress={() => onOpenCategoryDrawer(row.categoryId, row.categoryName)}
                      style={styles.categoryNameTouch}
                    >
                      <Text style={styles.categoryNameText} numberOfLines={1}>
                        {row.categoryName}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.categoryMetaText} numberOfLines={1}>
                      {t('matrix.balanceShort')}: {formatAUD(curBal)}
                      {targetVal != null && targetVal > 0 ? ` / ${formatAUD(targetVal)}` : ''}
                    </Text>
                  </View>
                );
              })}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  frozenColumnContainer: {
    width: 150,
    borderRightWidth: 1,
    borderRightColor: DESIGN_TOKENS.colors.slate[200],
    backgroundColor: DESIGN_TOKENS.colors.surface,
  },
  frozenHeader: {
    height: 104,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[200],
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
  },
  frozenHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  groupContainer: {
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[200],
  },
  groupHeaderRow: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  groupTitleText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
    flex: 1,
  },
  categoryRow: {
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[100],
  },
  categoryNameTouch: {
    paddingVertical: 1,
  },
  categoryNameText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  categoryMetaText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 1,
  },
});
