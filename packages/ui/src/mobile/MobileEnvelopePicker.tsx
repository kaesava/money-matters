import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { useCurrencyLocale } from '../hooks/CurrencyLocaleContext';
import { FilterPill } from './FilterPill';
import { styles } from './picker/MobileEnvelopePickerStyles';
import {
  MobileEnvelopePickerItem,
  type MobileEnvelopeOption,
} from './picker/MobileEnvelopePickerItem';

export type { MobileEnvelopeOption };
export type MobilePoolOption = MobileEnvelopeOption;

export interface MobileEnvelopePickerProps {
  pools: MobileEnvelopeOption[];
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

export type MobilePoolPickerProps = MobileEnvelopePickerProps;

import {
  formatPoolBalance,
  getBadgeStyle,
  getEnvelopeBadgeInfo,
} from './picker/MobileEnvelopePickerHelpers';

export const MobileEnvelopePicker: React.FC<MobileEnvelopePickerProps> = ({
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
  const { currencySymbol, locale } = useCurrencyLocale();
  const formatBalanceDynamic = (val?: string | number | null) =>
    formatPoolBalance(val, currencySymbol, locale);

  const resolvedMode = mode || (displayStyle === 'field' ? 'inline' : 'modal');
  const [modalVisible, setModalVisible] = useState(false);
  const [isInlineOpen, setIsInlineOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const resolvedAllLabel = allOptionLabel || t('history.allPools');
  const selectedPool = pools.find((p) => p.id === selectedPoolId);
  const selectedCat = selectedPool?.categories?.find((c) => c.id === selectedCategoryId);

  const displayLabel = useMemo(() => {
    if (!selectedPoolId || selectedPoolId === 'ALL') {
      if (displayStyle === 'field') {
        return placeholder || t('common.selectPool');
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
      const badge = getEnvelopeBadgeInfo(p);
      const matchPool =
        p.name.toLowerCase().includes(q) ||
        badge.label.toLowerCase().includes(q) ||
        (p.poolType && p.poolType.toLowerCase().includes(q));
      const matchCat =
        allowCategorySelection && p.categories?.some((c) => c.name.toLowerCase().includes(q));
      return matchPool || matchCat;
    });
  }, [pools, searchQuery, allowCategorySelection]);

  const handleSelect = (poolId: string, categoryId: string | null = null) => {
    const pool = pools.find((p) => p.id === poolId);
    const cat = pool?.categories?.find((c) => c.id === categoryId);
    const selectionLabel = pool ? (cat ? `${pool.name} › ${cat.name}` : pool.name) : '';

    if (onChange) onChange({ poolId, categoryId, label: selectionLabel });
    if (onSelectCategory) onSelectCategory(poolId, categoryId);
    if (onSelectPool) onSelectPool(poolId);
    setModalVisible(false);
    setIsInlineOpen(false);
    setSearchQuery('');
  };

  const modalTitle = useMemo(() => {
    if (allowCategorySelection) return t('categories.poolOrCategory');
    return t('categories.typeLabel');
  }, [allowCategorySelection]);

  const modalSubtitle = useMemo(() => {
    if (allowCategorySelection) return t('categories.selectPoolOrCategory');
    if (displayStyle === 'field') return t('categories.selectPool');
    return t('history.filterByPool');
  }, [allowCategorySelection, displayStyle]);

  const renderSearchInput = () => (
    <View style={styles.searchWrap}>
      <Feather name="search" size={14} color="#94A3B8" />
      <TextInput
        style={styles.searchInput}
        placeholder={t('categories.searchPlaceholder')}
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
    if (filteredPools.length === 0 && (!allowAllOption || searchQuery.trim())) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{t('common.noMatchingOptions')}</Text>
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

        {filteredPools.map((item) => {
          const badge = getEnvelopeBadgeInfo(item);
          return (
            <MobileEnvelopePickerItem
              key={item.id}
              item={item}
              selectedPoolId={selectedPoolId}
              selectedCategoryId={selectedCategoryId}
              allowCategorySelection={allowCategorySelection}
              searchQuery={searchQuery}
              balText={formatBalanceDynamic(item.currentBalance)}
              badge={badge}
              badgeStyle={getBadgeStyle(badge.tagKey)}
              onSelect={handleSelect}
            />
          );
        })}
      </View>
    );
  };

  const selectedPoolBal = selectedPool ? formatBalanceDynamic(selectedPool.currentBalance) : null;

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

      {resolvedMode === 'inline' && isInlineOpen && (
        <View style={styles.inlineDropdown}>
          {renderSearchInput()}
          {renderGroupedContent()}
        </View>
      )}

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
                  const badge = getEnvelopeBadgeInfo(item);
                  return (
                    <MobileEnvelopePickerItem
                      item={item}
                      selectedPoolId={selectedPoolId}
                      selectedCategoryId={selectedCategoryId}
                      allowCategorySelection={allowCategorySelection}
                      searchQuery={searchQuery}
                      balText={formatBalanceDynamic(item.currentBalance)}
                      badge={badge}
                      badgeStyle={getBadgeStyle(badge.tagKey)}
                      onSelect={handleSelect}
                    />
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>{t('common.noMatchingOptions')}</Text>
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

export const MobilePoolPicker = MobileEnvelopePicker;
