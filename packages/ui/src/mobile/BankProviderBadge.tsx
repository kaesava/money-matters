import React from 'react';
import { View, Text, StyleSheet, ViewProps, StyleProp, TextStyle } from 'react-native';

export type BankProvider = 'CBA' | 'Westpac' | 'ANZ' | 'NAB' | 'ING' | 'Macquarie' | 'Other' | string;

export interface BankProviderBadgeProps extends ViewProps {
  provider?: BankProvider | null;
  textStyle?: StyleProp<TextStyle>;
  size?: 'sm' | 'md';
}

const PROVIDER_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  CBA: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', label: 'CBA' },
  Westpac: { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B', label: 'Westpac' },
  ANZ: { bg: '#DBEAFE', border: '#2563EB', text: '#1E40AF', label: 'ANZ' },
  NAB: { bg: '#FFE4E6', border: '#E11D48', text: '#9F1239', label: 'NAB' },
  ING: { bg: '#FFEDD5', border: '#EA580C', text: '#9A3412', label: 'ING' },
  Macquarie: { bg: '#F1F5F9', border: '#475569', text: '#1E293B', label: 'Macquarie' },
  Other: { bg: '#F4F4F5', border: '#A1A1AA', text: '#3F3F46', label: 'Other' },
};

export const BankProviderBadge: React.FC<BankProviderBadgeProps> = ({
  provider = 'Other',
  size = 'sm',
  style,
  textStyle,
  ...props
}) => {
  const normKey = provider && PROVIDER_CONFIG[provider] ? provider : 'Other';
  const cfg = PROVIDER_CONFIG[normKey] || PROVIDER_CONFIG.Other;

  return (
    <View
      style={[
        styles.badge,
        size === 'md' ? styles.badgeMd : styles.badgeSm,
        { backgroundColor: cfg.bg, borderColor: cfg.border },
        style,
      ]}
      {...props}
    >
      <Text
        style={[
          styles.text,
          size === 'md' ? styles.textMd : styles.textSm,
          { color: cfg.text },
          textStyle,
        ]}
      >
        {cfg.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSm: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  badgeMd: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  text: {
    fontWeight: '700',
  },
  textSm: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  textMd: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
});

export default BankProviderBadge;
