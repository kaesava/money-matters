import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import FormLabel from '../FormLabel';
import FormFieldError from '../FormFieldError';
import { SearchInput } from '../SearchInput';

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
  icon?: string;
}

export interface SelectFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  required = false,
  error,
  disabled = false,
  searchable = false,
}: SelectFieldProps) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  const handleSelect = (val: string) => {
    onChange(val);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {label ? <FormLabel required={required}>{label}</FormLabel> : null}

      <TouchableOpacity
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        style={[
          styles.card,
          error ? styles.cardError : null,
          disabled ? styles.cardDisabled : null,
        ]}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.valueText,
            !selectedOption ? styles.placeholderText : null,
          ]}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color="#94A3B8" />
      </TouchableOpacity>

      <FormFieldError error={error} />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable
            style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label || placeholder}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <Feather name="x" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {searchable && (
              <View style={styles.searchWrapper}>
                <SearchInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t('common.searchPlaceholder')}
                />
              </View>
            )}

            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              style={styles.optionsList}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelect(item.value)}
                    style={[
                      styles.optionRow,
                      isSelected && styles.optionRowSelected,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionInfo}>
                      <Text
                        style={[
                          styles.optionLabel,
                          isSelected && styles.optionLabelSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.subLabel ? (
                        <Text style={styles.optionSubLabel}>{item.subLabel}</Text>
                      ) : null}
                    </View>
                    {isSelected && (
                      <Feather name="check" size={18} color="#2563eb" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  cardError: {
    borderColor: '#EF4444',
  },
  cardDisabled: {
    backgroundColor: '#F8FAFC',
  },
  valueText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  optionsList: {
    maxHeight: 350,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  optionRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  optionInfo: {
    flex: 1,
    marginRight: 10,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
  },
  optionLabelSelected: {
    color: '#2563eb',
    fontWeight: '700',
  },
  optionSubLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});

export default SelectField;
