import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMobileToast, MobileToastItem, MobileToastType } from './ToastContext';
import { DESIGN_TOKENS } from '../tokens';

const typeConfig: Record<
  MobileToastType,
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

export function MobileToastItemComponent({ toast }: { toast: MobileToastItem }) {
  const { dismissToast } = useMobileToast();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  const config = typeConfig[toast.type] || typeConfig.info;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Feather name={config.iconName} size={18} color={config.iconColor} style={styles.icon} />
      <View style={styles.textContainer}>
        {toast.title ? <Text style={[styles.title, { color: config.text }]}>{toast.title}</Text> : null}
        <Text style={[styles.message, { color: config.text }]}>{toast.message}</Text>
      </View>
      <TouchableOpacity onPress={() => dismissToast(toast.id)} style={styles.closeButton} activeOpacity={0.7}>
        <Feather name="x" size={16} color={config.text} style={{ opacity: 0.6 }} />
      </TouchableOpacity>
    </Animated.View>
  );
}

export function MobileToastContainer() {
  const { toasts } = useMobileToast();

  if (toasts.length === 0) return null;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {toasts.map((toast) => (
        <MobileToastItemComponent key={toast.id} toast={toast} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: {
    marginRight: 10,
  },
  textContainer: {
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
