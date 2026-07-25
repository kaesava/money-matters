import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';

export interface MobilePaginationBarProps {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function MobilePaginationBar({
  page,
  totalPages,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
}: MobilePaginationBarProps) {
  if (totalItems === 0) return null;

  const startItem = Math.min((page - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <View style={styles.container}>
      {/* Items Range & Page Size Options */}
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          {t('common.showingRange', { start: startItem, end: endItem, total: totalItems })}
        </Text>

        <View style={styles.pageSizeRow}>
          {pageSizeOptions.map((opt) => {
            const isSelected = opt === pageSize;
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => onPageSizeChange(opt)}
                style={[styles.pageSizeBadge, isSelected && styles.pageSizeBadgeActive]}
              >
                <Text style={[styles.pageSizeText, isSelected && styles.pageSizeTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Navigation Row */}
      <View style={styles.navRow}>
        <TouchableOpacity
          disabled={page <= 1}
          onPress={() => onPageChange(page - 1)}
          style={[styles.button, page <= 1 && styles.buttonDisabled]}
        >
          <Text style={[styles.buttonText, page <= 1 && styles.buttonTextDisabled]}>
            {t('common.previous')}
          </Text>
        </TouchableOpacity>

        <Text style={styles.pageText}>
          {t('common.pageOf', { page, totalPages: Math.max(totalPages, 1) })}
        </Text>

        <TouchableOpacity
          disabled={page >= totalPages}
          onPress={() => onPageChange(page + 1)}
          style={[styles.button, page >= totalPages && styles.buttonDisabled]}
        >
          <Text style={[styles.buttonText, page >= totalPages && styles.buttonTextDisabled]}>
            {t('common.nextPage')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    padding: 14,
    marginVertical: 12,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#71717A',
  },
  pageSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageSizeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F4F4F5',
  },
  pageSizeBadgeActive: {
    backgroundColor: '#00B4A6',
  },
  pageSizeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3F3F46',
  },
  pageSizeTextActive: {
    color: '#FFFFFF',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F4F4F5',
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F4F4F5',
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#18181B',
  },
  buttonTextDisabled: {
    color: '#A1A1AA',
  },
  pageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#71717A',
  },
});
