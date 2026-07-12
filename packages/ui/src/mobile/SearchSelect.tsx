import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
  StyleProp,
  ViewStyle,
} from 'react-native';

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
              {placeholder || 'Tap to select...'}
            </Text>
          )}
        </View>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleClose}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {label || 'Select Option'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder={searchPlaceholder || 'Search...'}
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item.value}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={() => {
              if (required) return null;
              return (
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => handleSelect('')}
                  style={styles.clearSelectionRow}
                >
                  <Text style={styles.clearSelectionText}>
                    ✕ None (Clear)
                  </Text>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No options found
                </Text>
              </View>
            )}
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => handleSelect(item.value)}
                  style={[styles.optionRow, isSelected ? styles.optionRowSelected : null]}
                >
                  {renderOption ? (
                    renderOption(item, isSelected)
                  ) : (
                    <View style={styles.optionContent}>
                      <Text style={[styles.optionLabel, isSelected ? styles.optionLabelSelected : null]}>
                        {item.label}
                      </Text>
                      {item.subLabel ? (
                        <Text style={styles.optionSubLabel}>{item.subLabel}</Text>
                      ) : null}
                    </View>
                  )}
                  {isSelected ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 8,
  },
  requiredStar: {
    color: '#ef4444',
  },
  trigger: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  triggerError: {
    borderColor: '#ef4444',
  },
  triggerContent: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 8,
  },
  triggerText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  triggerSubText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  chevron: {
    fontSize: 12,
    color: '#94a3b8',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1e293b',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  listContent: {
    paddingVertical: 16,
  },
  clearSelectionRow: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  clearSelectionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  optionRowSelected: {
    backgroundColor: '#eff6ff',
  },
  optionContent: {
    flex: 1,
    paddingRight: 10,
  },
  optionLabel: {
    fontSize: 16,
    color: '#1e293b',
  },
  optionLabelSelected: {
    fontWeight: '600',
    color: '#2563eb',
  },
  optionSubLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 3,
  },
  checkmark: {
    fontSize: 18,
    color: '#2563eb',
    fontWeight: 'bold',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
  },
});

export default SearchSelect;
