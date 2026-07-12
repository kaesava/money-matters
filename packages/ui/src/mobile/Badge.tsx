import React from 'react';
import { View, Text, StyleSheet, ViewProps, StyleProp, TextStyle } from 'react-native';

export interface BadgeProps extends ViewProps {
  variant?: 'primary' | 'success' | 'danger' | 'warning';
  textStyle?: StyleProp<TextStyle>;
  children: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  children,
  style,
  textStyle,
  ...props
}) => {
  let badgeStyle = styles.primaryBadge;
  let badgeText = styles.primaryText;

  switch (variant) {
    case 'success':
      badgeStyle = styles.successBadge;
      badgeText = styles.successText;
      break;
    case 'danger':
      badgeStyle = styles.dangerBadge;
      badgeText = styles.dangerText;
      break;
    case 'warning':
      badgeStyle = styles.warningBadge;
      badgeText = styles.warningText;
      break;
    case 'primary':
    default:
      badgeStyle = styles.primaryBadge;
      badgeText = styles.primaryText;
      break;
  }

  return (
    <View style={[styles.badge, badgeStyle, style]} {...props}>
      <Text style={[styles.badgeText, badgeText, textStyle]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  primaryBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  primaryText: {
    color: '#2563eb',
  },
  successBadge: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  successText: {
    color: '#047857',
  },
  dangerBadge: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  dangerText: {
    color: '#b91c1c',
  },
  warningBadge: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  warningText: {
    color: '#b45309',
  },
});

export default Badge;
