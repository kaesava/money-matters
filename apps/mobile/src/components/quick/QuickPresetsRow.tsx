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
  if (recentPresets.length === 0 && frequentPresets.length === 0) return null;

  return (
    <View style={styles.container}>
      {recentPresets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>{t('quickPick.recent')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
          >
            {recentPresets.map((item, idx) => {
              const key = `recent-${item.name || item.displayName || 'preset'}-${idx}`;
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
      )}

      {frequentPresets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>{t('quickPick.frequent')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
          >
            {frequentPresets.map((item, idx) => {
              const key = `freq-${item.name || item.displayName || 'preset'}-${idx}`;
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    marginBottom: 4,
  },
  section: {
    gap: 4,
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
