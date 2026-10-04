import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '../tokens';
import { Button } from './Button';

export interface MobileEmptyStateProps {
  icon?: React.ReactNode | string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: object;
}

export function MobileEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  style,
}: MobileEmptyStateProps) {
  const D = DESIGN_TOKENS;

  return (
    <View style={[styles.container, style]}>
      {icon ? (
        <View style={styles.iconContainer}>
          {typeof icon === 'string' ? <Text style={styles.emojiIcon}>{icon}</Text> : icon}
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.actionWrap}>
          <Button title={actionLabel} onPress={onAction} variant="primary" size="sm" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: DESIGN_TOKENS.spacing.containerMargin,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderStyle: 'dashed',
    marginVertical: DESIGN_TOKENS.spacing.stackGap,
  },
  iconContainer: {
    marginBottom: 8,
  },
  emojiIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  actionWrap: {
    marginTop: 12,
  },
});
