import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '../tokens';
import { useIconVisibility } from '../hooks/IconVisibilityContext';

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
  defaultExpanded?: boolean;
}

export default function MobileFilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  filterGroups = [],
  onClearAll,
  defaultExpanded = false,
}: MobileFilterBarProps) {
  const D = DESIGN_TOKENS;
  const { showIcons } = useIconVisibility();
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);

  const resolvedPlaceholder = searchPlaceholder || t('common.searchPlaceholder');
  const activeFilterCount = filterGroups.filter((g) => g.value !== 'ALL' && g.value !== '').length;
  const hasActiveFilters = searchQuery.trim().length > 0 || activeFilterCount > 0;

  return (
    <View style={styles.container}>
      {/* Header Row: Search Input + Filter Toggle Button */}
      <View style={styles.headerRow}>
        <View style={styles.searchContainer}>
          {showIcons && (
            <Feather name="search" size={16} color={D.colors.textMuted} style={styles.searchIcon} />
          )}
          <TextInput
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder={resolvedPlaceholder}
            placeholderTextColor={D.colors.textMuted}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearSearchBtn}>
              {showIcons ? (
                <Feather name="x" size={14} color={D.colors.textMuted} />
              ) : (
                <Text style={styles.clearText}>{t('common.clear')}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {filterGroups.length > 0 && (
          <TouchableOpacity
            style={[styles.filterToggleBtn, expanded && styles.filterToggleBtnActive]}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.8}
          >
            {showIcons && <Feather name="sliders" size={14} color={expanded ? D.colors.onAccent : D.colors.textPrimary} />}
            <Text style={[styles.filterToggleText, expanded && styles.filterToggleTextActive]}>
              {t('common.filter')}
            </Text>
            {activeFilterCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Groups Stack - Displayed only when expanded */}
      {expanded && filterGroups.length > 0 && (
        <View style={styles.filterGroupsStack}>
          {filterGroups.map((group) => (
            <View key={group.label} style={styles.groupLineContainer}>
              <Text style={styles.groupLabel}>{group.label}:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
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
              </ScrollView>
            </View>
          ))}

          {hasActiveFilters && onClearAll && (
            <TouchableOpacity onPress={onClearAll} style={styles.clearAllBtn} activeOpacity={0.7}>
              <Text style={styles.clearAllText}>{t('common.clearAllFilters')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.colors.surface,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 44,
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
  clearText: {
    fontSize: 12,
    fontWeight: '600',
    color: D.colors.textMuted,
  },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.colors.surface,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 44,
    gap: 6,
  },
  filterToggleBtnActive: {
    backgroundColor: D.colors.accent,
    borderColor: D.colors.accent,
  },
  filterToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: D.colors.textPrimary,
  },
  filterToggleTextActive: {
    color: D.colors.onAccent,
  },
  badge: {
    backgroundColor: D.colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  filterGroupsStack: {
    flexDirection: 'column',
    gap: 10,
    backgroundColor: D.colors.surface,
    borderRadius: D.radius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  groupLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: D.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    minWidth: 50,
  },
  chipsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    marginTop: 2,
  },
  clearAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
});
