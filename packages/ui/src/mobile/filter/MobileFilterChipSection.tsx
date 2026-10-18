import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '../../tokens';
import type { FilterSortOption } from './MobileFilterSortSection';

export interface FilterSection<T = string> {
  id: string;
  title: string;
  options?: FilterSortOption<T>[];
  selectedValue?: T;
  onSelect?: (value: T) => void;
  renderCustom?: () => React.ReactNode;
}

interface MobileFilterChipSectionProps<T = string> {
  section: FilterSection<T>;
}

export function MobileFilterChipSection<T = string>({ section }: MobileFilterChipSectionProps<T>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {section.renderCustom ? (
        section.renderCustom()
      ) : (
        <View style={styles.chipsWrap}>
          {section.options?.map((opt) => {
            const isSelected = section.selectedValue === opt.id;
            return (
              <TouchableOpacity
                key={String(opt.id)}
                onPress={() => section.onSelect?.(opt.id)}
                style={[styles.chip, isSelected && styles.chipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderWidth: 1.5,
    borderColor: DESIGN_TOKENS.colors.border,
  },
  chipActive: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  chipTextActive: {
    color: DESIGN_TOKENS.colors.sereneBlue,
    fontWeight: '800',
  },
});
