import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { t } from '@money-matters/i18n';
import { SearchSelectModal } from './SearchSelectModal';

export interface MobileSearchSelectOption {
  value: string;
  label: string;
  subLabel?: string;
  searchKeywords?: string;
}

export interface MobileSearchSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: MobileSearchSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  required?: boolean;
  renderOption?: (item: MobileSearchSelectOption, isSelected: boolean) => React.ReactNode;
}

export const SearchSelect: React.FC<MobileSearchSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  error,
  containerStyle,
  required = false,
  renderOption,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(query)) ||
        (opt.searchKeywords && opt.searchKeywords.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);

  const handleSelect = (val: string) => {
    onChange(val);
    setModalVisible(false);
    setSearchQuery('');
  };

  const handleClose = () => {
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.requiredStar}> *</Text>}
        </Text>
      )}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setModalVisible(true)}
        style={[styles.trigger, error ? styles.triggerError : null]}
      >
        <View style={styles.triggerContent}>
          {selectedOption ? (
            <View>
              <Text style={styles.triggerText}>{selectedOption.label}</Text>
              {selectedOption.subLabel && (
                <Text style={styles.triggerSubText}>{selectedOption.subLabel}</Text>
              )}
            </View>
          ) : (
            <Text style={styles.placeholderText}>
              {placeholder || t('common.tapToSelect')}
            </Text>
          )}
        </View>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <SearchSelectModal
        visible={modalVisible}
        onClose={handleClose}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchPlaceholder={searchPlaceholder}
        filteredOptions={filteredOptions}
        value={value}
        handleSelect={handleSelect}
        renderOption={renderOption}
        styles={styles}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  triggerError: {
    borderColor: '#EF4444',
  },
  triggerContent: {
    flex: 1,
    marginRight: 8,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  triggerSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  chevron: {
    fontSize: 10,
    color: '#64748B',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    height: 40,
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00B4A6',
  },
  listContent: {
    paddingVertical: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  optionItemSelected: {
    backgroundColor: '#F0FDFA',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  optionLabelSelected: {
    color: '#00B4A6',
    fontWeight: '700',
  },
  optionSubLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00B4A6',
    marginLeft: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
});

export default SearchSelect;
