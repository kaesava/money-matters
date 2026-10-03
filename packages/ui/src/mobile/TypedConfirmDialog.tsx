import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MobileModalDialog from './MobileModalDialog';
import MobileInput from './Input';
import MobileButton from './Button';
import { DESIGN_TOKENS } from '../tokens';
import { t } from '@money-matters/i18n';

export interface TypedConfirmDialogProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  confirmPhrase: string;
  confirmLabel: string;
  confirmButtonText: string;
  variant?: 'danger' | 'primary';
  children?: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
}

export function TypedConfirmDialog({
  visible,
  title,
  subtitle,
  confirmPhrase,
  confirmLabel,
  confirmButtonText,
  variant = 'danger',
  children,
  onClose,
  onConfirm,
}: TypedConfirmDialogProps) {
  const [typed, setTyped] = useState('');

  const handleClose = () => {
    setTyped('');
    onClose();
  };

  const handleConfirm = () => {
    if (typed.trim() === confirmPhrase.trim()) {
      setTyped('');
      onConfirm();
    }
  };

  const isMatch = typed.trim() === confirmPhrase.trim();

  return (
    <MobileModalDialog
      visible={visible}
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      footer={
        <View style={styles.footerRow}>
          <MobileButton
            variant="ghost"
            label={t('common.cancel')}
            onPress={handleClose}
          />
          <MobileButton
            variant={variant}
            label={confirmButtonText}
            disabled={!isMatch}
            onPress={handleConfirm}
          />
        </View>
      }
    >
      <View style={styles.content}>
        {children ? <View style={styles.bodySlot}>{children}</View> : null}
        <View style={styles.inputSection}>
          <Text style={styles.confirmPrompt}>{confirmLabel}</Text>
          <MobileInput
            value={typed}
            onChangeText={setTyped}
            placeholder={confirmPhrase}
            autoCapitalize="characters"
          />
        </View>
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 8,
  },
  bodySlot: {
    marginBottom: 16,
  },
  inputSection: {
    gap: 8,
  },
  confirmPrompt: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
