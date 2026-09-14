import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
  StyleProp,
  TextStyle,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { DESIGN_TOKENS } from '../tokens';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  textStyle?: StyleProp<TextStyle>;
  title?: string;
  children?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  title,
  children,
  style,
  textStyle,
  disabled,
  loading,
  ...props
}) => {
  const D = DESIGN_TOKENS;

  let btnStyle: StyleProp<ViewStyle> = styles.primaryButton;
  let txtStyle: StyleProp<TextStyle> = styles.primaryText;
  let spinnerColor = '#ffffff';

  if (variant === 'secondary') {
    btnStyle = styles.secondaryButton;
    txtStyle = styles.secondaryText;
    spinnerColor = D.colors.primary;
  } else if (variant === 'danger') {
    btnStyle = styles.dangerButton;
    txtStyle = styles.dangerText;
    spinnerColor = '#ffffff';
  } else if (variant === 'ghost') {
    btnStyle = styles.ghostButton;
    txtStyle = styles.ghostText;
    spinnerColor = D.colors.primary;
  }

  let sizeStyle = styles.sizeMd;
  if (size === 'sm') sizeStyle = styles.sizeSm;
  else if (size === 'lg') sizeStyle = styles.sizeLg;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        btnStyle,
        sizeStyle,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : children ? (
        children
      ) : (
        <Text style={[styles.baseText, txtStyle, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const D = DESIGN_TOKENS;

const styles = StyleSheet.create({
  button: {
    borderRadius: D.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sizeSm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  sizeMd: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  sizeLg: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  primaryButton: {
    backgroundColor: D.colors.sereneBlue,
  },
  secondaryButton: {
    backgroundColor: D.colors.surface,
    borderWidth: 1,
    borderColor: D.colors.border,
  },
  dangerButton: {
    backgroundColor: D.colors.burnRed,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  baseText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 15,
  },
  secondaryText: {
    color: D.colors.textPrimary,
    fontSize: 15,
  },
  dangerText: {
    color: '#ffffff',
    fontSize: 15,
  },
  ghostText: {
    color: D.colors.textMuted,
    fontSize: 14,
  },
});

export default Button;
