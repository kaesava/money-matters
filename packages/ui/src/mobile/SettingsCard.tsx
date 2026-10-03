import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { DESIGN_TOKENS } from '../tokens';
import { InfoTooltip } from './InfoTooltip';

export interface SettingsCardProps {
  title: string;
  tooltip?: string;
  tooltipTitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function SettingsCard({
  title,
  tooltip,
  tooltipTitle,
  action,
  children,
  style,
}: SettingsCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {tooltip ? <InfoTooltip content={tooltip} title={tooltipTitle} /> : null}
        </View>
        {action ? <View style={styles.actionContainer}>{action}</View> : null}
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    marginBottom: DESIGN_TOKENS.spacing.stackGap,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DESIGN_TOKENS.spacing.cardPadding,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.border,
    backgroundColor: DESIGN_TOKENS.colors.surfaceVariant,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  actionContainer: {
    marginLeft: 8,
  },
  content: {
    padding: DESIGN_TOKENS.spacing.cardPadding,
  },
});
