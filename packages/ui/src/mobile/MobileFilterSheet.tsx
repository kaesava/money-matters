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

export interface FilterSortOption<T = string> {
  id: T;
  label: string;
}

export interface FilterSection<T = string> {
  id: string;
  title: string;
  options: FilterSortOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
}

export interface MobileFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  sections: FilterSection<any>[];
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSortFieldChange?: (field: any) => void;
  onSortOrderChange?: (order: 'asc' | 'desc') => void;
  sortOptions?: FilterSortOption<any>[];
  onReset?: () => void;
  onApply?: () => void;
  activeCount?: number;
}

export function MobileFilterSheet({
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
}: MobileFilterSheetProps) {
  const D = DESIGN_TOKENS;

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
              <Feather name="sliders" size={16} color="#1B2B4B" />
              <Text style={styles.title}>{title || t('common.filter')}</Text>
              {typeof activeCount === 'number' && activeCount > 0 ? (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{activeCount}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Feather name="x" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {/* Sort Section */}
            {sortOptions && sortOptions.length > 0 && onSortFieldChange && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('transactions.sort') || 'Sort By'}</Text>
                  {onSortOrderChange && sortOrder && (
                    <TouchableOpacity
                      onPress={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
                      style={styles.orderToggle}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
                        size={12}
                        color="#2563eb"
                      />
                      <Text style={styles.orderToggleText}>
                        {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.chipsWrap}>
                  {sortOptions.map((opt) => {
                    const isSelected = sortField === opt.id;
                    return (
                      <TouchableOpacity
                        key={String(opt.id)}
                        onPress={() => onSortFieldChange(opt.id)}
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
              </View>
            )}

            {/* Filter Sections */}
            {sections.map((section) => (
              <View key={section.id} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.chipsWrap}>
                  {section.options.map((opt) => {
                    const isSelected = section.selectedValue === opt.id;
                    return (
                      <TouchableOpacity
                        key={String(opt.id)}
                        onPress={() => section.onSelect(opt.id)}
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
              </View>
            ))}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {onReset && (
              <TouchableOpacity onPress={onReset} style={styles.resetBtn} activeOpacity={0.7}>
                <Text style={styles.resetBtnText}>{t('common.reset') || 'Reset'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleApply} style={styles.applyBtn} activeOpacity={0.8}>
              <Text style={styles.applyBtnText}>{t('common.confirm') || 'Apply Filters'}</Text>
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
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F1F5F9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2B4B',
  },
  countBadge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  orderToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
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
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563eb',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#2563eb',
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  resetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
