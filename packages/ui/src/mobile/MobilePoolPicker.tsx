import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { FilterPill } from './FilterPill';

export interface MobilePoolOption {
  id: string;
  name: string;
  poolType?: string;
  isPrivate?: boolean | null;
  currentBalance?: string | number;
  categories?: Array<{ id: string; name: string }>;
}

export interface MobilePoolPickerProps {
  pools: MobilePoolOption[];
  selectedPoolId: string;
  onSelectPool?: (poolId: string) => void;
  onSelectCategory?: (poolId: string, categoryId: string | null) => void;
  selectedCategoryId?: string | null;
  allowCategorySelection?: boolean;
  allowAllOption?: boolean;
  allOptionLabel?: string;
  placeholder?: string;
  compact?: boolean;
  displayStyle?: 'pill' | 'field';
  label?: string;
  required?: boolean;
  error?: string;
}

export const MobilePoolPicker: React.FC<MobilePoolPickerProps> = ({
  pools,
  selectedPoolId,
  onSelectPool,
  onSelectCategory,
  selectedCategoryId,
  allowCategorySelection = false,
  allowAllOption = true,
  allOptionLabel,
  placeholder,
  compact = true,
  displayStyle = 'pill',
  label,
  required = false,
  error,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const resolvedAllLabel = allOptionLabel || t('transactions.allPools') || 'All Pools';
  const selectedPool = pools.find((p) => p.id === selectedPoolId);
  const selectedCat = selectedPool?.categories?.find((c) => c.id === selectedCategoryId);

  const displayLabel = useMemo(() => {
    if (!selectedPoolId || selectedPoolId === 'ALL') {
      return compact ? resolvedAllLabel : (placeholder || resolvedAllLabel);
    }
    if (selectedPool) {
      if (selectedCategoryId && selectedCat) {
        return `${selectedPool.name} › ${selectedCat.name}`;
      }
      return selectedPool.name;
    }
    return resolvedAllLabel;
  }, [selectedPoolId, selectedPool, selectedCategoryId, selectedCat, compact, resolvedAllLabel, placeholder]);

  const isAllActive = !selectedPoolId || selectedPoolId === 'ALL';

  const filteredPools = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return pools;
    return pools.filter((p) => {
      const matchPool = p.name.toLowerCase().includes(q) || (p.poolType && p.poolType.toLowerCase().includes(q));
      const matchCat = p.categories?.some((c) => c.name.toLowerCase().includes(q));
      return matchPool || matchCat;
    });
  }, [pools, searchQuery]);

  const handleSelect = (poolId: string, categoryId: string | null = null) => {
    if (onSelectCategory) {
      onSelectCategory(poolId, categoryId);
    }
    if (onSelectPool) {
      onSelectPool(poolId);
    }
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <>
      {displayStyle === 'pill' ? (
        <FilterPill
          label={displayLabel}
          isActive={!isAllActive}
          onPress={() => setModalVisible(true)}
        />
      ) : (
        <View style={{ marginBottom: 12 }}>
          {label ? (
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{label}</Text>
              {required ? <Text style={{ color: '#EF4444', marginLeft: 2 }}>*</Text> : null}
            </View>
          ) : null}
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={[styles.fieldCard, error ? styles.fieldCardError : null]}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Feather name="folder" size={18} color="#2563eb" />
            </View>
            <Text
              style={[
                styles.fieldCardText,
                !selectedPoolId ? styles.fieldCardPlaceholder : null,
              ]}
              numberOfLines={1}
            >
              {displayLabel}
            </Text>
            <Feather name="chevron-down" size={18} color="#94A3B8" />
          </TouchableOpacity>
          {error ? <Text style={styles.fieldError}>{error}</Text> : null}
        </View>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          setSearchQuery('');
        }}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => {
              setModalVisible(false);
              setSearchQuery('');
            }}
          />

          <View style={styles.sheetContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{t('categories.typeLabel') || 'Pool'}</Text>
                <Text style={styles.subtitle}>
                  {allowCategorySelection ? 'Select a Pool or Sub-Category' : t('transactions.filterByPool')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.closeBtn}
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchWrap}>
              <Feather name="search" size={14} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search pools or categories..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Feather name="x" size={14} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Options List */}
            <FlatList
              data={filteredPools}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                allowAllOption && !searchQuery.trim() ? (
                  <TouchableOpacity
                    style={[styles.itemRow, isAllActive && styles.itemRowSelected]}
                    onPress={() => handleSelect('ALL', null)}
                  >
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemText, isAllActive && styles.itemTextSelected]}>
                        {resolvedAllLabel}
                      </Text>
                    </View>
                    {isAllActive && <Feather name="check" size={16} color="#2563eb" />}
                  </TouchableOpacity>
                ) : null
              }
              renderItem={({ item }) => {
                const isPoolSelected = item.id === selectedPoolId && (!allowCategorySelection || !selectedCategoryId);
                const rawBal = item.currentBalance;
                const balNum = typeof rawBal === 'number' ? rawBal : rawBal ? parseFloat(String(rawBal)) : null;
                const balText = balNum !== null && !isNaN(balNum)
                  ? `$${balNum.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : null;

                return (
                  <View style={{ marginBottom: 4 }}>
                    <TouchableOpacity
                      style={[styles.itemRow, isPoolSelected && styles.itemRowSelected]}
                      onPress={() => handleSelect(item.id, null)}
                    >
                      <View style={styles.itemInfo}>
                        <Feather name="folder" size={14} color={isPoolSelected ? '#2563eb' : '#64748B'} />
                        <Text style={[styles.itemText, isPoolSelected && styles.itemTextSelected]}>
                          {item.name}
                        </Text>
                        {item.poolType && (
                          <Text style={styles.itemBadge}>
                            {item.poolType}
                          </Text>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {balText && (
                          <Text style={[styles.itemBalance, isPoolSelected && styles.itemBalanceSelected]}>
                            {balText}
                          </Text>
                        )}
                        {isPoolSelected && <Feather name="check" size={16} color="#2563eb" />}
                      </View>
                    </TouchableOpacity>

                    {allowCategorySelection && item.categories && item.categories.length > 0 && (
                      <View style={{ marginLeft: 20, borderLeftWidth: 1.5, borderLeftColor: '#E2E8F0', paddingLeft: 8 }}>
                        {item.categories.map((cat) => {
                          const isCatSelected = item.id === selectedPoolId && selectedCategoryId === cat.id;
                          return (
                            <TouchableOpacity
                              key={cat.id}
                              style={[styles.catRow, isCatSelected && styles.catRowSelected]}
                              onPress={() => handleSelect(item.id, cat.id)}
                            >
                              <View style={styles.itemInfo}>
                                <Feather name="tag" size={12} color={isCatSelected ? '#2563eb' : '#94A3B8'} />
                                <Text style={[styles.catText, isCatSelected && styles.catTextSelected]}>
                                  {cat.name}
                                </Text>
                              </View>
                              {isCatSelected && <Feather name="check" size={14} color="#2563eb" />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>{t('common.noMatchingOptions') || 'No matching pools found'}</Text>
                </View>
              }
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1B2B4B',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  itemRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  itemTextSelected: {
    fontWeight: '700',
    color: '#1D4ED8',
  },
  itemBalance: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#1B2B4B',
  },
  itemBalanceSelected: {
    color: '#1D4ED8',
  },
  itemBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  emptyWrap: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 1,
  },
  catRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  catText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
  },
  catTextSelected: {
    fontWeight: '700',
    color: '#1D4ED8',
  },
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  fieldCardError: {
    borderColor: '#EF4444',
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fieldCardText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  fieldCardPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  fieldError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
});
