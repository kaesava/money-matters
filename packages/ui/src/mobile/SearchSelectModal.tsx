import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import { t } from '@money-matters/i18n';
import { MobileSearchSelectOption } from './SearchSelect';

interface SearchSelectModalProps {
  visible: boolean;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchPlaceholder?: string;
  filteredOptions: MobileSearchSelectOption[];
  value: string;
  handleSelect: (val: string) => void;
  renderOption?: (item: MobileSearchSelectOption, isSelected: boolean) => React.ReactNode;
  styles: Record<string, ViewStyle | TextStyle | ImageStyle>;
}

export function SearchSelectModal({
  visible,
  onClose,
  searchQuery,
  setSearchQuery,
  searchPlaceholder,
  filteredOptions,
  value,
  handleSelect,
  renderOption,
  styles,
}: SearchSelectModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View style={styles.searchInputContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={searchPlaceholder || t('common.searchPlaceholder')}
              placeholderTextColor="#94A3B8"
              autoFocus
              clearButtonMode="while-editing"
            />
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>{t('common.done')}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredOptions}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('common.noMatchingOptions')}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = item.value === value;
            if (renderOption) {
              return (
                <TouchableOpacity onPress={() => handleSelect(item.value)}>
                  {renderOption(item, isSelected)}
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                onPress={() => handleSelect(item.value)}
                style={[styles.optionItem, isSelected && styles.optionItemSelected]}
              >
                <View style={styles.optionTextContainer}>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {item.label}
                  </Text>
                  {item.subLabel && (
                    <Text style={styles.optionSubLabel}>{item.subLabel}</Text>
                  )}
                </View>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
