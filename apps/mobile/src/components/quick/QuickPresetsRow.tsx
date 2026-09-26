import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { QuickPresetItem } from './useMobileQuickAction';
import { t } from '@money-matters/i18n';
import { triggerHaptic } from '../../lib/haptics';

interface QuickPresetsRowProps {
  recentPresets: QuickPresetItem[];
  frequentPresets: QuickPresetItem[];
  onSelect: (preset: QuickPresetItem) => void;
}

export function QuickPresetsRow({
  recentPresets,
  frequentPresets,
  onSelect,
}: QuickPresetsRowProps) {
  const allPresets = [...recentPresets, ...frequentPresets];
  if (allPresets.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('quickPick.recent')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {allPresets.map((item, idx) => {
          const key = `${item.name || item.displayName || 'preset'}-${idx}`;
          const title = item.displayName || item.name || '';
          const subtitle = item.amount ? `$${item.amount}` : '';

          return (
            <TouchableOpacity
              key={key}
              onPress={() => {
                triggerHaptic('selection');
                onSelect(item);
              }}
              style={styles.chip}
            >
              <Text style={styles.chipText} numberOfLines={1}>
                {title} {subtitle}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    maxWidth: 200,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
});
