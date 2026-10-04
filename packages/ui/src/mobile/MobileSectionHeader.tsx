import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DESIGN_TOKENS } from '../tokens';
import InfoTooltip from './InfoTooltip';

export interface MobileSectionHeaderProps {
  title: string;
  tooltip?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: object;
}

export function MobileSectionHeader({
  title,
  tooltip,
  actionLabel,
  onAction,
  style,
}: MobileSectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {tooltip ? (
          <View style={styles.tooltipWrap}>
            <InfoTooltip content={tooltip} />
          </View>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
    letterSpacing: 0.2,
  },
  tooltipWrap: {
    marginLeft: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.accent,
  },
});

export default MobileSectionHeader;
