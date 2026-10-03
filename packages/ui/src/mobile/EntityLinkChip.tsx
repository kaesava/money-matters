import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';

export interface EntityLinkChipProps {
  label: string;
  onPress: () => void;
  isPrivate?: boolean | null;
  icon?: 'folder' | 'credit-card' | 'none';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function EntityLinkChip({
  label,
  onPress,
  isPrivate = false,
  icon = 'none',
  style,
  testID,
}: EntityLinkChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.chip, style]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {isPrivate && (
        <Feather name="lock" size={10} color="#64748B" style={styles.lockIcon} />
      )}
      {icon === 'folder' && (
        <Feather name="folder" size={11} color={DESIGN_TOKENS.colors.sereneBlue} />
      )}
      {icon === 'credit-card' && (
        <Feather name="credit-card" size={11} color={DESIGN_TOKENS.colors.sereneBlue} />
      )}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Feather name="arrow-up-right" size={11} color={DESIGN_TOKENS.colors.sereneBlue} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    minHeight: 34,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  lockIcon: {
    marginRight: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
    flexShrink: 1,
  },
});

export default EntityLinkChip;
