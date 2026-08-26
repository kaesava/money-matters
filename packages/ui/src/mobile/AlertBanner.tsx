import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';

export type MobileAlertVariant = 'success' | 'error' | 'info' | 'warning';

export interface MobileAlertBannerProps {
  variant?: MobileAlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  style?: ViewStyle;
}

const variantConfig: Record<
  MobileAlertVariant,
  { bg: string; border: string; text: string; iconColor: string; iconName: keyof typeof Feather.glyphMap }
> = {
  success: {
    bg: '#f0fdf4',
    border: '#bbf7d0',
    text: '#14532d',
    iconColor: DESIGN_TOKENS.colors.success,
    iconName: 'check-circle',
  },
  error: {
    bg: '#fef2f2',
    border: '#fecaca',
    text: '#7f1d1d',
    iconColor: DESIGN_TOKENS.colors.burnRed,
    iconName: 'alert-circle',
  },
  info: {
    bg: '#eff6ff',
    border: '#bfdbfe',
    text: '#1e3a8a',
    iconColor: DESIGN_TOKENS.colors.sereneBlue,
    iconName: 'info',
  },
  warning: {
    bg: '#fffbeb',
    border: '#fef3c7',
    text: '#78350f',
    iconColor: DESIGN_TOKENS.colors.warning,
    iconName: 'alert-triangle',
  },
};

export function MobileAlertBanner({
  variant = 'info',
  title,
  children,
  onClose,
  style,
}: MobileAlertBannerProps) {
  const config = variantConfig[variant] || variantConfig.info;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: config.bg, borderColor: config.border },
        style,
      ]}
    >
      <Feather name={config.iconName} size={18} color={config.iconColor} style={styles.icon} />
      <View style={styles.content}>
        {title ? <Text style={[styles.title, { color: config.text }]}>{title}</Text> : null}
        {typeof children === 'string' ? (
          <Text style={[styles.message, { color: config.text }]}>{children}</Text>
        ) : (
          children
        )}
      </View>
      {onClose ? (
        <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
          <Feather name="x" size={16} color={config.text} style={{ opacity: 0.6 }} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 6,
  },
  icon: {
    marginRight: 10,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
