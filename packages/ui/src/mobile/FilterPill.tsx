import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';

export interface FilterPillProps {
  label: string;
  isActive?: boolean;
  onPress: () => void;
  icon?: string;
  hasChevron?: boolean;
}

export const FilterPill: React.FC<FilterPillProps> = ({
  label,
  isActive = false,
  onPress,
  icon,
  hasChevron = true,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.pill, isActive && styles.pillActive]}
    >
      <View style={styles.contentRow}>
        <Text style={[styles.label, isActive && styles.labelActive]} numberOfLines={1}>
          {label}
        </Text>
        {hasChevron && (
          <Feather
            name="chevron-down"
            size={12}
            color={isActive ? '#1D4ED8' : '#64748B'}
            style={styles.chevron}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    maxWidth: 160,
  },
  labelActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  chevron: {
    marginTop: 1,
  },
});
