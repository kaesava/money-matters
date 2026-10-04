import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, SearchInput } from '@money-matters/ui/mobile';
import { useRouter } from 'expo-router';

interface PoolCategoriesSectionProps {
  poolId: string;
  categories: any[];
  allCount: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onAddCategory: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeFilterCount: number;
  onOpenFilter: () => void;
}

export function PoolCategoriesSection({
  poolId,
  categories,
  allCount,
  expanded,
  onToggleExpand,
  onAddCategory,
  searchQuery,
  onSearchChange,
  activeFilterCount,
  onOpenFilter,
}: PoolCategoriesSectionProps) {
  const router = useRouter();

  return (
    <>
      <View style={styles.sectionHeaderRow}>
        <TouchableOpacity onPress={onToggleExpand} style={styles.accordionHeaderBtn} activeOpacity={0.7}>
          <Feather name={expanded ? 'chevron-down' : 'chevron-right'} size={16} color="#1B2B4B" />
          <Text style={styles.sectionTitle}>
            {t('categories.poolCategories')} ({categories.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onAddCategory} style={styles.addCategoryBtn}>
          <Feather name="plus" size={14} color={DESIGN_TOKENS.colors.accent} />
          <Text style={styles.addCategoryText}>{t('categories.addCategory')}</Text>
        </TouchableOpacity>
      </View>

      {expanded && (
        <>
          {allCount > 0 && (
            <View style={styles.catFilterBar}>
              <View style={{ flex: 1 }}>
                <SearchInput
                  placeholder={t('categories.searchCategories')}
                  value={searchQuery}
                  onChangeText={onSearchChange}
                />
              </View>
              <TouchableOpacity
                style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
                onPress={onOpenFilter}
                activeOpacity={0.7}
              >
                <Feather name="sliders" size={15} color={activeFilterCount > 0 ? DESIGN_TOKENS.colors.accent : '#64748B'} />
                <Text style={[styles.filterBtnText, activeFilterCount > 0 && styles.filterBtnTextActive]}>
                  {t('common.filter')}
                  {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {categories.length > 0 ? (
            <View style={styles.categoriesList}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.75}
                  onPress={() =>
                    router.push(
                      `/(app)/categories/${cat.id}?returnTo=${encodeURIComponent(`/(app)/pools/${poolId}`)}` as never
                    )
                  }
                  style={styles.categoryCard}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.catTitleRow}>
                      <Text style={styles.catName}>{cat.name}</Text>
                      {cat.isEssential && (
                        <View style={styles.essentialBadge}>
                          <Text style={styles.essentialText}>{t('categories.essentialBadge')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.catFreq}>
                      {cat.budgetFrequency || t('categories.frequencyMonthly')}
                    </Text>
                  </View>

                  <View style={styles.nestedCatRight}>
                    <View style={styles.nestedCatAmountCol}>
                      <Text style={styles.nestedCatAmount}>
                        ${parseFloat(cat.monthlyAmount || '0').toFixed(2)}/mo
                      </Text>
                      {cat.enteredAmount && cat.budgetFrequency && cat.budgetFrequency !== 'MONTHLY' && (
                        <Text style={styles.nestedCatSubAmount}>
                          (${parseFloat(cat.enteredAmount).toFixed(2)}/{cat.budgetFrequency.toLowerCase()})
                        </Text>
                      )}
                    </View>
                    <Feather name="chevron-right" size={16} color="#94A3B8" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                {allCount === 0 ? t('categories.noCategoriesDefined') : t('categories.noCategoriesMatched')}
              </Text>
            </View>
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  accordionHeaderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: DESIGN_TOKENS.colors.primary },
  addCategoryBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addCategoryText: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.accent },
  catFilterBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 10 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: DESIGN_TOKENS.colors.surface, borderWidth: 1.5, borderColor: '#E2E8F0' },
  filterBtnActive: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  filterBtnText: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.textMuted },
  filterBtnTextActive: { color: DESIGN_TOKENS.colors.accent },
  categoriesList: { gap: 10 },
  categoryCard: { backgroundColor: DESIGN_TOKENS.colors.surface, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catName: { fontSize: 14, fontWeight: '700', color: DESIGN_TOKENS.colors.primary },
  essentialBadge: { backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  essentialText: { fontSize: 9, fontWeight: '700', color: '#BA1A1A' },
  catFreq: { fontSize: 11, color: DESIGN_TOKENS.colors.textMuted, marginTop: 2 },
  nestedCatRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nestedCatAmountCol: { alignItems: 'flex-end' },
  nestedCatAmount: { fontSize: 14, fontWeight: '800', fontFamily: 'monospace', color: DESIGN_TOKENS.colors.primary },
  nestedCatSubAmount: { fontSize: 11, color: DESIGN_TOKENS.colors.textMuted, fontFamily: 'monospace', marginTop: 1 },
  emptyBox: { backgroundColor: DESIGN_TOKENS.colors.surfaceVariant, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, textAlign: 'center' },
});
