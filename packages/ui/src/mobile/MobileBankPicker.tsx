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
import { FilterPill } from './FilterPill';
import { styles } from './picker/MobileBankPickerStyles';

export interface MobileBankOption {
  id: string;
  name: string;
  institution?: string | null;
  accountType?: string | null;
  isPrivate?: boolean | null;
  currentBalance?: string | number | null;
  availableBalance?: string | number | null;
}

export interface MobileBankPickerProps {
  banks: MobileBankOption[];
  selectedBankId: string;
  onSelectBank: (bankId: string) => void;
  allowAllOption?: boolean;
  allOptionLabel?: string;
  placeholder?: string;
  compact?: boolean;
  displayStyle?: 'pill' | 'field';
  label?: string;
  required?: boolean;
  error?: string;
}

export const MobileBankPicker: React.FC<MobileBankPickerProps> = ({
  banks,
  selectedBankId,
  onSelectBank,
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

  const resolvedAllLabel = allOptionLabel || t('transactions.allBanks');
  const selectedBank = banks.find((b) => b.id === selectedBankId || b.name === selectedBankId);

  const displayLabel = useMemo(() => {
    if (!selectedBankId || selectedBankId === 'ALL') {
      return compact ? resolvedAllLabel : (placeholder || resolvedAllLabel);
    }
    return selectedBank ? selectedBank.name : resolvedAllLabel;
  }, [selectedBankId, selectedBank, compact, resolvedAllLabel, placeholder]);

  const isAllActive = !selectedBankId || selectedBankId === 'ALL';

  const filteredBanks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return banks;
    return banks.filter((b) =>
      b.name.toLowerCase().includes(q) || (b.institution && b.institution.toLowerCase().includes(q))
    );
  }, [banks, searchQuery]);

  const handleSelect = (id: string) => {
    onSelectBank(id);
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
              <Feather name="credit-card" size={18} color="#2563eb" />
            </View>
            <Text
              style={[
                styles.fieldCardText,
                !selectedBankId ? styles.fieldCardPlaceholder : null,
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
                <Text style={styles.title}>{t('bankAccounts.title')}</Text>
                <Text style={styles.subtitle}>
                  {displayStyle === 'field'
                    ? t('bankAccounts.selectBankAccount')
                    : t('transactions.filterByBank')}
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
            {banks.length > 5 && (
              <View style={styles.searchWrap}>
                <Feather name="search" size={14} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search bank accounts..."
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
            )}

            {/* Options List */}
            <FlatList
              data={filteredBanks}
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
                const isSelected = item.id === selectedBankId || item.name === selectedBankId;
                const rawBal = item.availableBalance ?? item.currentBalance;
                const balNum = typeof rawBal === 'number' ? rawBal : rawBal ? parseFloat(String(rawBal)) : null;
                const balText = balNum !== null && !isNaN(balNum)
                  ? `$${balNum.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : null;

                return (
                  <TouchableOpacity
                    style={[styles.itemRow, isSelected && styles.itemRowSelected]}
                    onPress={() => handleSelect(item.id)}
                  >
                    <View style={styles.itemInfo}>
                      {item.isPrivate && (
                        <Feather name="lock" size={13} color="#94A3B8" style={{ marginRight: 2 }} />
                      )}
                      <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                        {item.name}
                      </Text>
                      {item.institution && (
                        <Text style={styles.itemBadge}>
                          {item.institution}
                        </Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {balText && (
                        <Text style={[styles.itemBalance, isSelected && styles.itemBalanceSelected]}>
                          {balText}
                        </Text>
                      )}
                      {isSelected && <Feather name="check" size={16} color="#2563eb" />}
                    </View>
                  </TouchableOpacity>
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
    </>
  );
};

