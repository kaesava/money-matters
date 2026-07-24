import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';

export interface MobileFilterOption {
  id: string;
  label: string;
}

export interface MobileFilterGroup {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: MobileFilterOption[];
}

export interface MobileFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;
  filterGroups?: MobileFilterGroup[];
  onClearAll?: () => void;
}

export default function MobileFilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterGroups = [],
  onClearAll,
}: MobileFilterBarProps) {
  const D = DESIGN_TOKENS;
  const hasActiveFilters = searchQuery.trim().length > 0 || filterGroups.some((g) => g.value !== 'ALL' && g.value !== '');

  return (
    <View style={styles.container}>
      {/* Search Bar Input */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color={D.colors.textMuted} style={styles.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          placeholderTextColor={D.colors.textMuted}
          style={styles.searchInput}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearSearchBtn}>
            <Feather name="x" size={14} color={D.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Groups & Horizontal Chips */}
      {filterGroups.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {filterGroups.map((group) => (
            <View key={group.label} style={styles.groupContainer}>
              <Text style={styles.groupLabel}>{group.label}:</Text>
              <View style={styles.chipsRow}>
                {group.options.map((opt) => {
                  const isActive = group.value === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => group.onChange(opt.id)}
                      style={[
                        styles.chip,
                        isActive && styles.activeChip,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, isActive && styles.activeChipText]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          {hasActiveFilters && onClearAll && (
            <TouchableOpacity onPress={onClearAll} style={styles.clearAllBtn} activeOpacity={0.7}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginVertical: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.colors.surface,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: D.colors.textPrimary,
  },
  clearSearchBtn: {
    padding: 4,
  },
  chipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 2,
  },
  groupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: D.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  activeChip: {
    backgroundColor: D.colors.accent,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: D.colors.textMuted,
  },
  activeChipText: {
    color: D.colors.onAccent,
  },
  clearAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
});
