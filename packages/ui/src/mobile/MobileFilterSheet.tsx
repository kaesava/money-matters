import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '../tokens';
import {
  MobileFilterSortSection,
  type FilterSortOption,
} from './filter/MobileFilterSortSection';
import {
  MobileFilterChipSection,
  type FilterSection,
} from './filter/MobileFilterChipSection';

export type { FilterSortOption, FilterSection };

export interface MobileFilterSheetProps<TSection = string, TSort = string> {
  visible: boolean;
  onClose: () => void;
  title?: string;
  sections: FilterSection<TSection>[];
  sortField?: TSort;
  sortOrder?: 'asc' | 'desc';
  onSortFieldChange?: (field: TSort) => void;
  onSortOrderChange?: (order: 'asc' | 'desc') => void;
  sortOptions?: FilterSortOption<TSort>[];
  onReset?: () => void;
  onApply?: () => void;
  activeCount?: number;
}

export function MobileFilterSheet<TSection = string, TSort = string>({
  visible,
  onClose,
  title,
  sections,
  sortField,
  sortOrder,
  onSortFieldChange,
  onSortOrderChange,
  sortOptions,
  onReset,
  onApply,
  activeCount,
}: MobileFilterSheetProps<TSection, TSort>) {
  const handleApply = () => {
    onApply?.();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Feather name="sliders" size={16} color={DESIGN_TOKENS.colors.primary} />
              <Text style={styles.title}>{title || t('common.filter')}</Text>
              {typeof activeCount === 'number' && activeCount > 0 ? (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{activeCount}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Feather name="x" size={20} color={DESIGN_TOKENS.colors.slate[400]} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {sortOptions && sortOptions.length > 0 && onSortFieldChange && (
              <MobileFilterSortSection
                sortOptions={sortOptions}
                sortField={sortField}
                sortOrder={sortOrder}
                onSortFieldChange={onSortFieldChange}
                onSortOrderChange={onSortOrderChange}
              />
            )}

            {sections.map((section) => (
              <MobileFilterChipSection key={section.id} section={section} />
            ))}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {onReset && (
              <TouchableOpacity onPress={onReset} style={styles.resetBtn} activeOpacity={0.7}>
                <Text style={styles.resetBtnText}>{t('common.reset')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleApply} style={styles.closeActionBtn} activeOpacity={0.8}>
              <Text style={styles.closeActionBtnText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '75%',
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[100],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  countBadge: {
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.onPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
    gap: 12,
  },
  resetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[500],
  },
  closeActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
    borderWidth: 1.5,
    borderColor: DESIGN_TOKENS.colors.border,
    alignItems: 'center',
  },
  closeActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[700],
  },
});
