import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SearchInput, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface IncomeSplitsHeaderControlsProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeCount: number;
  onOpenFilterSheet: () => void;
  onExportCsv: () => void;
  canExport: boolean;
}

export function IncomeSplitsHeaderControls({
  searchQuery,
  onSearchChange,
  activeCount,
  onOpenFilterSheet,
  onExportCsv,
  canExport,
}: IncomeSplitsHeaderControlsProps) {
  return (
    <View style={styles.lockedHeader}>
      <View style={styles.controlsRow}>
        <View style={styles.searchWrap}>
          <SearchInput
            placeholder={t('transactions.searchPaydaysPlaceholder')}
            value={searchQuery}
            onChangeText={onSearchChange}
          />
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, activeCount > 0 && styles.filterBtnActive]}
          onPress={onOpenFilterSheet}
          activeOpacity={0.7}
        >
          <Feather
            name="sliders"
            size={15}
            color={activeCount > 0 ? DESIGN_TOKENS.colors.sereneBlue : DESIGN_TOKENS.colors.textMuted}
          />
          <Text style={[styles.filterBtnText, activeCount > 0 && styles.filterBtnTextActive]}>
            {t('common.filter')}
            {activeCount > 0 ? ` (${activeCount})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onExportCsv}
          style={styles.csvBtn}
          disabled={!canExport}
          activeOpacity={0.7}
        >
          <Feather name="download" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockedHeader: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[100],
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchWrap: {
    flex: 1,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: DESIGN_TOKENS.colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: DESIGN_TOKENS.colors.border,
    gap: 6,
  },
  filterBtnActive: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  filterBtnTextActive: {
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  csvBtn: {
    padding: 10,
    backgroundColor: DESIGN_TOKENS.colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: DESIGN_TOKENS.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
