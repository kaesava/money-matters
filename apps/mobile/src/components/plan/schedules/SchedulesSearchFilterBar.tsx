import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, SearchInput } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface SchedulesSearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  activeFilterCount: number;
  onOpenFilterSheet: () => void;
}

export const SchedulesSearchFilterBar: React.FC<SchedulesSearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  activeFilterCount,
  onOpenFilterSheet,
}) => {
  return (
    <View style={styles.searchAndFilterRow}>
      <View style={styles.flex1}>
        <SearchInput
          placeholder={t('payday.searchSchedules')}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      </View>

      <TouchableOpacity
        style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
        onPress={onOpenFilterSheet}
        activeOpacity={0.7}
      >
        <Feather
          name="sliders"
          size={15}
          color={activeFilterCount > 0 ? DESIGN_TOKENS.colors.accent : DESIGN_TOKENS.colors.textMuted}
        />
        <Text
          style={[
            styles.filterBtnText,
            activeFilterCount > 0 && styles.filterBtnTextActive,
          ]}
        >
          {t('common.filter')}
          {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  searchAndFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1.5,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  filterBtnActive: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  filterBtnTextActive: {
    color: DESIGN_TOKENS.colors.accent,
  },
});
