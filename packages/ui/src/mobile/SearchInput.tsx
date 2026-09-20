import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';

export interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder,
  onClear,
}: SearchInputProps) {
  const handleClear = () => {
    onChangeText('');
    onClear?.();
  };

  return (
    <View style={styles.container}>
      {/* Search icon left-3.5 / left-4 positioning */}
      <View style={styles.iconContainer} pointerEvents="none">
        <Feather name="search" size={16} color="#94A3B8" />
      </View>

      {/* pl-10 (40dp) padding for clear breathing room between icon and text */}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || t('common.searchPlaceholder')}
        placeholderTextColor="#94A3B8"
        returnKeyType="search"
        clearButtonMode="never"
        autoCapitalize="none"
        autoCorrect={false}
      />

      {value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearButton}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="x-circle" size={16} color="#94A3B8" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    position: 'absolute',
    left: 14, // left-3.5
    zIndex: 1,
  },
  input: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingLeft: 40, // pl-10
    paddingRight: 36,
    fontSize: 14,
    color: '#1E293B',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
    padding: 2,
  },
});

export default SearchInput;
