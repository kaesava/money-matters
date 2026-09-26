import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, SearchInput } from '@money-matters/ui/mobile';
import { formatAUD } from '../../lib/format';
import { t } from '@money-matters/i18n';

interface PoolCategoryPickerItem {
  id: string;
  name: string;
  poolType: string;
  currentBalance?: number | string;
  categories?: Array<{ id: string; name: string }>;
}

export interface MobilePoolCategoryPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  pools: PoolCategoryPickerItem[];
  selectedPoolId: string;
  selectedSubCategoryId?: string | null;
  onSelect: (selection: { poolId: string; subCategoryId?: string | null }) => void;
  allowSubcategories?: boolean;
  title?: string;
}

export function MobilePoolCategoryPickerSheet({
  visible,
  onClose,
  pools,
  selectedPoolId,
  selectedSubCategoryId,
  onSelect,
  allowSubcategories = true,
  title,
}: MobilePoolCategoryPickerSheetProps) {
  const [search, setSearch] = useState('');
  const D = DESIGN_TOKENS;

  const filteredPools = pools.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const poolMatch = p.name.toLowerCase().includes(q);
    const catMatch = p.categories?.some((c) => c.name.toLowerCase().includes(q));
    return poolMatch || catMatch;
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {title || t('drawers.quickExpense.selectPoolOrCategoryPlaceholder')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={D.colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <SearchInput
              value={search}
              onChangeText={setSearch}
              placeholder={t('categories.searchPlaceholder')}
            />
          </View>

          {/* Pool & Category List */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {filteredPools.map((pool) => {
              const isPoolSelected = pool.id === selectedPoolId && !selectedSubCategoryId;
              const bal = typeof pool.currentBalance === 'number'
                ? pool.currentBalance
                : parseFloat(pool.currentBalance as string || '0');

              return (
                <View key={pool.id} style={styles.poolGroup}>
                  {/* Pool Header Item */}
                  <TouchableOpacity
                    onPress={() => {
                      onSelect({ poolId: pool.id, subCategoryId: null });
                      onClose();
                    }}
                    style={[
                      styles.poolRow,
                      isPoolSelected && styles.poolRowSelected,
                    ]}
                  >
                    <View style={styles.poolRowLeft}>
                      <Text style={[styles.poolName, isPoolSelected && styles.poolNameSelected]}>
                        {pool.name}
                      </Text>
                      <View style={styles.badgeWrap}>
                        <Text style={styles.typeBadge}>
                          {pool.poolType === 'EVERYDAY'
                            ? t('poolTypes.everyday')
                            : pool.poolType === 'REGULAR'
                            ? t('poolTypes.bills')
                            : t('poolTypes.goals')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.poolBal}>{formatAUD(bal)}</Text>
                  </TouchableOpacity>

                  {/* Subcategories (if allowed) */}
                  {allowSubcategories && pool.categories && pool.categories.length > 0 && (
                    <View style={styles.subCatList}>
                      {pool.categories.map((cat) => {
                        const isCatSelected = selectedSubCategoryId === cat.id;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            onPress={() => {
                              onSelect({ poolId: pool.id, subCategoryId: cat.id });
                              onClose();
                            }}
                            style={[
                              styles.catRow,
                              isCatSelected && styles.catRowSelected,
                            ]}
                          >
                            <View style={styles.catLeft}>
                              <Feather name="corner-down-right" size={13} color="#94A3B8" />
                              <Text
                                style={[
                                  styles.catName,
                                  isCatSelected && styles.catNameSelected,
                                ]}
                              >
                                {cat.name}
                              </Text>
                            </View>
                            {isCatSelected && (
                              <Feather name="check" size={14} color={D.colors.accent} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: D.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: D.colors.primary,
  },
  closeBtn: {
    padding: 4,
  },
  searchWrap: {
    marginBottom: 12,
  },
  list: {
    gap: 12,
    paddingBottom: 20,
  },
  poolGroup: {
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  poolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  poolRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  poolRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  poolName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B2B4B',
  },
  poolNameSelected: {
    color: '#2563eb',
  },
  badgeWrap: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  poolBal: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#475569',
  },
  subCatList: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingLeft: 12,
    backgroundColor: '#FAFCFE',
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  catRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catName: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  catNameSelected: {
    color: '#2563eb',
    fontWeight: '700',
  },
});
