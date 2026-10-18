import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '../tokens';
import MobileButton from './Button';

export interface MobileConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export interface MobileConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

type ConfirmListener = (options: MobileConfirmOptions | null) => void;
let activeListener: ConfirmListener | null = null;

export function registerConfirmListener(listener: ConfirmListener) {
  activeListener = listener;
  return () => {
    if (activeListener === listener) {
      activeListener = null;
    }
  };
}

export function showMobileConfirm(options: MobileConfirmOptions): void {
  if (activeListener) {
    activeListener(options);
  } else {
    console.warn('[MobileConfirmDialog]: No MobileConfirmContainer mounted.');
  }
}

export function MobileConfirmDialog({
  visible,
  title,
  message,
  confirmText,
  cancelText,
  confirmLabel,
  cancelLabel,
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
}: MobileConfirmDialogProps) {
  const resolvedCancel = cancelText || cancelLabel || t('common.cancel');
  const resolvedConfirm =
    confirmText ||
    confirmLabel ||
    (isDestructive ? t('modals.discardChanges.discard') : t('common.confirm'));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.footerRow}>
            <View style={styles.buttonWrapper}>
              <MobileButton
                variant="ghost"
                label={resolvedCancel}
                onPress={onCancel}
                disabled={isLoading}
              />
            </View>
            <View style={styles.buttonWrapper}>
              <MobileButton
                variant={isDestructive ? 'danger' : 'primary'}
                label={resolvedConfirm}
                onPress={onConfirm}
                loading={isLoading}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function MobileConfirmContainer() {
  const [current, setCurrent] = useState<MobileConfirmOptions | null>(null);

  useEffect(() => {
    return registerConfirmListener((opts) => setCurrent(opts));
  }, []);

  if (!current) return null;

  const handleCancel = () => {
    const fn = current.onCancel;
    setCurrent(null);
    fn?.();
  };

  const handleConfirm = () => {
    const fn = current.onConfirm;
    setCurrent(null);
    fn();
  };

  return (
    <MobileConfirmDialog
      visible={true}
      title={current.title}
      message={current.message}
      confirmText={current.confirmText}
      cancelText={current.cancelText}
      confirmLabel={current.confirmLabel}
      cancelLabel={current.cancelLabel}
      isDestructive={current.isDestructive}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
    />
  );
}

export default MobileConfirmDialog;

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: D.colors.surface,
    borderRadius: D.radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: D.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: D.colors.primary,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: D.colors.textMuted,
    lineHeight: 20,
    marginBottom: 20,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  buttonWrapper: {
    flex: 1,
  },
});
