import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SectionList,
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
  onChange?: (selection: { poolId: string; categoryId: string | null; label: string }) => void;
  selectedCategoryId?: string | null;
  allowCategorySelection?: boolean;
  allowAllOption?: boolean;
  allOptionLabel?: string;
  placeholder?: string;
  compact?: boolean;
  displayStyle?: 'pill' | 'field';
  mode?: 'modal' | 'inline';
  label?: string;
  required?: boolean;
  error?: string;
}

function formatPoolBalance(val?: string | number | null): string | null {
  if (val === undefined || val === null || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val));
  if (isNaN(num)) return null;
  return `$${num.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const MobilePoolPicker: React.FC<MobilePoolPickerProps> = ({
  pools,
  selectedPoolId,
  onSelectPool,
  onSelectCategory,
  onChange,
  selectedCategoryId,
  allowCategorySelection = false,
  allowAllOption = true,
  allOptionLabel,
  placeholder,
  compact = true,
  displayStyle = 'pill',
  mode,
  label,
  required = false,
  error,
}) => {
  const resolvedMode = mode || (displayStyle === 'field' ? 'inline' : 'modal');
  const [modalVisible, setModalVisible] = useState(false);
  const [isInlineOpen, setIsInlineOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const resolvedAllLabel = allOptionLabel || t('transactions.allPools') || 'All Pools';
  const selectedPool = pools.find((p) => p.id === selectedPoolId);
  const selectedCat = selectedPool?.categories?.find((c) => c.id === selectedCategoryId);

  const displayLabel = useMemo(() => {
    if (!selectedPoolId || selectedPoolId === 'ALL') {
      if (displayStyle === 'field') {
        return placeholder || t('common.selectPool') || 'Select pool';
      }
      return compact ? resolvedAllLabel : (placeholder || resolvedAllLabel);
    }
    if (selectedPool) {
      if (selectedCategoryId && selectedCat) {
        return `${selectedPool.name} › ${selectedCat.name}`;
      }
      return selectedPool.name;
    }
    return placeholder || resolvedAllLabel;
  }, [selectedPoolId, selectedPool, selectedCategoryId, selectedCat, compact, resolvedAllLabel, placeholder, displayStyle]);

  const isAllActive = !selectedPoolId || selectedPoolId === 'ALL';

  const filteredPools = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return pools;
    return pools.filter((p) => {
      const matchPool = p.name.toLowerCase().includes(q) || (p.poolType && p.poolType.toLowerCase().includes(q));
      const matchCat = allowCategorySelection && p.categories?.some((c) => c.name.toLowerCase().includes(q));
      return matchPool || matchCat;
    });
  }, [pools, searchQuery, allowCategorySelection]);

  const sections = useMemo(() => {
    const regularGroup = {
      type: 'REGULAR',
      title: t('categories.billsPoolsUpper') || t('categories.regularBills') || 'BILLS POOLS',
      data: [] as MobilePoolOption[],
    };
    const goalGroup = {
      type: 'GOAL',
      title: t('categories.goalsUpper') || t('categories.savingsGoals') || 'GOALS',
      data: [] as MobilePoolOption[],
    };
    const everydayGroup = {
      type: 'EVERYDAY',
      title: t('categories.everydayPoolsUpper') || t('categories.typeEveryday') || 'EVERYDAY POOLS',
      data: [] as MobilePoolOption[],
    };
    const otherGroup = {
      type: 'OTHER',
      title: 'OTHER POOLS',
      data: [] as MobilePoolOption[],
    };

    for (const p of filteredPools) {
      if (p.poolType === 'EVERYDAY') everydayGroup.data.push(p);
      else if (p.poolType === 'REGULAR') regularGroup.data.push(p);
      else if (p.poolType === 'GOAL') goalGroup.data.push(p);
      else otherGroup.data.push(p);
    }

    return [everydayGroup, regularGroup, goalGroup, otherGroup].filter((g) => g.data.length > 0);
  }, [filteredPools]);

  const handleSelect = (poolId: string, categoryId: string | null = null) => {
    const pool = pools.find((p) => p.id === poolId);
    const cat = pool?.categories?.find((c) => c.id === categoryId);
    const selectionLabel = pool ? (cat ? `${pool.name} › ${cat.name}` : pool.name) : '';

    if (onChange) {
      onChange({ poolId, categoryId, label: selectionLabel });
    }
    if (onSelectCategory) {
      onSelectCategory(poolId, categoryId);
    }
    if (onSelectPool) {
      onSelectPool(poolId);
    }
    setModalVisible(false);
    setIsInlineOpen(false);
    setSearchQuery('');
  };

  const toggleSection = (sectionType: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionType]: !prev[sectionType],
    }));
  };

  const modalTitle = useMemo(() => {
    if (allowCategorySelection) return t('categories.poolOrCategory');
    return t('categories.typeLabel');
  }, [allowCategorySelection]);

  const modalSubtitle = useMemo(() => {
    if (allowCategorySelection) return t('categories.selectPoolOrCategory');
    if (displayStyle === 'field') return t('categories.selectPool');
    return t('transactions.filterByPool');
  }, [allowCategorySelection, displayStyle]);

  const renderSearchInput = () => (
    <View style={styles.searchWrap}>
      <Feather name="search" size={14} color="#94A3B8" />
      <TextInput
        style={styles.searchInput}
        placeholder={t('categories.searchPlaceholder') || 'Search pools or categories...'}
        placeholderTextColor="#94A3B8"
        value={searchQuery}
        onChangeText={setSearchQuery}
        autoCorrect={false}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity
          onPress={() => setSearchQuery('')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="x" size={14} color="#94A3B8" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderGroupedContent = () => {
    if (sections.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            {t('common.noMatchingOptions') || 'No matching pools found'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.groupedListContent}>
        {allowAllOption && !searchQuery.trim() && (
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
        )}

        {sections.map((section) => {
          const isCollapsed = Boolean(collapsedSections[section.type]);
          return (
            <View key={section.type} style={styles.sectionWrap}>
              <TouchableOpacity
                onPress={() => toggleSection(section.type)}
                style={styles.sectionHeader}
                activeOpacity={0.7}
              >
                <Text style={styles.sectionHeaderText}>{section.title}</Text>
                <Feather
                  name={isCollapsed ? 'chevron-right' : 'chevron-down'}
                  size={14}
                  color="#64748B"
                />
              </TouchableOpacity>

              {!isCollapsed &&
                section.data.map((item) => {
                  const isPoolSelected =
                    item.id === selectedPoolId && (!allowCategorySelection || !selectedCategoryId);
                  const balText = formatPoolBalance(item.currentBalance);

                  return (
                    <View key={item.id} style={styles.poolContainer}>
                      <TouchableOpacity
                        style={[styles.itemRow, isPoolSelected && styles.itemRowSelected]}
                        onPress={() => handleSelect(item.id, null)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.itemInfo}>
                          <Feather
                            name="folder"
                            size={14}
                            color={isPoolSelected ? '#2563eb' : '#64748B'}
                          />
                          <Text
                            style={[styles.itemText, isPoolSelected && styles.itemTextSelected]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          {item.poolType && (
                            <Text style={styles.itemBadge}>{item.poolType}</Text>
                          )}
                        </View>
                        <View style={styles.itemRight}>
                          {balText && (
                            <Text
                              style={[
                                styles.itemBalance,
                                isPoolSelected && styles.itemBalanceSelected,
                              ]}
                            >
                              {balText}
                            </Text>
                          )}
                          {isPoolSelected && <Feather name="check" size={16} color="#2563eb" />}
                        </View>
                      </TouchableOpacity>

                      {allowCategorySelection &&
                        item.categories &&
                        item.categories.length > 0 && (() => {
                          const q = searchQuery.toLowerCase().trim();
                          const poolMatches = !q || item.name.toLowerCase().includes(q) || Boolean(item.poolType && item.poolType.toLowerCase().includes(q));
                          const visibleCats = poolMatches
                            ? item.categories
                            : item.categories.filter((c) => c.name.toLowerCase().includes(q));
                          if (visibleCats.length === 0) return null;

                          return (
                            <View style={styles.catSubList}>
                              {visibleCats.map((cat) => {
                                const isCatSelected =
                                  item.id === selectedPoolId && selectedCategoryId === cat.id;
                                return (
                                  <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.catRow, isCatSelected && styles.catRowSelected]}
                                    onPress={() => handleSelect(item.id, cat.id)}
                                    activeOpacity={0.7}
                                  >
                                    <View style={styles.itemInfo}>
                                      <Feather
                                        name="tag"
                                        size={12}
                                        color={isCatSelected ? '#2563eb' : '#94A3B8'}
                                      />
                                      <Text
                                        style={[
                                          styles.catText,
                                          isCatSelected && styles.catTextSelected,
                                        ]}
                                        numberOfLines={1}
                                      >
                                        {cat.name}
                                      </Text>
                                    </View>
                                    {isCatSelected && (
                                      <Feather name="check" size={14} color="#2563eb" />
                                    )}
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          );
                        })()}
                    </View>
                  );
                })}
            </View>
          );
        })}
      </View>
    );
  };

  const selectedPoolBal = selectedPool ? formatPoolBalance(selectedPool.currentBalance) : null;

  return (
    <View style={{ marginBottom: displayStyle === 'field' ? 12 : 0 }}>
      {displayStyle === 'pill' ? (
        <FilterPill
          label={displayLabel}
          isActive={!isAllActive}
          onPress={() => {
            if (resolvedMode === 'inline') {
              setIsInlineOpen((prev) => !prev);
            } else {
              setModalVisible(true);
            }
          }}
        />
      ) : (
        <View>
          {label ? (
            <View style={styles.labelRow}>
              <Text style={styles.labelText}>{label}</Text>
              {required ? <Text style={styles.requiredStar}>*</Text> : null}
            </View>
          ) : null}
          <TouchableOpacity
            onPress={() => {
              if (resolvedMode === 'inline') {
                setIsInlineOpen((prev) => !prev);
              } else {
                setModalVisible(true);
              }
            }}
            style={[
              styles.fieldCard,
              error ? styles.fieldCardError : null,
              resolvedMode === 'inline' && isInlineOpen ? styles.fieldCardOpen : null,
            ]}
            activeOpacity={0.7}
          >
            <View style={styles.iconBox}>
              <Feather name="folder" size={18} color="#2563eb" />
            </View>
            <View style={styles.fieldTextWrap}>
              <Text
                style={[
                  styles.fieldCardText,
                  !selectedPoolId ? styles.fieldCardPlaceholder : null,
                ]}
                numberOfLines={1}
              >
                {displayLabel}
              </Text>
              {selectedPool && selectedPoolBal && !selectedCategoryId && (
                <Text style={styles.fieldBalText}>({selectedPoolBal})</Text>
              )}
            </View>
            <Feather
              name={resolvedMode === 'inline' && isInlineOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#94A3B8"
            />
          </TouchableOpacity>
          {error ? <Text style={styles.fieldError}>{error}</Text> : null}
        </View>
      )}

      {/* Inline Mode Dropdown Card */}
      {resolvedMode === 'inline' && isInlineOpen && (
        <View style={styles.inlineDropdown}>
          {renderSearchInput()}
          {renderGroupedContent()}
        </View>
      )}

      {/* Modal Mode Dialog */}
      {resolvedMode === 'modal' && (
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
                  <Text style={styles.title}>{modalTitle}</Text>
                  <Text style={styles.subtitle}>{modalSubtitle}</Text>
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

              {renderSearchInput()}

              <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                renderSectionHeader={({ section: { title } }) => (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>{title}</Text>
                  </View>
                )}
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
                  const isPoolSelected =
                    item.id === selectedPoolId && (!allowCategorySelection || !selectedCategoryId);
                  const balText = formatPoolBalance(item.currentBalance);

                  return (
                    <View style={styles.poolContainer}>
                      <TouchableOpacity
                        style={[styles.itemRow, isPoolSelected && styles.itemRowSelected]}
                        onPress={() => handleSelect(item.id, null)}
                      >
                        <View style={styles.itemInfo}>
                          <Feather
                            name="folder"
                            size={14}
                            color={isPoolSelected ? '#2563eb' : '#64748B'}
                          />
                          <Text
                            style={[styles.itemText, isPoolSelected && styles.itemTextSelected]}
                          >
                            {item.name}
                          </Text>
                          {item.poolType && (
                            <Text style={styles.itemBadge}>{item.poolType}</Text>
                          )}
                        </View>
                        <View style={styles.itemRight}>
                          {balText && (
                            <Text
                              style={[
                                styles.itemBalance,
                                isPoolSelected && styles.itemBalanceSelected,
                              ]}
                            >
                              {balText}
                            </Text>
                          )}
                          {isPoolSelected && <Feather name="check" size={16} color="#2563eb" />}
                        </View>
                      </TouchableOpacity>

                      {allowCategorySelection &&
                        item.categories &&
                        item.categories.length > 0 && (() => {
                          const q = searchQuery.toLowerCase().trim();
                          const poolMatches = !q || item.name.toLowerCase().includes(q) || Boolean(item.poolType && item.poolType.toLowerCase().includes(q));
                          const visibleCats = poolMatches
                            ? item.categories
                            : item.categories.filter((c) => c.name.toLowerCase().includes(q));
                          if (visibleCats.length === 0) return null;

                          return (
                            <View style={styles.catSubList}>
                              {visibleCats.map((cat) => {
                                const isCatSelected =
                                  item.id === selectedPoolId && selectedCategoryId === cat.id;
                                return (
                                  <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.catRow, isCatSelected && styles.catRowSelected]}
                                    onPress={() => handleSelect(item.id, cat.id)}
                                    activeOpacity={0.7}
                                  >
                                    <View style={styles.itemInfo}>
                                      <Feather
                                        name="tag"
                                        size={12}
                                        color={isCatSelected ? '#2563eb' : '#94A3B8'}
                                      />
                                      <Text
                                        style={[
                                          styles.catText,
                                          isCatSelected && styles.catTextSelected,
                                        ]}
                                        numberOfLines={1}
                                      >
                                        {cat.name}
                                      </Text>
                                    </View>
                                    {isCatSelected && (
                                      <Feather name="check" size={14} color="#2563eb" />
                                    )}
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          );
                        })()}
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>
                      {t('common.noMatchingOptions') || 'No matching pools found'}
                    </Text>
                  </View>
                }
              />
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'center',
  },
  labelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  requiredStar: {
    color: '#EF4444',
    marginLeft: 2,
    fontWeight: '700',
  },
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  fieldCardOpen: {
    borderColor: '#2563eb',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
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
  fieldTextWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  fieldCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    flexShrink: 1,
  },
  fieldCardPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  fieldBalText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#64748B',
  },
  fieldError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '500',
  },
  inlineDropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: '#2563eb',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 10,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  groupedListContent: {
    gap: 4,
  },
  sectionWrap: {
    marginBottom: 6,
  },
  poolContainer: {
    marginBottom: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  catSubList: {
    marginLeft: 20,
    borderLeftWidth: 1.5,
    borderLeftColor: '#E2E8F0',
    paddingLeft: 8,
    marginTop: 2,
    gap: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
    marginVertical: 10,
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
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FAFCFE',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemRowSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
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
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  emptyWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
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
});
