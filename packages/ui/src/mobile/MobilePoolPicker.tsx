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
}

export interface MobilePoolPickerProps {
  pools: MobilePoolOption[];
  selectedPoolId: string;
  onSelectPool: (poolId: string) => void;
  allowAllOption?: boolean;
  allOptionLabel?: string;
  placeholder?: string;
  compact?: boolean;
}

export const MobilePoolPicker: React.FC<MobilePoolPickerProps> = ({
  pools,
  selectedPoolId,
  onSelectPool,
  allowAllOption = true,
  allOptionLabel,
  placeholder,
  compact = true,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const resolvedAllLabel = allOptionLabel || t('transactions.allPools') || 'All Pools';
  const selectedPool = pools.find((p) => p.id === selectedPoolId);

  const displayLabel = useMemo(() => {
    if (!selectedPoolId || selectedPoolId === 'ALL') {
      return compact ? resolvedAllLabel : (placeholder || resolvedAllLabel);
    }
    return selectedPool ? selectedPool.name : resolvedAllLabel;
  }, [selectedPoolId, selectedPool, compact, resolvedAllLabel, placeholder]);

  const isAllActive = !selectedPoolId || selectedPoolId === 'ALL';

  const filteredPools = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return pools;
    return pools.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.poolType && p.poolType.toLowerCase().includes(q))
    );
  }, [pools, searchQuery]);

  const handleSelect = (id: string) => {
    onSelectPool(id);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <>
      <FilterPill
        label={displayLabel}
        isActive={!isAllActive}
        onPress={() => setModalVisible(true)}
      />

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
                <Text style={styles.subtitle}>{t('transactions.filterByPool')}</Text>
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
                placeholder="Search pools..."
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
                    onPress={() => handleSelect('ALL')}
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
                const isSelected = item.id === selectedPoolId;
                return (
                  <TouchableOpacity
                    style={[styles.itemRow, isSelected && styles.itemRowSelected]}
                    onPress={() => handleSelect(item.id)}
                  >
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                        {item.name}
                      </Text>
                      {item.poolType && (
                        <Text style={styles.itemBadge}>
                          {item.poolType}
                        </Text>
                      )}
                    </View>
                    {isSelected && <Feather name="check" size={16} color="#2563eb" />}
                  </TouchableOpacity>
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
});
